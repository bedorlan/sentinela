from PIL import Image
import io
import re


def create_analysis_prompt(prompt: str) -> str:
    """
    Create a standardized analysis prompt for AI models.
    """
    analysis_prompt = f"""
        Analyze the frames for: {prompt}
        Response format: |score|reason|
        score: 0-100 confidence
        reason: one sentence explanation
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
            print(f"digits={digits}")
            return int(digits[0]), ""
        
        return 0, ""
        
    except Exception as e:
        print(f"Error extracting score: {e}")
        return 0, ""

def resize_frame(frame_data: bytes, target_width: int = 768) -> bytes:
    """Resize frame to target width while maintaining aspect ratio"""
    try:
        image = Image.open(io.BytesIO(frame_data))
        
        original_width, original_height = image.size
        
        if original_width <= target_width:
            return frame_data
        
        aspect_ratio = original_height / original_width
        new_height = int(target_width * aspect_ratio)
        
        resized_image = image.resize((target_width, new_height), Image.Resampling.LANCZOS)
        
        output_buffer = io.BytesIO()
        resized_image.save(output_buffer, format='JPEG', quality=90)
        return output_buffer.getvalue()
        
    except Exception as e:
        print(f"Error resizing frame: {e}")
        return frame_data
