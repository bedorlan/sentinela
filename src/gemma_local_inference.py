from . import util
from .inference_engine import InferenceEngine
from .model.inference_response import InferenceResponse
from datetime import datetime
from huggingface_hub import login
from PIL import Image
from transformers import pipeline
from typing import List
import asyncio
import io
import logging
import os
import torch

MAX_CONCURRENT_INFERENCES = 1

logger = logging.getLogger(__name__)


class GemmaLocalInference(InferenceEngine):
    def __init__(self):
        self.active_inferences = 0
        self.pipe = None
        self.model_name = "google/gemma-3n-e4b-it"
        self._initialize_model()
    
    def _initialize_model(self):
        hf_token = os.getenv('HF_TOKEN')
        offline_mode = os.getenv('HF_HUB_OFFLINE') == '1'
        
        if hf_token and not offline_mode:
            login(hf_token)
            logger.info("Logged in to Hugging Face")
        else:
            logger.info("using Hugging Face offline mode")
        
        logger.info(f"Loading {self.model_name} model...")
        self.pipe = self._load_model(local_files_only=offline_mode)

        if not self.pipe:
            logger.error("Application cannot function without model. Exiting.")
            exit(1)

        if hasattr(torch, 'compile'):
            logger.info("Compiling model...")
            self.pipe.model = torch.compile(self.pipe.model, mode="max-autotune")
    
    def _load_model(self, local_files_only=False):
        source = "local cache" if local_files_only else "online source"
        try:
            logger.info(f"Attempting to load model from {source}...")
            pipe = pipeline(
                "image-text-to-text",
                model=self.model_name,
                device_map="auto",
                torch_dtype="auto",
                trust_remote_code=True,
                local_files_only=local_files_only,
            )
            logger.info(f"Successfully loaded model from {source}")
            return pipe
        except Exception as e:
            log_level = logger.error if local_files_only else logger.warning
            log_level(f"Failed to load model from {source}: {str(e)}")
            return None
    
    async def process_frames(self, frames_data: List[bytes], prompt: str, language: str = "en") -> InferenceResponse:
        if self.active_inferences >= MAX_CONCURRENT_INFERENCES:
            return InferenceResponse(should_process=False)
        
        self.active_inferences += 1
        
        try:
            start_time = datetime.now().timestamp()
            ai_response = await self._analyze_frames_with_model(frames_data, prompt, language)
            if not ai_response:
                return InferenceResponse(should_process=False)
                
            score, reason = util.extract_score_and_reason(ai_response)
            return InferenceResponse(
                should_process=True,
                score=score,
                reason=reason,
                start_time=start_time
            )
        finally:
            self.active_inferences -= 1
    
    async def _analyze_frames_with_model(self, frames_data: List[bytes], prompt: str, language: str = "en") -> str:
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._run_inference, frames_data, prompt, language)
            return result

        except Exception as e:
            logger.error(f"Model analysis error: {str(e)}")
            return ""
    
    def _run_inference(self, frames_data: list[bytes], prompt: str, language: str = "en") -> str:
        try:
            content = []
            for frame_data in frames_data:
                resized_frame_data = util.resize_frame(frame_data)
                image = Image.open(io.BytesIO(resized_frame_data))
                content.append({"type": "image", "image": image})
            
            analysis_prompt = util.create_analysis_prompt(prompt, language)
            content.append({"type": "text", "text": analysis_prompt})
            messages = [
                {
                    "role": "user",
                    "content": content,
                },
            ]
            
            output = self.pipe(text=messages, max_new_tokens=100)
            answer = output[0]["generated_text"][-1]["content"]
            return answer
            
        except Exception as e:
            logger.error(f"Inference error: {str(e)}")
            return ""
    
    async def summarize_watch_logs(self, events: list) -> str:
        """
        Summarize watching log events into a single detailed sentence.
        """
        if not events:
            return "No events to summarize"
        
        try:
            prompt = util.create_summarization_prompt(events)
            
            messages = [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}],
                },
            ]
            
            output = self.pipe(text=messages, max_new_tokens=100)
            answer = output[0]["generated_text"][-1]["content"]
            return answer.strip()
            
        except Exception as e:
            logger.error(f"Summarization error: {str(e)}")
            raise Exception(f"Summarization failed: {str(e)}")
    
    def yourName(self) -> str:
        return f"{self.__class__.__name__} - {self.model_name}"
    
