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


def extract_score(response: str) -> int:
    """
    Extract confidence score from AI model response.
    Kept for backward compatibility.
    """
    score, _ = extract_score_and_reason(response)
    return score
