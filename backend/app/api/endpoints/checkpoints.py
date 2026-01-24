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
    checkpoints = result.scalars().all()
    
    # Mock logic for upcoming convoys (Future: Calculate from live routes)
    # We convert SQLAlchemy objects to Pydantic-compatible dicts to add the computed field
    response_data = []
    for cp in checkpoints:
        # Standardize empty lists string to list
        
        # Mock randomized upcoming convoys for demo
        upcoming = []
        if cp.checkpoint_type == "Toll Gate":
             upcoming.append({"id": 101, "name": "CVY-Alpha", "eta": "14:30"})
        
        # Construct response object explicitly to include computed fields
        cp_dict = {
            "id": cp.id,
            "name": cp.name,
            "location_name": cp.location_name,
            "lat": cp.lat,
            "long": cp.long,
            "checkpoint_type": cp.checkpoint_type,
            "capacity": cp.capacity,
            "tcp_incharge": cp.tcp_incharge,
            "scheduled_departures": cp.scheduled_departures,
            "upcoming_convoys": upcoming
        }
        response_data.append(cp_dict)

    return response_data
