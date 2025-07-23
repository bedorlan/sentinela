from pydantic import BaseModel
from typing import Optional

class EmailRequest(BaseModel):
    subject: str
    html_body: Optional[str] = None
    to_email: str
