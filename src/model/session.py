from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass
class Session:
    username: str
    created_at: datetime
    frame_buffer: List[bytes] = field(default_factory=list)
    current_prompt: Optional[str] = None
    language: str = "en"