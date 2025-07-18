from dataclasses import dataclass
from typing import Optional


@dataclass
class InferenceResponse:
    should_process: bool
    score: Optional[float] = None
    reason: Optional[str] = None
    start_time: Optional[float] = None