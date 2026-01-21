from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.optimization import LoadOptimizer

router = APIRouter()
optimizer = LoadOptimizer()

class CargoItem(BaseModel):
    id: str
    weight: float
    volume: float = 0
    name: str = "Unknown Cargo"

class VehicleSpec(BaseModel):
    id: str
    capacity_weight: float
    capacity_volume: float = 0
    name: str = "Generic Truck"

class OptimizationRequest(BaseModel):
    cargo: List[CargoItem]
    fleet: List[VehicleSpec]

@router.post("/optimize")
async def generate_load_plan(request: OptimizationRequest):
    """
    Generate an optimal load plan using Google OR-Tools.
    Minimizes the number of vehicles used.
    """
    # Convert Pydantic models to dicts for the service
    cargo_data = [item.model_dump() for item in request.cargo]
    fleet_data = [v.model_dump() for v in request.fleet]
    
    result = optimizer.optimize_load(cargo_data, fleet_data)
    
    if result.get("status") != "OPTIMAL":
        raise HTTPException(status_code=400, detail="Could not optimize load. Ensure fleet capacity is sufficient.")
        
    return result
