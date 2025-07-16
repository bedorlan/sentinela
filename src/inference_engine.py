from typing import Protocol, Tuple, Optional, List


class InferenceEngine(Protocol):
    """Protocol for inference engines that process frames."""
    
    async def process_frames(self, frames_data: List[bytes], prompt: str) -> Tuple[bool, Optional[str]]:
        """
        Process multiple frames for inference.
        
        Args:
            frames_data: List of frame data as bytes
            prompt: The prompt/query for analysis
            
        Returns:
            Tuple[bool, Optional[str]]: (should_process, result)
            - If should_process is False, the frames were dropped
            - If should_process is True, result contains (score, reason, start_time)
        """
        ...