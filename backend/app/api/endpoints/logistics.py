
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.models.logistics import LogisticsIndent
from app.services.logistics import calculate_and_indent_fol
from pydantic import BaseModel

router = APIRouter()

# Simple Schema for Response
class LogisticsIndentSchema(BaseModel):
    id: int
    convoy_id: int
    location_id: int
    fuel_diesel_liters: float
    fuel_petrol_liters: float
    accommodation_personnel: int
    status: str
    request_type: str
    remarks: str | None = None
    
    class Config:
        from_attributes = True

class OverstayRequest(BaseModel):
    convoy_id: int
    location_id: int
    remarks: str
    duration_hours: int

@router.post("/generate/{convoy_id}")
async def generate_indent(convoy_id: int, db: AsyncSession = Depends(get_db)):
    """
    Manually Trigger FOL Calculation for a Convoy
    """
    await calculate_and_indent_fol(convoy_id, db)
    return {"message": "Indent Generated"}

@router.post("/overstay")
async def request_overstay(req: OverstayRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a request for overstay (halt) at a TCP.
    """
    # Create an indent specifically for Overstay (Accommodation focus)
    indent = LogisticsIndent(
        convoy_id=req.convoy_id,
        location_id=req.location_id,
        request_type="OVERSTAY",
        status="PENDING",
        remarks=req.remarks,
        accommodation_personnel=0, # Placeholder, logic could fetch from convoy
        arrival_time_est=datetime.utcnow() # Simplify for now
    )
    db.add(indent)
    await db.commit()
    return {"message": "Overstay Request Logged"}

@router.get("/pending", response_model=List[LogisticsIndentSchema])
async def get_pending_indents(db: AsyncSession = Depends(get_db)):
    """
    Get all pending requests for the TCP Dashboard
    """
    # Fetch Standard and Overstay requests pending
    stmt = select(LogisticsIndent).where(LogisticsIndent.status == "PENDING")
    result = await db.execute(stmt)
    return result.scalars().all()
