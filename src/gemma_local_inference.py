from huggingface_hub import login
from PIL import Image
from transformers import pipeline
from typing import Tuple, Optional
import asyncio
import io
import os

from . import util
from .inference_engine import InferenceEngine


class GemmaLocalInference(InferenceEngine):
    def __init__(self):
        self.analysis_in_progress = False
        self.pipe = None
        self.model_name = "google/gemma-3n-e2b-it"
        self._initialize_model()
    
    def _initialize_model(self):
        hf_token = os.getenv('HF_TOKEN')
        if hf_token:
            login(hf_token)
            print("Logged in to Hugging Face")
        else:
            print("ERROR: HF_TOKEN environment variable not found")
            print("Application cannot function without Hugging Face token. Exiting.")
            exit(1)
        
        print(f"Loading {self.model_name} model...")
        
        try:
            self.pipe = pipeline(
                "image-text-to-text",
                model=self.model_name,
                device_map="auto",
                torch_dtype="auto",
                trust_remote_code=True,
            )

        except Exception as e:
            print(f"ERROR: Failed to load Gemma model: {str(e)}")
            print("Application cannot function without local model. Exiting.")
            exit(1)
    
    async def process_frame(self, frame_data: bytes, prompt: str) -> Tuple[bool, Optional[str]]:
        if self.analysis_in_progress:
            return False, None
        
        self.analysis_in_progress = True
        
        try:
            ai_response = await self._analyze_frame_with_model(frame_data, prompt)
            print(f"\nModel Response: {ai_response}")
            
            score, reason = util.extract_score_and_reason(ai_response)
            return True, (score, reason)
        finally:
            self.analysis_in_progress = False
    
    async def _analyze_frame_with_model(self, frame_data: bytes, prompt: str) -> str:
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._run_inference, frame_data, prompt)
            return result

        except Exception as e:
            return f"Model analysis error: {str(e)}"
    
    def _run_inference(self, frame_data: bytes, prompt: str) -> str:
        try:
            image = Image.open(io.BytesIO(frame_data))
            
            analysis_prompt = util.create_analysis_prompt(prompt)
            
            content = [
                {"type": "image", "url": image},
                {"type": "text", "text": analysis_prompt}
            ]
            
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
            return f"Inference error: {str(e)}"
    
