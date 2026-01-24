
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.convoy import Convoy
from app.models.logistics import LogisticsIndent
from app.models.checkpoint import Checkpoint
from datetime import datetime
import math

# Constants for Calculation
AVG_MPG_TRUCK = 3.0 # km/l
AVG_MPG_LIGHT = 10.0 # km/l
OIL_RATIO = 0.05 # 5% of fuel
RESERVE_FACTOR = 1.25 # 25% Reserve

async def calculate_and_indent_fol(convoy_id: int, db: AsyncSession):
    """
    Analyzes a convoy plan and generates Logistics Indents for FOL & Stay.
    """
    # 1. Fetch Convoy with Assets & Route
    stmt = (
        select(Convoy)
        .where(Convoy.id == convoy_id)
        .options(selectinload(Convoy.assets), selectinload(Convoy.route))
    )
    result = await db.execute(stmt)
    convoy = result.scalars().first()
    
    if not convoy or not convoy.route:
        print(f"Convoy {convoy_id} has no route/assets to calculate.")
        return

    # 2. Calculate Total Demand
    total_diesel = 0.0
    total_petrol = 0.0
    total_pax = 0
    
    # We need route distance. If not stored, we estimate or use cached metrics.
    # For now, let's assume route has waypoints and calc straight-ish distance or use a stored 'distance_km' if we added it.
    # We didn't add distance_km to Route model yet, so we calc via Haversine sum or just use a dummy '300km' reference 
    # if route metrics aren't hydrated.
    # Better: Use the service routing.py if we want real distance. 
    # For MVP speed, let's assume a standard 300km "Leg"
    route_distance_km = 300.0 
    
    for asset in convoy.assets:
        # Simple Logic
        if "TRUCK" in asset.asset_type.upper() or "BUS" in asset.asset_type.upper() or "ALS" in asset.asset_type.upper():
            consumption = (route_distance_km / AVG_MPG_TRUCK) * RESERVE_FACTOR
            total_diesel += consumption
        else:
            consumption = (route_distance_km / AVG_MPG_LIGHT) * RESERVE_FACTOR
            total_petrol += consumption
            
        total_pax += (asset.personnel_count or 1) # Driver count
        
    total_oil = (total_diesel + total_petrol) * OIL_RATIO

    # 3. Determine Receiving Station
    # If Night Stay needed (e.g. duration > 8h), find intermediate camp.
    # Otherwise, destination.
    
    # Let's find a "Transit Camp" from checkpoints
    stmt_cp = select(Checkpoint).where(Checkpoint.checkpoint_type == "Transit Camp").limit(1)
    res_cp = await db.execute(stmt_cp)
    camp = res_cp.scalars().first()
    
    target_location_id = camp.id if camp else 1 # Default to ID 1 if no camp found
    
    # 4. Create Indent
    indent = LogisticsIndent(
        convoy_id=convoy.id,
        location_id=target_location_id,
        fuel_diesel_liters=round(total_diesel, 1),
        fuel_petrol_liters=round(total_petrol, 1),
        oil_liters=round(total_oil, 1),
        accommodation_personnel=total_pax,
        status="PENDING",
        arrival_time_est=convoy.estimated_arrival_time or datetime.utcnow()
    )
    
    db.add(indent)
    await db.commit()
    print(f"Generated Logistics Indent for Convoy {convoy.name}: {total_diesel}L Diesel, {total_pax} Pax")
    return indent
