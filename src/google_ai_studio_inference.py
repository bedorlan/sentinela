from PIL import Image
from typing import Tuple, Optional
import google.generativeai as genai
import io
import os
import re

from .inference_engine import InferenceEngine


class GoogleAIStudioInference(InferenceEngine):
    def __init__(self):
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.analysis_in_progress = False
        self.model = None
        # self.model_name = 'models/gemma-3n-e4b-it'
        self.model_name = 'models/gemma-3-27b-it' # available parameters: 1,4,12,27
        self._initialize_model()
    
    def _initialize_model(self):
        if self.google_api_key:
            genai.configure(api_key=self.google_api_key)
            self.model = genai.GenerativeModel(self.model_name)
            print("Google AI configured successfully")
        else:
            print("ERROR: GOOGLE_API_KEY not found in environment variables")
            print("Application cannot function without Google AI API key. Exiting.")
            exit(1)

    async def process_frame(self, frame_data: bytes, prompt: str) -> Tuple[bool, Optional[str]]:
        """
        Process a frame for AI analysis.
        
        Returns:
            Tuple[bool, Optional[str]]: (should_process, ai_response)
            - If should_process is False, the frame was dropped (analysis in progress)
            - If should_process is True, ai_response contains the analysis result
        """
        # Check if we should drop this frame
        if self.analysis_in_progress:
            return False, None  # Frame dropped
        self.analysis_in_progress = True
        
        try:
            ai_response = await self._analyze_frame_with_ai([frame_data], prompt)
            print(f"\nAI Response: {ai_response}")

            score = self._extract_score(ai_response)            
            return True, str(score)
        finally:
            self.analysis_in_progress = False

    async def _analyze_frame_with_ai(self, frames: list, prompt: str) -> str:
        """Internal function to analyze frames using Google AI Studio"""
        try:
            # Prepare image data for each frame
            content = []
            for frame_data in frames:
                # Resize frame before processing
                resized_frame_data = self._resize_frame(frame_data)
                image_data = {
                    'mime_type': 'image/jpeg',
                    'data': resized_frame_data
                }
                content.append(image_data)
            
            # Create analysis prompt
            analysis_prompt = f"""
                Analyze the frames for: {prompt}
                Response format: |score|reason|
                score: 0-100 confidence
                reason: one sentence explanation
            """
            analysis_prompt = re.sub(r'\n\s+', '\n', analysis_prompt)
            
            content.append(analysis_prompt)
            
            # Generate response using async API
            response_text = await self._run_ai_inference(content)
            
            return response_text
            
        except Exception as e:
            return f"AI analysis error: {str(e)}"
    
    async def _run_ai_inference(self, content):
        """Async worker function for AI inference"""
        try:
            response = await self.model.generate_content_async(content)
            return response.text
        except Exception as e:
            return f"AI analysis error: {str(e)}"
        
    def _extract_score(self, response: str) -> int:
        """Extract score from AI response"""
        try:
            match = re.search(r'\|(\d+)\|([^|]+)\|', response)
            if match:
                score = int(match.group(1))
                reason = match.group(2)
                print(f"score={score}")
                return score
            
            digits = re.findall(r'\d+', response)
            if digits:
                print(f"digits={digits}")
                return int(digits[0])
            
            return 0
            
        except Exception as e:
            print(f"Error extracting score: {e}")
            return 0
    
    def _resize_frame(self, frame_data: bytes, target_width: int = 768) -> bytes:
        """Resize frame to target width while maintaining aspect ratio"""
        try:
            # Open image from bytes
            image = Image.open(io.BytesIO(frame_data))
            
            # Calculate new dimensions
            original_width, original_height = image.size
            aspect_ratio = original_height / original_width
            new_height = int(target_width * aspect_ratio)
            
            # Resize image
            resized_image = image.resize((target_width, new_height), Image.Resampling.LANCZOS)
            
            # Convert back to bytes
            output_buffer = io.BytesIO()
            resized_image.save(output_buffer, format='JPEG', quality=90)
            return output_buffer.getvalue()
            
        except Exception as e:
            print(f"Error resizing frame: {e}")
            return frame_data  # Return original if resize fails
