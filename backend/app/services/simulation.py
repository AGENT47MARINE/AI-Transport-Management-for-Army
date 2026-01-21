import asyncio
import sys
import os
import random
import math
from datetime import datetime

# Add the backend root directory to sys.path
backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_root)

from app.core.database import SessionLocal
from app.models.asset import TransportAsset
from app.models.route import Route
from sqlalchemy import select

# --- CONSTANTS ---
CONVOY_SPEED_KMH = 60.0 # Speed in km/h
UPDATE_INTERVAL_SEC = 2.0 # Update DB every X seconds

def haversine_distance(lat1, lon1, lat2, lon2):
    """ Calculate distance in km between two points """
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def simulate():
    print(f"Starting Realistic Simulation Engine...")
    print(f"Target Speed: ~{CONVOY_SPEED_KMH} km/h")
    
    # In-memory monitoring of asset progress
    # { asset_id: { 'route_nodes': [], 'current_index': 0, 'progress_to_next': 0.0, 'total_segment_dist': 0.0 } }
    asset_states = {}

    while True:
        async with SessionLocal() as db:
            # 1. Fetch Assets and Route (High Fidelity Sat-Nav Route)
            route_res = await db.execute(select(Route).where(Route.name.contains("Sat-Nav")))
            route = route_res.scalars().first()
            
            assets_res = await db.execute(select(TransportAsset))
            assets = assets_res.scalars().all()

            if not route:
                print("Waiting for route data...")
                await asyncio.sleep(5)
                continue

            waypoints = route.waypoints
            if not waypoints or len(waypoints) < 2:
                print("Route has insufficient waypoints.")
                continue

            for asset in assets:
                state = asset_states.get(asset.id)
                
                # Initialize state if new
                if not state:
                    state = {
                        'current_index': 0, # Index of the waypoint strictly BEHIND the asset
                        'segment_progress_km': 0.0 # distance traveled in current segment
                    }
                    # Try to snap to nearest waypoint if initializing (simplified: just start at 0)
                    asset_states[asset.id] = state

                # Determine current segment
                idx = state['current_index']
                
                # If we are at the end of the route, bounce back or stop? Let's generic 'patrol' (bounce)
                direction = 1 # 1 = forward, -1 = backward (logic simplified: loop back to start for demo)
                
                if idx >= len(waypoints) - 1:
                    # Reset to start
                    state['current_index'] = 0
                    state['segment_progress_km'] = 0.0
                    idx = 0
                
                start_pt = waypoints[idx]
                end_pt = waypoints[idx + 1]
                
                # Calculate total distance of this segment (km)
                segment_dist_km = haversine_distance(start_pt[0], start_pt[1], end_pt[0], end_pt[1])
                
                # Avoid division by zero for tiny segments
                if segment_dist_km < 0.01:
                    state['current_index'] += 1
                    state['segment_progress_km'] = 0.0
                    continue

                # Move vehicle
                # Distance to move = Speed (km/h) * Time (h)
                # Add randomness: +/- 10% speed variance
                speed_variance = random.uniform(0.9, 1.1)
                dist_moved_km = (CONVOY_SPEED_KMH * speed_variance) * (UPDATE_INTERVAL_SEC / 3600.0)
                
                state['segment_progress_km'] += dist_moved_km
                
                # Check if we reached the next waypoint
                if state['segment_progress_km'] >= segment_dist_km:
                    # Overshot? Move to next segment
                    excess_km = state['segment_progress_km'] - segment_dist_km
                    state['current_index'] += 1
                    state['segment_progress_km'] = excess_km # Carry over progress
                    
                    # Update physics snap for DB
                    asset.current_lat = end_pt[0]
                    asset.current_long = end_pt[1]
                else:
                    # Interpolate position
                    fraction = state['segment_progress_km'] / segment_dist_km
                    new_lat = start_pt[0] + (end_pt[0] - start_pt[0]) * fraction
                    new_long = start_pt[1] + (end_pt[1] - start_pt[1]) * fraction
                    
                    asset.current_lat = new_lat
                    asset.current_long = new_long

                # Fuel Consumption logic
                if random.random() > 0.95:
                    asset.fuel_status = max(0, asset.fuel_status - 0.1)

            await db.commit()
            # print(f"Updated {len(assets)} assets. Time: {datetime.now().strftime('%H:%M:%S')}")
        
        await asyncio.sleep(UPDATE_INTERVAL_SEC)

if __name__ == "__main__":
    try:
        asyncio.run(simulate())
    except KeyboardInterrupt:
        print("Simulation stopped.")
