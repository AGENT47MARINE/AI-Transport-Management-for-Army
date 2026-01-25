from sqlalchemy import String, Integer, Float, Boolean, Column, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class TransportAsset(Base):
    """
    Database Model for a Transport Asset (Vehicle).
    Represents a row in the 'transport_assets' table.
    """
    __tablename__ = "transport_assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, doc="Vehicle identifier or name")
    role = Column(String, default="CARGO", doc="Formation Role: ROP, QRT, COMMANDER, etc.")
    asset_type = Column(String, doc="Type: Truck, Jeep, ALS, etc.")
    asset_source = Column(String, default="MILITARY", doc="MILITARY, CIVIL_REQ, CIVIL_OBSERVED")
    capacity_tons = Column(Float, doc="Load carrying capacity in tons")
    is_available = Column(Boolean, default=True, doc="Operational status")
    
    # Location (simplified as lat/long for now, can be PostGIS Point later)
    current_lat = Column(Float, nullable=True)
    current_long = Column(Float, nullable=True)
    bearing = Column(Float, default=0.0, doc="Heading in degrees (0=North, 90=East)")
    
    fuel_status = Column(Float, default=100.0, doc="Fuel percentage")
    
    driver_name = Column(String, nullable=True, doc="Name of the driver")
    personnel_count = Column(Integer, default=0, doc="Number of personnel on board")
    
    number_plate = Column(String, unique=True, nullable=True, doc="Vehicle Registration Number")
    past_movements = Column(String, default="[]", doc="JSON list of past locations")

    convoy_id = Column(Integer, ForeignKey("convoys.id"), nullable=True)
    convoy = relationship("Convoy", back_populates="assets")

    current_checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"), nullable=True)
    current_checkpoint = relationship("app.models.checkpoint.Checkpoint")
