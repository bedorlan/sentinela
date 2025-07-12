from openai import AsyncOpenAI
from typing import Tuple, Optional, Dict
import base64
import os
import json

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
            if not ai_response:
                return False, None

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
            print(f"AI analysis error: {str(e)}")
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
            print(f"AI inference error: {str(e)}")
            return ""
    
    async def translate(self, texts: Dict[str, str], locale: str) -> Dict[str, str]:
        """
        Translate a dictionary of texts to the specified locale.
        
        Args:
            texts: Dictionary with keys and text values to translate
            locale: Target language locale (e.g., 'es', 'fr', 'pt', 'de')
            
        Returns:
            Dictionary with same keys but translated values
        """
        try:
            # Create the translation prompt
            prompt = f"""You are a professional translator. Translate the following texts to {locale} language.
            
            IMPORTANT RULES:
            1. Only translate the values, not the keys
            2. Preserve all emojis exactly as they are
            3. Maintain the same tone and style as the original
            4. Return ONLY a valid JSON object with the same structure
            5. Do not add any explanations or additional text
            
            Input JSON:
            {json.dumps(texts, ensure_ascii=False, indent=2)}
            
            Return the translated JSON:"""

            messages = [{
                "role": "user",
                "content": prompt
            }]
            print(prompt)
            
            response_text = await self._run_ai_inference(messages)
            
            try:
                cleaned_response = response_text.strip()
                if cleaned_response.startswith("```json"):
                    cleaned_response = cleaned_response[7:]
                if cleaned_response.startswith("```"):
                    cleaned_response = cleaned_response[3:]
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response[:-3]
                
                translated_texts = json.loads(cleaned_response.strip())
                
                for key in texts.keys():
                    if key not in translated_texts:
                        translated_texts[key] = texts[key]
                        
                return translated_texts
                
            except json.JSONDecodeError as e:
                print(f"Error parsing translation response: {e}")
                print(f"Response was: {response_text}")
                return texts
                
        except Exception as e:
            print(f"Translation error: {str(e)}")
            return texts
