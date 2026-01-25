from pydantic import BaseModel
from typing import Optional

class TransportAssetBase(BaseModel):
    name: str
    asset_type: str
    asset_source: str = "MILITARY"
    role: str = "CARGO"
    capacity_tons: float = 0.0
    is_available: bool = True
    current_lat: Optional[float] = None
    current_long: Optional[float] = None
    fuel_status: float = 100.0
    driver_name: Optional[str] = None
    personnel_count: Optional[int] = 0
    number_plate: Optional[str] = None
    past_movements: Optional[str] = "[]"
    convoy_id: Optional[int] = None

class TransportAssetCreate(TransportAssetBase):
    """Schema for creating a new asset (client input)"""
    pass

class TransportAsset(TransportAssetBase):
    """Schema for reading an asset (API output)"""
    id: int

    class Config:
        from_attributes = True # Allows Pydantic to read from SQLAlchemy models
