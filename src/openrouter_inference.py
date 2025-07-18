from openai import AsyncOpenAI
from typing import Tuple, Optional, List
import base64
import logging
import os

from . import util
from .inference_engine import InferenceEngine

logger = logging.getLogger(__name__)


class OpenRouterInference(InferenceEngine):
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.client = None
        self.model_name = 'google/gemma-3n-e4b-it' # this one supports images
        # self.model_name = 'google/gemma-3n-e4b-it:free'
        # self.model_name = 'google/gemma-3-27b-it:free'
        self._translation_cache = {}
        self._initialize_client()
        
    
    def _initialize_client(self):
        if self.api_key:
            self.client = AsyncOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.api_key,
                timeout=10.0,
            )
            logger.info("OpenRouter configured successfully")
        else:
            logger.error("OPENROUTER_API_KEY not found in environment variables")
            logger.error("Application cannot function without OpenRouter API key. Exiting.")
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
            logger.error(f"AI analysis error: {str(e)}")
            return ""
    
    async def _run_ai_inference(self, messages):
        """Async worker function for AI inference"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"AI inference error: {str(e)}")
            return ""
    
    async def translate(self, texts: list, locale: str) -> list:
        """
        Translate a list of texts to the specified locale.
        
        Args:
            texts: List of text strings to translate
            locale: Target language locale (e.g., 'es', 'fr', 'pt', 'de')
            
        Returns:
            List of translated texts in the same order
        """
        cache_key = locale
        
        if cache_key in self._translation_cache:
            return self._translation_cache[cache_key]
        
        try:
            texts_str = "|".join(texts)
            prompt = util.create_translation_prompt(texts_str, locale)
            messages = [{
                "role": "user",
                "content": prompt
            }]
            
            response_text = await self._run_ai_inference(messages)
            
            cleaned_response = response_text.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            
            translated_texts = [text.strip() for text in cleaned_response.split("|")]
            
            if len(translated_texts) != len(texts):
                error_msg = f"Translation count mismatch: expected {len(texts)}, got {len(translated_texts)}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            self._translation_cache[cache_key] = translated_texts
            return translated_texts
            
        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            raise Exception(f"Translation failed: {str(e)}")
