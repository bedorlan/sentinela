from . import util
from .inference_engine import InferenceEngine
from datetime import datetime
from huggingface_hub import login
from PIL import Image
from transformers import pipeline
from typing import Tuple, Optional, List
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
        if hf_token:
            login(hf_token)
            logger.info("Logged in to Hugging Face")
        else:
            logger.error("HF_TOKEN environment variable not found")
            logger.error("Application cannot function without Hugging Face token. Exiting.")
            exit(1)
        
        logger.info(f"Loading {self.model_name} model...")
        
        try:
            self.pipe = pipeline(
                "image-text-to-text",
                model=self.model_name,
                device_map="auto",
                torch_dtype="auto",
                trust_remote_code=True,
            )

            if hasattr(torch, 'compile'):
                logger.info("Compiling model...")
                self.pipe.model = torch.compile(self.pipe.model, mode="max-autotune")

        except Exception as e:
            logger.error(f"Failed to load Gemma model: {str(e)}")
            logger.error("Application cannot function without local model. Exiting.")
            exit(1)
    
    async def process_frames(self, frames_data: List[bytes], prompt: str) -> Tuple[bool, Optional[str]]:
        if self.active_inferences >= MAX_CONCURRENT_INFERENCES:
            return False, None
        
        self.active_inferences += 1
        
        try:
            start_time = datetime.now()
            ai_response = await self._analyze_frames_with_model(frames_data, prompt)
            if not ai_response:
                return False, None
                
            score, reason = util.extract_score_and_reason(ai_response)
            return True, (score, reason, start_time)
        finally:
            self.active_inferences -= 1
    
    async def _analyze_frames_with_model(self, frames_data: List[bytes], prompt: str) -> str:
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._run_inference, frames_data, prompt)
            return result

        except Exception as e:
            logger.error(f"Model analysis error: {str(e)}")
            return ""
    
    def _run_inference(self, frames_data: list[bytes], prompt: str) -> str:
        try:
            content = []
            for frame_data in frames_data:
                resized_frame_data = util.resize_frame(frame_data)
                image = Image.open(io.BytesIO(resized_frame_data))
                content.append({"type": "image", "image": image})
            
            analysis_prompt = util.create_analysis_prompt(prompt)
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
    
