from PIL import Image
import io
import re


def create_analysis_prompt(prompt: str) -> str:
    """
    Create a standardized analysis prompt for AI models.
    """
    analysis_prompt = f"""
    You are a sentinel watching for: {prompt}.
    Rate how well the frames match what you are watching.

    Respond ONLY in this format: |rate|reason|
    - rate: 0-100 (0=no match, 100=perfect match)
    - reason: one concise sentence explaining the rate

    Example: |0|There is no cat visible|
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
            print(f"score={score}, reason={reason}")
            return score, reason
        
        digits = re.findall(r'\d+', response)
        if digits:
            score = int(digits[0])
            if score >= 0 and score <= 100:
                print(f"digits={digits}")
                return score, ""
        
        print(f"weird ai response={response}")
        return 0, ""
        
    except Exception as e:
        print(f"Error extracting score: {e}")
        return 0, ""

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
        print(f"Error resizing frame: {e}")
        return frame_data
