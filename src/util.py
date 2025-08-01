from PIL import Image
import io
import logging
import re

logger = logging.getLogger(__name__)


def create_analysis_prompt(prompt: str, language: str = "en") -> str:
    """
    Create a standardized analysis prompt for AI models.
    """
    analysis_prompt = f"""
        Analyze the video frames against the user's description.

        Respond ONLY in this format: |rate|reason|
        - rate: 0-100 confidence score (0=no match, 100=perfect match)
        - reason: one concise sentence explaining the match

        Examples:
        |100|Clear orange cat sitting on the couch|
        |0|No people visible in the frame|
        |75|Person appears to be smiling but partially obscured|

        Always reply in the language indicated by the two-letter ISO 639-1 code `{language}`

        User Prompt: {prompt}
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
    num_texts = len(texts.split("|"))
    translation_prompt = f"""
    Translate these {num_texts} texts to {locale}. 
    Return exactly {num_texts} translations separated by | character.

    Input ({num_texts} texts):
    {texts}

    Output format: translation1|translation2|translation3|...

    Rules:
    - Keep all emojis unchanged
    - Return ONLY the translations, no explanations
    - Use exactly {num_texts} sections separated by |
    - Do not add extra text before or after
    """
    return re.sub(r'\n\s+', '\n', translation_prompt)


def create_summarization_prompt(events: list) -> str:
    delim = "\n- "
    events_text = delim.join(events)
    summarization_prompt = f"""
    Create a one-sentence summary of what was observed during this monitoring period:
    {delim}{events_text}
    """
    return re.sub(r'\n\s+', '\n', summarization_prompt)

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
