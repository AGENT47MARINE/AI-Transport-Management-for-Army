from sqlalchemy import String, Integer, Float, Boolean, Column
from app.core.database import Base

class TransportAsset(Base):
    """
    Database Model for a Transport Asset (Vehicle).
    Represents a row in the 'transport_assets' table.
    """
    __tablename__ = "transport_assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, doc="Vehicle identifier or name")
    asset_type = Column(String, doc="Type: Truck, Jeep, ALS, etc.")
    capacity_tons = Column(Float, doc="Load carrying capacity in tons")
    is_available = Column(Boolean, default=True, doc="Operational status")
    
    # Location (simplified as lat/long for now, can be PostGIS Point later)
    current_lat = Column(Float, nullable=True)
    current_long = Column(Float, nullable=True)
    bearing = Column(Float, default=0.0, doc="Heading in degrees (0=North, 90=East)")
    
    fuel_status = Column(Float, default=100.0, doc="Fuel percentage")
