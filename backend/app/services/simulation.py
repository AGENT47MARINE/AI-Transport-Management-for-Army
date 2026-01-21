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
BASE_SPEED_KMH = 80.0 
CURVE_SPEED_KMH = 30.0
UPDATE_INTERVAL_SEC = 2.0 

def haversine_distance(lat1, lon1, lat2, lon2):
    """ Calculate distance in km between two points """
    R = 6371.0 
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_bearing(lat1, lon1, lat2, lon2):
    """ Calculate bearing between two points in degrees (0-360) """
    dlon = math.radians(lon2 - lon1)
    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)
    
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - (math.sin(lat1) * math.cos(lat2) * math.cos(dlon))
    
    initial_bearing = math.atan2(x, y)
    initial_bearing = math.degrees(initial_bearing)
    compass_bearing = (initial_bearing + 360) % 360
    return compass_bearing

async def simulate():
    print(f"Starting Realistic Simulation Engine (Sat-Nav Mode)...")
    
    # In-memory physics state
    # { asset_id: { 'current_index': 0, 'progress_km': 0.0, 'speed_kmh': 0.0, 'last_bearing': 0.0 } }
    asset_states = {}

    while True:
        try:
            async with SessionLocal() as db:
                # 1. Fetch High Fidelity Route
                route_res = await db.execute(select(Route).where(Route.name.contains("Sat-Nav")))
                route = route_res.scalars().first()
                
                assets_res = await db.execute(select(TransportAsset))
                assets = assets_res.scalars().all()

                if not route or not route.waypoints:
                    # print("Waiting for route data...")
                    await asyncio.sleep(5)
                    continue

                waypoints = route.waypoints
                
                for asset in assets:
                    state = asset_states.get(asset.id)
                    if not state:
                        state = { 'current_index': 0, 'progress_km': 0.0, 'speed_kmh': 0.0, 'last_bearing': 0.0 }
                        asset_states[asset.id] = state

                    # Calculate max distance to move this tick
                    dist_remaining_km = state['speed_kmh'] * (UPDATE_INTERVAL_SEC / 3600.0)
                    
                    safety_loop_count = 0
                    
                    # Move along waypoints consuming distance
                    while dist_remaining_km > 0:
                        safety_loop_count += 1
                        if safety_loop_count > 100:
                            print(f"WARNING: Infinite loop detected for asset {asset.id}. Forced break.")
                            break
                            
                        idx = state['current_index']
                        
                        # Handle Loop
                        if idx >= len(waypoints) - 1:
                            state['current_index'] = 0
                            state['progress_km'] = 0.0
                            idx = 0
                        
                        curr_pt = waypoints[idx]
                        next_pt = waypoints[idx + 1]
                        
                        seg_dist_km = haversine_distance(curr_pt[0], curr_pt[1], next_pt[0], next_pt[1])
                        
                        if seg_dist_km < 0.0001: # 10 cm safety
                            state['current_index'] += 1
                            state['progress_km'] = 0.0
                            continue
                        
                        # Calculate physics for this segment (Speed/Bearing)
                        bearing = calculate_bearing(curr_pt[0], curr_pt[1], next_pt[0], next_pt[1])
                        
                        # Prevent negative distance
                        dist_on_seg_km = max(0.0, seg_dist_km - state['progress_km'])
                        
                        if dist_remaining_km >= dist_on_seg_km:
                            # Finish segment
                            dist_remaining_km -= dist_on_seg_km
                            state['current_index'] += 1
                            state['progress_km'] = 0.0
                        else:
                            # End in segment
                            state['progress_km'] += dist_remaining_km
                            dist_remaining_km = 0 
                            
                            frac = state['progress_km'] / seg_dist_km
                            asset.current_lat = curr_pt[0] + (next_pt[0] - curr_pt[0]) * frac
                            asset.current_long = curr_pt[1] + (next_pt[1] - curr_pt[1]) * frac
                            asset.bearing = bearing
                            state['last_bearing'] = bearing # Update for physics next tick check
                    
                    # PHYSICS UPDATE (Restored)
                    # Adjust speed for next tick based on curvature
                    # simplified to use the last bearing of the tick
                    
                    # We compare current bearing with previous 'last_bearing' stored in state (which we just updated?)
                    # Ideally we want the DELTA of bearing. 
                    # If we just updated last_bearing, we lost the previous one. 
                    # But for now, let's keep it simple: constant speed for now to ensure stability, 
                    # or re-implement correct lookahead. 
                    # I'll stick to a simpler model: Speed is mostly constant but reduced if we did many turns?
                    # Let's just restore the basic speed:
                    
                    target_speed = BASE_SPEED_KMH
                    # Random jitter for realism
                    if random.random() < 0.1:
                        target_speed += random.uniform(-10, 10)
                        
                    state['speed_kmh'] = (state['speed_kmh'] * 0.8) + (target_speed * 0.2)

                await db.commit()
        
        except Exception as e:
            print(f"CRITICAL SIMULATION ERROR: {e}")
            await asyncio.sleep(5)
            continue

        await asyncio.sleep(UPDATE_INTERVAL_SEC)

if __name__ == "__main__":
    asyncio.run(simulate())
