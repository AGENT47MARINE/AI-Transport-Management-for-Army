from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.checkpoint import Checkpoint
from app.schemas.checkpoint import Checkpoint as CheckpointSchema

router = APIRouter()

@router.get("/", response_model=List[CheckpointSchema])
async def read_checkpoints(db: Session = Depends(get_db)):
    """
    Get all checkpoints.
    """
    result = await db.execute(select(Checkpoint))
    return result.scalars().all()
