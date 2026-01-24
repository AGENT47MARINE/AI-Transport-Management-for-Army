
import asyncio
import sys
import os
import random
from datetime import datetime

# Add the backend root directory to sys.path
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)

from app.core.database import SessionLocal
from app.services.routing import fetch_osrm_route
from app.models.route import Route
from app.models.convoy import Convoy
from app.models.asset import TransportAsset
from sqlalchemy import select

async def seed_convoys():
    print("Initializing Seeding Process for New Route & Convoys...")
    
    async with SessionLocal() as db:
        # Define Coordinates for Srinagar -> Leh
        start_coords = [34.0837, 74.7973] # Srinagar
        end_coords = [34.1526, 77.5770]   # Leh
        
        print(f"Fetching OSRM Route: Srinagar -> Leh...")
        waypoints = await fetch_osrm_route(start_coords, end_coords)
        
        if not waypoints:
            print("Failed to fetch route from OSRM. Aborting.")
            return

        print(f"Route fetched! {len(waypoints)} waypoints.")
        
        # 1. Create or Get the Route
        route_name = "NH-1D: Srinagar-Leh Highway"
        
        # Check if exists
        res = await db.execute(select(Route).where(Route.name == route_name))
        route = res.scalars().first()
        
        if not route:
            route = Route(
                name=route_name,
                waypoints=waypoints,
                risk_level="HIGH",
                status="OPEN"
            )
            db.add(route)
            await db.commit()
            await db.refresh(route)
            print(f"Created new Route: {route.name} (ID: {route.id})")
        else:
            print(f"Route already exists: {route.name} (ID: {route.id})")
            
        # 2. Create Active Convoys
        convoys_to_create = [
            {"name": "CVY-HIMAL-09", "start": "Srinagar", "end": "Leh"},
            {"name": "CVY-LADAKH-22", "start": "Srinagar", "end": "Leh"},
            {"name": "CVY-SUPPLY-77", "start": "Srinagar", "end": "Leh"}
        ]
        
        for c_data in convoys_to_create:
            # Check if exists
            res = await db.execute(select(Convoy).where(Convoy.name == c_data["name"]))
            existing = res.scalars().first()
            
            if existing:
                print(f"Convoy {c_data['name']} already exists. Skipping.")
                continue
                
            new_convoy = Convoy(
                name=c_data["name"],
                start_location=c_data["start"],
                end_location=c_data["end"],
                start_time=datetime.utcnow(),
                status="IN_TRANSIT",
                route_id=route.id
            )
            db.add(new_convoy)
            await db.commit()
            await db.refresh(new_convoy)
            
            # 3. Add Assets to Convoy
            # Distribute them along the start of the route
            num_assets = random.randint(3, 6)
            for i in range(num_assets):
                # Start them slightly spaced out at the beginning of route
                start_idx = i * 2
                if start_idx >= len(waypoints): start_idx = 0
                
                pt = waypoints[start_idx]
                
                asset = TransportAsset(
                    name=f"{c_data['name'].split('-')[1]}-{random.randint(100,999)}",
                    asset_type=random.choice(["TRUCK", "TANKER", "JEEP", "APC"]),
                    convoy_id=new_convoy.id,
                    current_lat=pt[0],
                    current_long=pt[1],
                    is_available=False,
                    capacity_tons=5.0,
                    driver_name="Simulated Driver"
                )
                db.add(asset)
            
            await db.commit()
            print(f"Seeded Convoy {new_convoy.name} with {num_assets} assets.")

    print("Seeding Complete!")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_convoys())
