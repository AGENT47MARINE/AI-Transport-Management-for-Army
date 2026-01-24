from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.route import Route
from app.schemas.route import RouteCreate, Route as RouteSchema, RoutePlanRequest
from app.services.risk_analysis import RouteRiskService

router = APIRouter()

@router.post("/", response_model=RouteSchema)
async def create_route(route: RouteCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new Route definition.
    """
    new_route = Route(**route.model_dump())
    db.add(new_route)
    await db.commit()
    await db.refresh(new_route)
    return new_route

@router.get("/", response_model=List[RouteSchema])
async def read_routes(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """
    Get all routes.
    """
    result = await db.execute(select(Route).offset(skip).limit(limit))
    routes = result.scalars().all()
    return routes

@router.post("/analyze-risk")
async def trigger_risk_analysis(db: AsyncSession = Depends(get_db)):
    """
    Triggers the AI Risk Analysis engine to re-evaluate route validities.
    """
    return await RouteRiskService.analyze_risks(db)

@router.post("/plan", response_model=RouteSchema)
async def plan_route(plan: RoutePlanRequest, db: AsyncSession = Depends(get_db)):
    """
    Plan a new route using OSRM High-Fidelity API.
    """
    from app.services.routing import fetch_osrm_route
    
    start = [plan.start_lat, plan.start_long]
    end = [plan.end_lat, plan.end_long]
    
    waypoints = await fetch_osrm_route(start, end)
    
    if not waypoints:
        # Fallback to straight line if API fails
        waypoints = [start, end]
        
    new_route = Route(
        name=plan.name,
        risk_level="LOW", # Default
        status="OPEN",
        waypoints=waypoints
    )
    db.add(new_route)
    await db.commit()
    await db.refresh(new_route)
    return new_route

@router.post("/estimate")
async def estimate_route_metrics(plan: RoutePlanRequest):
    """
    Get estimated distance and time for a route without creating it.
    """
    from app.services.routing import get_route_metrics_with_path
    
    start = [plan.start_lat, plan.start_long]
    end = [plan.end_lat, plan.end_long]
    
    metrics = await get_route_metrics_with_path(start, end)
    
    if not metrics:
        # Fallback
        return {
            "distance_km": 0.0, 
            "duration_hours": 0.0, 
            "waypoints": [start, end]
        }
    
    return metrics
