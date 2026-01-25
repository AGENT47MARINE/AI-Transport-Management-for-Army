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
    
    # Cache for Civil Route
    civil_route_cache = None

    
    # In-memory physics state
    # { asset_id: { 'current_index': 0, 'progress_km': 0.0, 'speed_kmh': 0.0, 'last_bearing': 0.0 } }
    asset_states = {}

    while True:
        try:
            async with SessionLocal() as db:
                # 1. Fetch Active Convoys (IN_TRANSIT) with their Assets and Routes
                # We use selectinload to eagerly fetch relationships async
                from sqlalchemy.orm import selectinload
                from app.models.convoy import Convoy
                
                query = (
                    select(Convoy)
                    .where(Convoy.status == "IN_TRANSIT")
                    .options(selectinload(Convoy.assets), selectinload(Convoy.route))
                )
                
                convoys_res = await db.execute(query)
                active_convoys = convoys_res.scalars().all()

                convoys_res = await db.execute(query)
                active_convoys = convoys_res.scalars().all()

                # --- CIVIL TRAFFIC SIMULATION ---
                # Fetch Civil Traffic Assets
                stmt_civil = select(TransportAsset).where(TransportAsset.asset_source == "CIVIL_OBSERVED")
                res_civil = await db.execute(stmt_civil)
                civil_assets = res_civil.scalars().all()

                # If no civil assets, seed them
                if len(civil_assets) < 10:
                    print("Seeding Synthetic Civil Traffic...")
                    from app.services.routing import fetch_osrm_route
                    # Jammu to Srinagar
                    route_pts = await fetch_osrm_route([32.7266, 74.8570], [34.0837, 74.7973])
                    
                    if route_pts:
                        for i in range(15):
                           # Pick random start point on route
                           rnd_idx = random.randint(0, len(route_pts)-2)
                           pt = route_pts[rnd_idx]
                           
                           new_asset = TransportAsset(
                               name=f"Civil-Car-{random.randint(1000,9999)}",
                               asset_type="CAR",
                               asset_source="CIVIL_OBSERVED",
                               capacity_tons=0.5,
                               current_lat=pt[0],
                               current_long=pt[1],
                               is_available=True
                           )
                           db.add(new_asset)
                           civil_assets.append(new_asset)
                        await db.commit()

                # Ensure we have the civil route
                if not civil_route_cache:
                     from app.services.routing import fetch_osrm_route
                     civil_route_cache = await fetch_osrm_route([32.7266, 74.8570], [34.0837, 74.7973])

                # Move Civil Assets along the cached route
                if civil_route_cache:
                    for asset in civil_assets:
                        state = asset_states.get(asset.id)
                        if not state:
                            # Initialize at random point on route if new
                            start_idx = random.randint(0, len(civil_route_cache)-100)
                            state = { 'current_index': start_idx, 'progress_km': 0.0, 'speed_kmh': float(random.randint(40, 90)), 'last_bearing': 0.0 }
                            asset_states[asset.id] = state
                        
                        dist_remaining_km = state['speed_kmh'] * (UPDATE_INTERVAL_SEC / 3600.0)
                        waypoints = civil_route_cache # Use the shared route
                        
                        safety_loop_count = 0
                        while dist_remaining_km > 0:
                            safety_loop_count += 1
                            if safety_loop_count > 50: break
                            
                            idx = state['current_index']
                            if idx >= len(waypoints) - 1:
                                state['current_index'] = 0 # Loop back to Jammu
                                idx = 0
                            
                            curr_pt = waypoints[idx]
                            next_pt = waypoints[idx + 1]
                            seg_dist_km = haversine_distance(curr_pt[0], curr_pt[1], next_pt[0], next_pt[1])
                            
                            if seg_dist_km < 0.0001: 
                                state['current_index'] += 1; continue
                                
                            bearing = calculate_bearing(curr_pt[0], curr_pt[1], next_pt[0], next_pt[1])
                            dist_on_seg_km = max(0.0, seg_dist_km - state['progress_km'])
                            
                            if dist_remaining_km >= dist_on_seg_km:
                                dist_remaining_km -= dist_on_seg_km
                                state['current_index'] += 1
                                state['progress_km'] = 0.0
                            else:
                                state['progress_km'] += dist_remaining_km
                                dist_remaining_km = 0
                                frac = state['progress_km'] / seg_dist_km
                                asset.current_lat = curr_pt[0] + (next_pt[0] - curr_pt[0]) * frac
                                asset.current_long = curr_pt[1] + (next_pt[1] - curr_pt[1]) * frac
                                asset.bearing = bearing
                                state['last_bearing'] = bearing


                for convoy in active_convoys:
                    if not convoy.route or not convoy.route.waypoints:
                        continue
                        
                    waypoints = convoy.route.waypoints
                    
                    # --- CONVOY FORMATION LOGIC ---
                    # 1. Assign Roles if missing (Mock for Demo)
                    assets = convoy.assets
                    if not assets: continue
                    
                    # Check if roles are already assigned
                    has_roles = any(a.role != "CARGO" for a in assets)
                    
                    if not has_roles and len(assets) > 0:
                        # Auto-assign roles based on index for demo visualization
                        # Order: ROP -> QRT -> TECH -> (CARGO...) -> AMBULANCE -> COMMS -> COMMANDER -> QRT
                        sorted_assets = sorted(assets, key=lambda a: a.id)
                        
                        count = len(sorted_assets)
                        if count >= 1: sorted_assets[0].role = "ROP"
                        if count >= 2: sorted_assets[1].role = "QRT"
                        if count >= 3: sorted_assets[2].role = "TECH"
                        
                        # Last few
                        if count >= 5: sorted_assets[-1].role = "QRT" # Rear Guard
                        if count >= 6: sorted_assets[-2].role = "COMMANDER"
                        if count >= 7: sorted_assets[-3].role = "COMMS"
                        if count >= 8: sorted_assets[-4].role = "AMBULANCE"
                        
                        # Save assigned roles
                        # (In a real app, we'd commit this, but for sim loop we can just modify the objects in session)
                        pass

                    # 2. Sort Assets by Formation Order
                    formation_priority = {
                        "ROP": 1,
                        "QRT": 2, # Front QRT
                        "TECH": 3,
                        "CARGO": 4,
                        "AMBULANCE": 5,
                        "COMMS": 6,
                        "COMMANDER": 7,
                        # Rear QRT is tricky because it has same role name. 
                        # We'll handle strictly by list order if roles match.
                    }
                    
                    # We can't distinguish Front/Rear QRT easily by string alone without extra logic, 
                    # so we rely on the list order we just set or ID.
                    # A robust way: Separate lists.
                    
                    # For simplicity: Sort by Priority then ID.
                    # Actually, if we just assigned them by index, they are essentially sorted.
                    # But let's enforce a generic sort: ROP always lead.
                    
                    formation_assets = sorted(assets, key=lambda a: formation_priority.get(a.role, 4))
                    
                    # 3. Move Lead Vehicle (ROP)
                    lead_asset = formation_assets[0]
                    state = asset_states.get(lead_asset.id)
                    if not state:
                        # Initialize leader
                        state = { 'current_index': 0, 'progress_km': 0.0, 'speed_kmh': BASE_SPEED_KMH, 'last_bearing': 0.0 }
                        asset_states[lead_asset.id] = state
                    
                    # Physics for Leader
                    dist_to_move = state['speed_kmh'] * (UPDATE_INTERVAL_SEC / 3600.0)
                    
                     # Move along waypoints
                    safety = 0
                    while dist_to_move > 0 and safety < 50:
                        safety += 1
                        idx = state['current_index']
                        if idx >= len(waypoints) - 1:
                            state['current_index'] = 0; idx = 0 # Loop
                        
                        curr = waypoints[idx]
                        next_p = waypoints[idx+1]
                        seg_len = haversine_distance(curr[0], curr[1], next_p[0], next_p[1])
                        
                        if seg_len < 0.0001: 
                            state['current_index'] += 1; continue
                            
                        avail = seg_len - state['progress_km']
                        if dist_to_move >= avail:
                             dist_to_move -= avail
                             state['current_index'] += 1
                             state['progress_km'] = 0.0
                        else:
                             state['progress_km'] += dist_to_move
                             dist_to_move = 0
                             frac = state['progress_km'] / seg_len
                             # Interpolate
                             lead_asset.current_lat = curr[0] + (next_p[0]-curr[0])*frac
                             lead_asset.current_long = curr[1] + (next_p[1]-curr[1])*frac
                             lead_asset.bearing = calculate_bearing(curr[0],curr[1],next_p[0],next_p[1])
                    
                    # 4. Position Followers with Fixed Gap
                    GAP_KM = 0.05 # 50 meters gap
                    
                    # We need the leader's total distance from start of route to calculate offsets easily.
                    # or just place them iteratively behind.
                    # Iterative placement is safer on complex routes.
                    
                    prev_state = state
                    prev_asset = lead_asset
                    
                    for i in range(1, len(formation_assets)):
                        follower = formation_assets[i]
                        
                        # Follower state tracks where it is *logically*
                        # Ideally, follower just targets (Leader Pos - Gap).
                        # simplified: Follower adopts Leader's state from T-minus-X seconds? 
                        # Or just determine position by walking back 'GAP_KM' from predecessor.
                        
                        # Let's walk back from Predecessor's current state
                        p_idx = prev_state['current_index']
                        p_prog = prev_state['progress_km']
                        
                        req_back = GAP_KM
                        
                        # Backtrack logic
                        curr_idx = p_idx
                        curr_prog = p_prog
                        
                        found_pos = False
                        
                        # Backtrack loop
                        safety_back = 0
                        while req_back > 0 and safety_back < 50:
                            safety_back += 1
                            if curr_prog >= req_back:
                                curr_prog -= req_back
                                req_back = 0
                                found_pos = True
                            else:
                                req_back -= curr_prog
                                # Step back segment
                                curr_idx -= 1
                                if curr_idx < 0:
                                    curr_idx = len(waypoints) - 2 # Loop back wrap-around (simplified)
                                    # If route is not loop, we might stack at start.
                                    if curr_idx < 0: curr_idx = 0
                                
                                # Get len of this new segment
                                c = waypoints[curr_idx]
                                n = waypoints[curr_idx+1]
                                seg_len = haversine_distance(c[0], c[1], n[0], n[1])
                                curr_prog = seg_len # We are at end of this segment
                        
                        # Update Follower Lat/Long
                        if found_pos:
                             c = waypoints[curr_idx]
                             n = waypoints[curr_idx+1]
                             seg_len = haversine_distance(c[0], c[1], n[0], n[1])
                             if seg_len > 0.00001:
                                frac = curr_prog / seg_len
                                follower.current_lat = c[0] + (n[0]-c[0])*frac
                                follower.current_long = c[1] + (n[1]-c[1])*frac
                                follower.bearing = calculate_bearing(c[0],c[1],n[0],n[1])
                                
                                # Store state for next guy to follow
                                f_state = {'current_index': curr_idx, 'progress_km': curr_prog}
                                prev_state = f_state
                                asset_states[follower.id] = f_state # Update global match
                        else:
                            # Stack at start
                            follower.current_lat = waypoints[0][0]
                            follower.current_long = waypoints[0][1]
                            prev_state = {'current_index': 0, 'progress_km': 0}

                await db.commit()
        
        except Exception as e:
            print(f"CRITICAL SIMULATION ERROR: {e}")
            await asyncio.sleep(5)
            continue


        await asyncio.sleep(UPDATE_INTERVAL_SEC)

if __name__ == "__main__":
    asyncio.run(simulate())
