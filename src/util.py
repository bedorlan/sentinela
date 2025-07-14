from PIL import Image
import io
import logging
import re

logger = logging.getLogger(__name__)


def create_analysis_prompt(prompt: str) -> str:
    """
    Create a standardized analysis prompt for AI models.
    """
    analysis_prompt = f"""
    You are a sentinel watching for: {prompt}.
    Rate how well the video match what you are watching.

    Respond ONLY in this format: |rate|reason|
    - rate: 0-100 (0=no match, 100=perfect match)
    - reason: one concise sentence explaining the rate

    Example: |50|Not sure if there is a cat|
    """
    return re.sub(r'\n\s+', '\n', analysis_prompt)


def extract_score_and_reason(response: str) -> tuple[int, str]:
    """
    Extract confidence score and reason from AI model response.
    """
    try:
        match = re.search(r'\|(\d+)\|([^|]+)\|', response)
        if match:
            score = int(match.group(1))
            reason = match.group(2).strip()
            return score, reason
        
        logger.warning(f"weird ai response={response}")
        return 0, ""
        
    except Exception as e:
        logger.error(f"Error extracting score: {e}")
        return 0, ""

def create_translation_prompt(texts: str, locale: str) -> str:
    """
    Create a standardized translation prompt for AI models.
    """
    translation_prompt = f"""
    You are a professional translator. Translate the following texts to {locale} language.
            
    IMPORTANT RULES:
    1. Preserve all emojis exactly as they are
    2. Maintain the same tone and style as the original
    3. Return ONLY the translated texts separated by |
    4. Keep the same order as the input
    5. Do not add any explanations or additional text

    Input texts:
    {texts}

    Return the translated texts separated by |:
    """
    return re.sub(r'\n\s+', '\n', translation_prompt)

def resize_frame(frame_data: bytes, max_size: int = 768) -> bytes:
    """Resize frame so max width or height is max_size while maintaining aspect ratio"""
    try:
        image = Image.open(io.BytesIO(frame_data))
        original_width, original_height = image.size
        if original_width <= max_size and original_height <= max_size:
            return frame_data
        
        if original_width > original_height:
            new_width = max_size
            new_height = int(original_height * (max_size / original_width))
        else:
            new_height = max_size
            new_width = int(original_width * (max_size / original_height))
        
        resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        output_buffer = io.BytesIO()
        resized_image.save(output_buffer, format='JPEG', quality=90)
        return output_buffer.getvalue()
        
    except Exception as e:
        logger.error(f"Error resizing frame: {e}")
        return frame_data
