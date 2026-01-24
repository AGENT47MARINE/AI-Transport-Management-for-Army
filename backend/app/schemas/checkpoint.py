from pydantic import BaseModel
from typing import Optional, List

class CheckpointBase(BaseModel):
    name: str
    location_name: Optional[str] = None
    lat: float
    long: float
    checkpoint_type: str = "TCP"
    capacity: Optional[int] = 50
    tcp_incharge: Optional[str] = None
    scheduled_departures: Optional[str] = "[]"

class CheckpointCreate(CheckpointBase):
    pass

class ConvoySummary(BaseModel):
    id: int
    name: str
    eta: str  # e.g., "14:30"

class Checkpoint(CheckpointBase):
    id: int
    upcoming_convoys: List[ConvoySummary] = []

    class Config:
        from_attributes = True
