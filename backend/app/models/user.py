
from sqlalchemy import String, Integer, Column, Boolean
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="COMMANDER", doc="COMMANDER, TCP_INCHARGE")
    is_active = Column(Boolean, default=True)
