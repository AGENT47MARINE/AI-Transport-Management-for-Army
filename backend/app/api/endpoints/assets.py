from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.asset import TransportAsset
from app.schemas.asset import TransportAssetCreate, TransportAsset as AssetSchema

router = APIRouter()

@router.post("/", response_model=AssetSchema)
async def create_asset(asset: TransportAssetCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new Transport Asset.
    """
    new_asset = TransportAsset(**asset.model_dump())
    db.add(new_asset)
    await db.commit()
    await db.refresh(new_asset)
    return new_asset

@router.get("/", response_model=List[AssetSchema])
async def read_assets(skip: int = 0, limit: int = 100, checkpoint_id: int = None, db: AsyncSession = Depends(get_db)):
    """
    Retrieve a list of Transport Assets. Optional filter by Checkpoint ID for idle assets.
    """
    query = select(TransportAsset).offset(skip).limit(limit)
    
    if checkpoint_id:
        query = query.where(TransportAsset.current_checkpoint_id == checkpoint_id)
        
    result = await db.execute(query)
    assets = result.scalars().all()
    return assets
