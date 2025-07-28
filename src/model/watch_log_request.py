from pydantic import BaseModel
from typing import List

class WatchLogSummaryRequest(BaseModel):
    events: List[str]

class WatchLogSummaryResponse(BaseModel):
    summary: str