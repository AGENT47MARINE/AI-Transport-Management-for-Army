from pydantic import BaseModel
from typing import Optional

class CheckpointBase(BaseModel):
    name: str
    location_name: Optional[str] = None
    lat: float
    long: float
    checkpoint_type: str = "TCP"

class CheckpointCreate(CheckpointBase):
    pass

class Checkpoint(CheckpointBase):
    id: int

    class Config:
        from_attributes = True
