import asyncio
import sys
import os
import random

# Add the backend root directory to sys.path
backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_root)

from app.core.database import SessionLocal, engine
from app.models.asset import TransportAsset
from app.models.route import Route
from sqlalchemy import select

# Helper to interpolate between two points
def interpolate(start, end, fraction):
    return start + (end - start) * fraction

async def simulate():
    print("Starting Simulation Service...")
    
    async with SessionLocal() as db:
        # Get the NH-44 Route
        result = await db.execute(select(Route).where(Route.name.contains("NH-44")))
        route = result.scalars().first()
        
        if not route:
            print("No Route found. running seed first...")
            return

        waypoints = route.waypoints
        
        # Get Assets that we want to move
        assets_res = await db.execute(select(TransportAsset))
        assets = assets_res.scalars().all()
        
        print(f"Simulating movement for {len(assets)} assets along {route.name}...")
        
        # Infinite Grid loop for simulation
        step = 0
        total_steps = 100
        
        # Assign each asset a 'progress' along the route (0.0 to 1.0)
        # For simplicity, we just bounce them back and forth between waypoints
        
        while True:
            for i, asset in enumerate(assets):
                # Pick a segment based on time
                # Total segments = len(waypoints) - 1
                segment_count = len(waypoints) - 1
                
                # Make them move at different speeds
                speed_factor = (i + 1) * 0.05 
                
                # distinct progress for each asset
                progress_raw = (step * speed_factor) % segment_count
                segment_idx = int(progress_raw)
                segment_fraction = progress_raw - segment_idx
                
                start_pt = waypoints[segment_idx]
                end_pt = waypoints[segment_idx + 1]
                
                # Calculate new lat/long
                new_lat = interpolate(start_pt[0], end_pt[0], segment_fraction)
                new_long = interpolate(start_pt[1], end_pt[1], segment_fraction)
                
                # Update Asset
                asset.current_lat = new_lat
                asset.current_long = new_long
                
                # Randomize fuel consumption
                if random.random() > 0.9:
                    asset.fuel_status = max(0, asset.fuel_status - 0.5)

            await db.commit()
            print(f"Step {step}: Updated positions.")
            
            step += 1
            await asyncio.sleep(1) # Update every second

if __name__ == "__main__":
    try:
        asyncio.run(simulate())
    except KeyboardInterrupt:
        print("Simulation stopped.")
