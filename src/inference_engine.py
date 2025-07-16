from .model.inference_response import InferenceResponse
from typing import Protocol, List


class InferenceEngine(Protocol):
    """Protocol for inference engines that process frames."""
    
    async def process_frames(self, frames_data: List[bytes], prompt: str) -> InferenceResponse:
        """
        Process multiple frames for inference.
        
        Args:
            frames_data: List of frame data as bytes
            prompt: The prompt/query for analysis
            
        Returns:
            InferenceResponse: Response containing processing decision and metadata
        """
        ...