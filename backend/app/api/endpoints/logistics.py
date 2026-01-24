
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
    
    class Config:
        from_attributes = True

@router.post("/generate/{convoy_id}")
async def generate_indent(convoy_id: int, db: AsyncSession = Depends(get_db)):
    """
    Manually Trigger FOL Calculation for a Convoy
    """
    await calculate_and_indent_fol(convoy_id, db)
    return {"message": "Indent Generated"}

@router.get("/pending", response_model=List[LogisticsIndentSchema])
async def get_pending_indents(db: AsyncSession = Depends(get_db)):
    """
    Get all pending requests for the TCP Dashboard
    """
    stmt = select(LogisticsIndent).where(LogisticsIndent.status == "PENDING")
    result = await db.execute(stmt)
    return result.scalars().all()
