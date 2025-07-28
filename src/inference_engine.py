from .model.inference_response import InferenceResponse
from typing import Protocol, List


class InferenceEngine(Protocol):
    """Protocol for inference engines that process frames."""
    
    async def process_frames(self, frames_data: List[bytes], prompt: str, language: str = "en") -> InferenceResponse:
        """
        Process multiple frames for inference.
        
        Args:
            frames_data: List of frame data as bytes
            prompt: The prompt/query for analysis
            language: Language for the response (default: "en")
            
        Returns:
            InferenceResponse: Response containing processing decision and metadata
        """
        ...
    
    async def summarize_watch_logs(self, events: List[str]) -> str:
        """
        Summarize watching log events into a single detailed sentence.
        
        Args:
            events: List of event descriptions
            
        Returns:
            str: Single sentence summarizing the events
        """
        ...