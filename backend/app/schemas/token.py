
from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str # Send role back so frontend knows where to redirect
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
