from sqlalchemy import String, Integer, Float, Boolean, Column, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Convoy(Base):
    """
    Database Model for a Convoy.
    A convoy is a group of vehicles moving from a Start Point to an End Point.
    """
    __tablename__ = "convoys"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, doc="Convoy Code name, e.g., 'Alpha-Move-01'")
    
    start_location = Column(String, doc="Name of start point")
    end_location = Column(String, doc="Name of destination")
    
    start_time = Column(DateTime, default=datetime.utcnow)
    estimated_arrival_time = Column(DateTime, nullable=True)
    status = Column(String, default="PLANNED", doc="PLANNED, IN_TRANSIT, COMPLETED, HALTED")
    
    # Link to a specific route plan
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True)
    route = relationship("app.models.route.Route") # Deferred import string to avoid circulars if possible

    assets = relationship("app.models.asset.TransportAsset", back_populates="convoy")
