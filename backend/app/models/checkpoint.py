from sqlalchemy import String, Integer, Float, Column
from app.core.database import Base

class Checkpoint(Base):
    """
    Traffic Control Checkpoint (TCP) Model.
    Represents stationary security/control posts.
    """
    __tablename__ = "checkpoints"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, doc="Checkpoint Name, e.g., 'TCP-1 Banihal'")
    location_name = Column(String, doc="Common name of location")
    lat = Column(Float, nullable=False)
    long = Column(Float, nullable=False)
    checkpoint_type = Column(String, default="TCP", doc="TCP, Toll, Police Post, Rest Stop")
