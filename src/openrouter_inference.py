from openai import AsyncOpenAI
from typing import Tuple, Optional
import base64
import os

from . import util
from .inference_engine import InferenceEngine


class OpenRouterInference(InferenceEngine):
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.analysis_in_progress = False
        self.client = None
        self.model_name = 'google/gemma-3n-e4b-it' # this one supports images
        # self.model_name = 'google/gemma-3n-e4b-it:free'
        # self.model_name = 'google/gemma-3-27b-it:free'
        self._initialize_client()
    
    def _initialize_client(self):
        if self.api_key:
            self.client = AsyncOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.api_key,
            )
            print("OpenRouter configured successfully")
        else:
            print("ERROR: OPENROUTER_API_KEY not found in environment variables")
            print("Application cannot function without OpenRouter API key. Exiting.")
            exit(1)

    async def process_frame(self, frame_data: bytes, prompt: str) -> Tuple[bool, Optional[str]]:
        """
        Process a frame for AI analysis.
        
        Returns:
            Tuple[bool, Optional[str]]: (should_process, ai_response)
            - If should_process is False, the frame was dropped (analysis in progress)
            - If should_process is True, ai_response contains the analysis result
        """
        if self.analysis_in_progress:
            return False, None
        self.analysis_in_progress = True
        
        try:
            ai_response = await self._analyze_frame_with_ai([frame_data], prompt)
            score, reason = util.extract_score_and_reason(ai_response)            
            return True, (score, reason)
        finally:
            self.analysis_in_progress = False

    async def _analyze_frame_with_ai(self, frames: list, prompt: str) -> str:
        """Internal function to analyze frames using OpenRouter"""
        try:
            content = []
            for frame_data in frames:
                resized_frame_data = util.resize_frame(frame_data)
                base64_image = base64.b64encode(resized_frame_data).decode('utf-8')
                
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}"
                    }
                })

            analysis_prompt = util.create_analysis_prompt(prompt)
            content.append({
                "type": "text",
                "text": analysis_prompt
            })
            messages = [{
                "role": "user",
                "content": content
            }]
            
            response_text = await self._run_ai_inference(messages)
            return response_text
            
        except Exception as e:
            return f"AI analysis error: {str(e)}"
    
    async def _run_ai_inference(self, messages):
        """Async worker function for AI inference"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"AI analysis error: {str(e)}"
