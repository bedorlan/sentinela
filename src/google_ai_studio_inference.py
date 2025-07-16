from . import util
from .inference_engine import InferenceEngine
from typing import Tuple, Optional, List
import google.generativeai as genai
import logging
import os

logger = logging.getLogger(__name__)


class GoogleAIStudioInference(InferenceEngine):
    def __init__(self):
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.model = None
        self.model_name = 'models/gemma-3n-e4b-it'
        self._initialize_model()
    
    def _initialize_model(self):
        if self.google_api_key:
            genai.configure(api_key=self.google_api_key)
            self.model = genai.GenerativeModel(self.model_name)
            logger.info("Google AI configured successfully")
        else:
            logger.error("GOOGLE_API_KEY not found in environment variables")
            logger.error("Application cannot function without Google AI API key. Exiting.")
            exit(1)

    async def process_frames(self, frames_data: List[bytes], prompt: str) -> Tuple[bool, Optional[str]]:
        """
        Process multiple frames for AI analysis.
        
        Returns:
            Tuple[bool, Optional[str]]: (should_process, ai_response)
            - If should_process is False, the frames were dropped
            - If should_process is True, ai_response contains the analysis result
        """
        ai_response = await self._analyze_frame_with_ai(frames_data, prompt)
        if not ai_response:
            return False, None

        score, reason = util.extract_score_and_reason(ai_response)            
        return True, (score, reason)

    async def _analyze_frame_with_ai(self, frames: list, prompt: str) -> str:
        """Internal function to analyze frames using Google AI Studio"""
        try:
            # Prepare image data for each frame
            content = []
            for frame_data in frames:
                # Resize frame before processing
                resized_frame_data = util.resize_frame(frame_data)
                image_data = {
                    'mime_type': 'image/jpeg',
                    'data': resized_frame_data
                }
                content.append(image_data)
            
            # Create analysis prompt
            analysis_prompt = util.create_analysis_prompt(prompt)
            content.append(analysis_prompt)
            
            # Generate response using async API
            response_text = await self._run_ai_inference(content)
            
            return response_text
            
        except Exception as e:
            logger.error(f"AI analysis error: {str(e)}")
            return ""
    
    async def _run_ai_inference(self, content):
        """Async worker function for AI inference"""
        try:
            response = await self.model.generate_content_async(content)
            return response.text
        except Exception as e:
            logger.error(f"AI inference error: {str(e)}")
            return ""
        
    
