from sqlalchemy import String, Integer, Float, Column, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class LogisticsIndent(Base):
    """
    Represents an 'Intimation of Requirement' sent to a Receiving Station (TCP/Camp).
    Stories the tentative FOL (Fuel/Oil/Lubricants) and Accommodation needs.
    """
    __tablename__ = "logistics_indents"

    id = Column(Integer, primary_key=True, index=True)
    
    # Who is sending this?
    convoy_id = Column(Integer, ForeignKey("convoys.id"))
    convoy = relationship("app.models.convoy.Convoy")

    # Who is receiving this?
    # For now, we link to a Checkpoint/Camp ID. 
    location_id = Column(Integer, ForeignKey("checkpoints.id"))
    location = relationship("app.models.checkpoint.Checkpoint")

    # The Requirements
    fuel_diesel_liters = Column(Float, default=0.0)
    fuel_petrol_liters = Column(Float, default=0.0)
    oil_liters = Column(Float, default=0.0)
    
    # Night Stay Requirements
    accommodation_personnel = Column(Integer, default=0)
    
    # Meta
    arrival_time_est = Column(DateTime)
    status = Column(String, default="PENDING", doc="PENDING, APPROVED, FULFILLED")
    
    request_type = Column(String, default="STANDARD", doc="STANDARD, OVERSTAY")
    remarks = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
