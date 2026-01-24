from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.asset import TransportAsset
from app.schemas.route import Route

class ConvoyBase(BaseModel):
    name: str
    start_location: str
    end_location: str
    status: str = "PLANNED"

class ConvoyCreate(ConvoyBase):
    asset_ids: List[int] = []
    # Optional coords for auto-route planning
    start_lat: Optional[float] = None
    start_long: Optional[float] = None
    end_lat: Optional[float] = None
    end_long: Optional[float] = None
    start_time: Optional[datetime] = None
    estimated_arrival_time: Optional[datetime] = None
    route_id: Optional[int] = None

class Convoy(ConvoyBase):
    id: int
    start_time: datetime
    route_id: Optional[int] = None
    assets: List[TransportAsset] = []
    route: Optional[Route] = None

    class Config:
        from_attributes = True
