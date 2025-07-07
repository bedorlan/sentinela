from typing import Protocol, Tuple, Optional


class InferenceEngine(Protocol):
    """Protocol for inference engines that process frames."""
    
    async def process_frame(self, frame_data: bytes, prompt: str) -> Tuple[bool, Optional[str]]:
        """
        Process a frame for inference.
        
        Args:
            frame_data: The frame data as bytes
            prompt: The prompt/query for analysis
            
        Returns:
            Tuple[bool, Optional[str]]: (should_process, result)
            - If should_process is False, the frame was dropped
            - If should_process is True, result contains the inference result
        """
        ...