import asyncio
import sys
import os
import httpx
# import polyline # Not needed for GeoJSON

# Add the parent directory to sys.path to make 'app' module importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine, Base
from app.models.asset import TransportAsset
from app.models.convoy import Convoy
from app.models.route import Route
from app.models.user import User
from app.core.security import get_password_hash
from datetime import datetime
from sqlalchemy import text

async def fetch_osrm_route(start_coords, end_coords):
    """
    Fetch exact driving route from OSRM (Open Source Routing Machine).
    Coords format: [lat, lon]
    OSRM expects: lon,lat
    """
    # OSRM Public Demo Server (Free)
    base_url = "http://router.project-osrm.org/route/v1/driving/"
    
    # Format: {lon},{lat};{lon},{lat}
    coords_str = f"{start_coords[1]},{start_coords[0]};{end_coords[1]},{end_coords[0]}"
    url = f"{base_url}{coords_str}?overview=full&geometries=geojson"
    
    print(f"Fetching route data from OSRM: {url}")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
            
            if "routes" in data and len(data["routes"]) > 0:
                # OSRM returns [lon, lat], we need [lat, lon]
                geometry = data["routes"][0]["geometry"]["coordinates"]
                flipped_geom = [[p[1], p[0]] for p in geometry]
                return flipped_geom
            else:
                print("No route found by OSRM.")
                return None
        except Exception as e:
            print(f"Error fetching OSRM route: {e}")
            return None

async def seed_data():
    print("Resetting Database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    print("Seeding High-Fidelity Router Data...")
    async with SessionLocal() as db:
        
        # --- SEED USERS ---
        print("Seeding Users...")
        demo_users = [
            User(username="commander", hashed_password=get_password_hash("admin123"), role="COMMANDER", is_active=True),
            User(username="tcp_officer", hashed_password=get_password_hash("tcp123"), role="TCP_INCHARGE", is_active=True),
            User(username="operator", hashed_password=get_password_hash("operator123"), role="COMMANDER", is_active=True),
        ]
        db.add_all(demo_users)
        await db.flush()
        print(f"Added {len(demo_users)} users.")
        
        # JAMMU AIRPORT (IXJ) -> SRINAGAR AIRPORT (SXR)
        start_pt = [32.6896, 74.8376]
        end_pt = [33.9872, 74.7736]

        print("Requesting satellite-accurate path from Router Network...")
        waypoints_high_fidelity = await fetch_osrm_route(start_pt, end_pt)

        if not waypoints_high_fidelity:
            print("FALLBACK: Using manual high-res waypoints due to API failure.")
            # Fallback (Manual Approximation)
            waypoints_high_fidelity = [
                 [32.6896, 74.8376], [32.8, 74.9], [32.9197, 75.0440], 
                 [33.1, 75.3], [33.2435, 75.2476], [33.4357, 75.1956],
                 [33.6231, 75.1822], [33.9167, 75.0210], [33.9872, 74.7736]
            ]
        else:
            print(f"Success! Retrieved {len(waypoints_high_fidelity)} exact coordinate points.")

        route_main = Route(
            name="Route: IXJ-SXR (Sat-Nav)",
            risk_level="HIGH",
            status="OPEN (LIVE TRACKING)",
            waypoints=waypoints_high_fidelity
        )

        db.add(route_main)
        print("Added Precision Route: IXJ-SXR.")
        await db.flush()

        # ROUTE 2: PATHANKOT (Base) -> UDHAMPUR (HQ)
        start_ptk = [32.2643, 75.6527]
        end_udh = [32.9265, 75.1360]
        print("Fetching Route: Pathankot -> Udhampur...")
        wp_ptk_udh = await fetch_osrm_route(start_ptk, end_udh)
        
        # Fallback if OSRM fails
        if not wp_ptk_udh:
            wp_ptk_udh = [start_ptk, end_udh] 

        route_ptk = Route(
            name="Route: Pathankot-Udhampur Supply Line",
            risk_level="LOW",
            status="OPEN",
            waypoints=wp_ptk_udh
        )
        db.add(route_ptk)
        print("Added Route: Pathankot-Udhampur.")
        await db.flush()

        # ROUTE 3: LEH -> KARGIL (High Altitude)
        start_leh = [34.1500, 77.5667]
        end_kargil = [34.5500, 76.1333]
        print("Fetching Route: Leh -> Kargil...")
        wp_leh_kgl = await fetch_osrm_route(start_leh, end_kargil)
        
        if not wp_leh_kgl:
            wp_leh_kgl = [start_leh, [34.3, 76.8], end_kargil]

        route_leh = Route(
            name="Route: Leh-Kargil Axis",
            risk_level="MEDIUM",
            status="CAUTION (SNOW)",
            waypoints=wp_leh_kgl
        )
        db.add(route_leh)
        print("Added Route: Leh-Kargil.")
        await db.flush()

        # Commit route first to get ID
        await db.flush()

        # --- CONVOY 1: Jammu -> Srinagar ---
        convoy1 = Convoy(name="Air-Link-Supply-01", start_location="Jammu Airport", end_location="Srinagar Airport", status="IN_TRANSIT", start_time=datetime.utcnow(), route_id=route_main.id)
        db.add(convoy1)
        await db.flush()

        # Calculate mid-point for asset placement (Convoy 1)
        mid_idx = len(waypoints_high_fidelity) // 2
        mid_pt = waypoints_high_fidelity[mid_idx]

        # --- CONVOY 2: Udhampur -> Leh (TC to TC) ---
        convoy2 = Convoy(name="Leh-Resupply-02", start_location="TCP-2 Udhampur", end_location="TCP-19 Leh", status="IN_TRANSIT", start_time=datetime.utcnow(), route_id=route_leh.id)
        db.add(convoy2)
        await db.flush()

        # Mid-point for Convoy 2
        mid_idx2 = len(wp_leh_kgl) // 2 if wp_leh_kgl else 0
        mid_pt2 = wp_leh_kgl[mid_idx2] if wp_leh_kgl else [34.3, 76.5]

        # Assets
        assets = [
            # Available Assets at Start Point (Jammu)
            TransportAsset(name="IXJ-01 (Heavy)", asset_type="Tatra 8x8", capacity_tons=10.0, is_available=True, current_lat=start_pt[0], current_long=start_pt[1], fuel_status=100.0, driver_name="Hav. Rajender Singh", personnel_count=2),
            TransportAsset(name="IXJ-Heavy-01", asset_type="ALS Stallion", capacity_tons=5.0, is_available=True, current_lat=start_pt[0], current_long=start_pt[1], fuel_status=100.0, driver_name="Nk. Suresh Kumar", personnel_count=20),
            TransportAsset(name="IXJ-Heavy-02", asset_type="ALS Stallion", capacity_tons=5.0, is_available=True, current_lat=start_pt[0], current_long=start_pt[1], fuel_status=90.0, driver_name="Sep. Amit Verma", personnel_count=18),
            TransportAsset(name="IXJ-Tanker-01", asset_type="Fuel Tanker", capacity_tons=12.0, is_available=True, current_lat=start_pt[0], current_long=start_pt[1], fuel_status=100.0, driver_name="Civ. Driver Manoj", personnel_count=1),
            TransportAsset(name="QRT-01", asset_type="Light Vehicle", capacity_tons=0.4, is_available=True, current_lat=start_pt[0], current_long=start_pt[1], fuel_status=100.0, driver_name="L/Nk. Vikram", personnel_count=4),
            TransportAsset(name="QRT-02", asset_type="Light Vehicle", capacity_tons=0.4, is_available=True, current_lat=start_pt[0], current_long=start_pt[1], fuel_status=100.0, driver_name="Sep. Rahul", personnel_count=4),
            
             # Available Assets at End Point (Srinagar)
            TransportAsset(name="SXR-01 (Rapid)", asset_type="Maruti Gypsy", capacity_tons=0.5, is_available=True, current_lat=end_pt[0], current_long=end_pt[1], fuel_status=100.0, driver_name="Sub. Major Khan", personnel_count=3),
            TransportAsset(name="SXR-Bus-01", asset_type="Bus", capacity_tons=0.0, is_available=True, current_lat=end_pt[0], current_long=end_pt[1], fuel_status=95.0, driver_name="Civ. Driver Ram", personnel_count=30),

            # --- CONVOY 1 ASSETS (Jammu -> Srinagar) - FULL FORMATION ---
            TransportAsset(name="CVY-Alpha-ROP", asset_type="Maruti Gypsy", capacity_tons=0.5, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=90.0, convoy_id=convoy1.id, driver_name="Nk. Vikram", personnel_count=4, role="ROP"),
            TransportAsset(name="CVY-Alpha-QRT-Front", asset_type="Light Vehicle", capacity_tons=0.5, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=88.0, convoy_id=convoy1.id, driver_name="L/Nk. Raju", personnel_count=4, role="QRT"),
            TransportAsset(name="CVY-Alpha-Tech", asset_type="Recovery Vehicle", capacity_tons=5.0, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=85.0, convoy_id=convoy1.id, driver_name="Hav. Kumar", personnel_count=3, role="TECH"),
            TransportAsset(name="CVY-Alpha-Cargo-01", asset_type="ALS Stallion", capacity_tons=5.0, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=65.0, convoy_id=convoy1.id, driver_name="Nk. Gurdeep", personnel_count=12, role="CARGO"),
            TransportAsset(name="CVY-Alpha-Cargo-02", asset_type="Tatra 8x8", capacity_tons=10.0, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=62.0, convoy_id=convoy1.id, driver_name="Hav. Mahendra", personnel_count=4, role="CARGO"),
            TransportAsset(name="CVY-Alpha-Ambulance", asset_type="Army Ambulance", capacity_tons=2.0, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=75.0, convoy_id=convoy1.id, driver_name="Sep. Medic Rao", personnel_count=2, role="AMBULANCE"),
            TransportAsset(name="CVY-Alpha-Comms", asset_type="Comms Vehicle", capacity_tons=1.5, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=70.0, convoy_id=convoy1.id, driver_name="Sig. Naik", personnel_count=3, role="COMMS"),
            TransportAsset(name="CVY-Alpha-Commander", asset_type="Maruti Gypsy (Command)", capacity_tons=0.5, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=85.0, convoy_id=convoy1.id, driver_name="Major Rathore", personnel_count=3, role="COMMANDER"),
            TransportAsset(name="CVY-Alpha-QRT-Rear", asset_type="Light Vehicle", capacity_tons=0.5, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=82.0, convoy_id=convoy1.id, driver_name="Sep. Ajay", personnel_count=4, role="QRT"),
            
            # --- CONVOY 2 ASSETS (Udhampur -> Leh) - FULL FORMATION ---
            TransportAsset(name="CVY-Bravo-ROP", asset_type="Maruti Gypsy", capacity_tons=0.5, is_available=False, current_lat=mid_pt2[0], current_long=mid_pt2[1], fuel_status=88.0, convoy_id=convoy2.id, driver_name="Nk. Dorje", personnel_count=4, role="ROP"),
            TransportAsset(name="CVY-Bravo-QRT-Front", asset_type="Light Vehicle", capacity_tons=0.5, is_available=False, current_lat=mid_pt2[0], current_long=mid_pt2[1], fuel_status=85.0, convoy_id=convoy2.id, driver_name="L/Nk. Tenzin", personnel_count=4, role="QRT"),
            TransportAsset(name="CVY-Bravo-Tech", asset_type="Recovery HEMTT", capacity_tons=8.0, is_available=False, current_lat=mid_pt2[0], current_long=mid_pt2[1], fuel_status=80.0, convoy_id=convoy2.id, driver_name="Hav. Rigzin", personnel_count=3, role="TECH"),
            TransportAsset(name="CVY-Bravo-Cargo-01", asset_type="Tatra 6x6", capacity_tons=8.0, is_available=False, current_lat=mid_pt2[0], current_long=mid_pt2[1], fuel_status=70.0, convoy_id=convoy2.id, driver_name="Nk. Stanzin", personnel_count=10, role="CARGO"),
            TransportAsset(name="CVY-Bravo-Cargo-02", asset_type="Tatra 8x8", capacity_tons=10.0, is_available=False, current_lat=mid_pt2[0], current_long=mid_pt2[1], fuel_status=68.0, convoy_id=convoy2.id, driver_name="Hav. Lobzang", personnel_count=5, role="CARGO"),
            TransportAsset(name="CVY-Bravo-Cargo-03", asset_type="ALS Stallion", capacity_tons=5.0, is_available=False, current_lat=mid_pt2[0], current_long=mid_pt2[1], fuel_status=65.0, convoy_id=convoy2.id, driver_name="Sep. Norbu", personnel_count=12, role="CARGO"),
            TransportAsset(name="CVY-Bravo-Ambulance", asset_type="Army Ambulance", capacity_tons=2.0, is_available=False, current_lat=mid_pt2[0], current_long=mid_pt2[1], fuel_status=72.0, convoy_id=convoy2.id, driver_name="Sep. Tsewang", personnel_count=2, role="AMBULANCE"),
            TransportAsset(name="CVY-Bravo-Comms", asset_type="Comms Vehicle", capacity_tons=1.5, is_available=False, current_lat=mid_pt2[0], current_long=mid_pt2[1], fuel_status=75.0, convoy_id=convoy2.id, driver_name="Sig. Paldan", personnel_count=3, role="COMMS"),
            TransportAsset(name="CVY-Bravo-Commander", asset_type="Gypsy (Command)", capacity_tons=0.5, is_available=False, current_lat=mid_pt2[0], current_long=mid_pt2[1], fuel_status=80.0, convoy_id=convoy2.id, driver_name="Lt. Col. Dorjay", personnel_count=3, role="COMMANDER"),
            TransportAsset(name="CVY-Bravo-QRT-Rear", asset_type="Light Vehicle", capacity_tons=0.5, is_available=False, current_lat=mid_pt2[0], current_long=mid_pt2[1], fuel_status=78.0, convoy_id=convoy2.id, driver_name="Sep. Angchuk", personnel_count=4, role="QRT"),
            
            # Idle/Busy Assets elsewhere
            TransportAsset(name="Udhampur-Recov", asset_type="Recovery Vehicle", capacity_tons=15.0, is_available=True, current_lat=32.9266, current_long=75.1370, fuel_status=88.0, driver_name="Hav. Tech Singh", personnel_count=3),
        ]
        
        db.add_all(assets)

        # SEED CHECKPOINTS (TCPs)
        # Based on Jammu-Srinagar Highway locations
        from app.models.checkpoint import Checkpoint
        checkpoints = [
            # --- J&K: JAMMU-SRINAGAR HIGHWAY (NH-44) ---
            Checkpoint(name="TCP-1 Nagrota", location_name="Nagrota Toll", lat=32.7797, long=74.9048, checkpoint_type="Toll Gate", capacity=200, tcp_incharge="Insp. Rajesh Kumar", scheduled_departures='["0800", "1400", "2000"]'),
            Checkpoint(name="TCP-2 Udhampur", location_name="Jakhani Chowk", lat=32.9265, long=75.1360, checkpoint_type="TCP", capacity=150, tcp_incharge="Sub. Major Singh", scheduled_departures='["0600", "1200", "1800"]'),
            Checkpoint(name="TCP-3 Chenani", location_name="Chenani-Nashri South", lat=33.0286, long=75.2917, checkpoint_type="Tunnel Control", capacity=50, tcp_incharge="Capt. Sharma", scheduled_departures='[]'),
            Checkpoint(name="TCP-4 Nashri", location_name="Chenani-Nashri North", lat=33.1276, long=75.3013, checkpoint_type="Tunnel Control", capacity=50, tcp_incharge="Capt. Verma", scheduled_departures='[]'),
            Checkpoint(name="TCP-5 Ramban", location_name="Chanderkote", lat=33.2093, long=75.2926, checkpoint_type="Police Post", capacity=80, tcp_incharge="ASI Khan", scheduled_departures='["0700", "1900"]'),
            Checkpoint(name="TCP-6 Banihal", location_name="Banihal Tunnel South", lat=33.4795, long=75.2017, checkpoint_type="TCP", capacity=120, tcp_incharge="Maj. Dhillon", scheduled_departures='["0500", "1100", "1700"]'),
            Checkpoint(name="TCP-7 Qazigund", location_name="Navyug Tunnel North", lat=33.5852, long=75.1768, checkpoint_type="Toll Gate", capacity=180, tcp_incharge="Insp. Farooq", scheduled_departures='["0600", "1400", "2200"]'),
            Checkpoint(name="TCP-8 Vessu", location_name="Vessu Mir Bazar", lat=33.6631, long=75.1463, checkpoint_type="Army TCP", capacity=300, tcp_incharge="Col. Rathore", scheduled_departures='["0600", "0900", "1500"]'),
            Checkpoint(name="TCP-9 Awantipora", location_name="Victor Force HQ", lat=33.9242, long=75.0173, checkpoint_type="Military Base", capacity=500, tcp_incharge="Brig. Mehta", scheduled_departures='["0800", "1600"]'),
            Checkpoint(name="TCP-10 Pantha Chowk", location_name="Srinagar Entry", lat=34.0456, long=74.8631, checkpoint_type="Police Post", capacity=100, tcp_incharge="DSP Wani", scheduled_departures='["0700", "1300", "1900"]'),

            # --- J&K: MUGHAL ROAD (Alternative) ---
            Checkpoint(name="TCP-11 Bafliaz", location_name="Poonch Entry", lat=33.6167, long=74.3500, checkpoint_type="TCP", capacity=60, tcp_incharge="ASI Lal", scheduled_departures='["0900", "1500"]'),
            Checkpoint(name="TCP-12 Pir Ki Gali", location_name="Mughal Road Summit", lat=33.6333, long=74.5667, checkpoint_type="Pass Control", capacity=30, tcp_incharge="Hav. Gurung", scheduled_departures='["1000", "1400"]'),
            Checkpoint(name="TCP-13 Shopian", location_name="Heerpora", lat=33.7000, long=74.8000, checkpoint_type="Police Post", capacity=80, tcp_incharge="SI Bhat", scheduled_departures='["0800", "1600"]'),

            # --- LADAKH: SRINAGAR-LEH HIGHWAY (NH-1) ---
            Checkpoint(name="TCP-14 Sonamarg", location_name="Sonamarg Market", lat=34.3000, long=75.2833, checkpoint_type="TCP", capacity=150, tcp_incharge="Maj. Kulkarni", scheduled_departures='["0500", "1300"]'),
            Checkpoint(name="TCP-15 Zojila", location_name="Zojila Pass Base", lat=34.2833, long=75.4833, checkpoint_type="Pass Control", capacity=40, tcp_incharge="Capt. Dorje", scheduled_departures='["0400", "1200"]'),
            Checkpoint(name="TCP-16 Drass", location_name="Kargil War Memorial", lat=34.4333, long=75.7667, checkpoint_type="Military Checkpoint", capacity=200, tcp_incharge="Lt. Col. Yadav", scheduled_departures='["0600", "1400"]'),
            Checkpoint(name="TCP-17 Kargil", location_name="Kargil Town", lat=34.5500, long=76.1333, checkpoint_type="Police Post", capacity=100, tcp_incharge="Insp. Tashi", scheduled_departures='["0700", "1500"]'),
            Checkpoint(name="TCP-18 Khaltsi", location_name="Indus Bridge", lat=34.3333, long=76.8833, checkpoint_type="Bridge Security", capacity=50, tcp_incharge="Sub. Angchuk", scheduled_departures='[]'),
            Checkpoint(name="TCP-19 Leh", location_name="Leh Gate", lat=34.1500, long=77.5667, checkpoint_type="TCP", capacity=250, tcp_incharge="DSP Stanzin", scheduled_departures='["0600", "1000", "1600"]'),

            # --- LADAKH: LEH-MANALI HIGHWAY ---
            Checkpoint(name="TCP-20 Upshi", location_name="Manali Junction", lat=33.8333, long=77.8167, checkpoint_type="Police Post", capacity=80, tcp_incharge="SI Rigzin", scheduled_departures='["0800", "1400"]'),
            Checkpoint(name="TCP-21 Pang", location_name="Army Camp", lat=33.1500, long=77.8000, checkpoint_type="Military Camp", capacity=300, tcp_incharge="Maj. Redwood", scheduled_departures='["0600", "1200"]'),
            Checkpoint(name="TCP-22 Sarchu", location_name="HP-Ladakh Border", lat=32.9167, long=77.5833, checkpoint_type="Border Checkpost", capacity=100, tcp_incharge="Insp. Negi", scheduled_departures='["0700", "1500"]'),

            # --- HIMACHAL PRADESH ---
            Checkpoint(name="TCP-23 Keylong", location_name="Lahaul HQ", lat=32.5667, long=77.0333, checkpoint_type="Police Post", capacity=90, tcp_incharge="ASI Thakur", scheduled_departures='["0800", "1600"]'),
            Checkpoint(name="TCP-24 Manali", location_name="Solang Valley", lat=32.2396, long=77.1887, checkpoint_type="Toll Gate", capacity=200, tcp_incharge="Insp. Sharma", scheduled_departures='["0600", "1400", "2000"]'),
            Checkpoint(name="TCP-25 Mandi", location_name="Mandi Town", lat=31.7000, long=76.9333, checkpoint_type="TCP", capacity=120, tcp_incharge="SI Verma", scheduled_departures='["0700", "1500"]'),
            Checkpoint(name="TCP-26 Pathankot", location_name="Punjab-HP Border", lat=32.2643, long=75.6527, checkpoint_type="Border Checkpost", capacity=250, tcp_incharge="Insp. Singh", scheduled_departures='["0600", "1200", "1800"]'),

            # --- PUNJAB/JAMMU BORDER ---
            Checkpoint(name="TCP-27 Lakhanpur", location_name="J&K-Punjab Border", lat=32.3667, long=75.6167, checkpoint_type="Toll Plaza/Excise", capacity=500, tcp_incharge="ETO Gupta", scheduled_departures='["0000", "0600", "1200", "1800"]'),
            Checkpoint(name="TCP-28 Samba", location_name="Samba Chowk", lat=32.5500, long=75.1167, checkpoint_type="Police Post", capacity=100, tcp_incharge="SI Balwinder", scheduled_departures='["0800", "1600"]'),

            # --- AIRPORTS & AIRBASES (Northern India) ---
            Checkpoint(name="Srinagar Airport (SXR)", location_name="Budgam, J&K", lat=34.0087, long=74.7740, checkpoint_type="International Airport", capacity=500, tcp_incharge="CISF", scheduled_departures='[]'),
            Checkpoint(name="Jammu Airport (IXJ)", location_name="Satwari, Jammu", lat=32.6891, long=74.8375, checkpoint_type="Civil Airport", capacity=300, tcp_incharge="CISF", scheduled_departures='[]'),
            Checkpoint(name="Leh Airport (IXL)", location_name="Leh, Ladakh", lat=34.1359, long=77.5465, checkpoint_type="Domestic Airport", capacity=150, tcp_incharge="Army/CISF", scheduled_departures='[]'),
            Checkpoint(name="Thoise Airbase", location_name="Nubra, Ladakh", lat=34.6465, long=77.3695, checkpoint_type="Military Airbase", capacity=200, tcp_incharge="IAF", scheduled_departures='[]'),
            Checkpoint(name="Awantipora AFS", location_name="Pulwama, J&K", lat=33.9317, long=74.9818, checkpoint_type="Military Airbase", capacity=400, tcp_incharge="IAF", scheduled_departures='[]'),
            Checkpoint(name="Udhampur AFS", location_name="Udhampur, J&K", lat=32.9095, long=75.1542, checkpoint_type="Military Airbase", capacity=300, tcp_incharge="IAF", scheduled_departures='[]'),
            Checkpoint(name="Pathankot AFS", location_name="Pathankot, Punjab", lat=32.2338, long=75.6341, checkpoint_type="Military Airbase", capacity=600, tcp_incharge="IAF", scheduled_departures='[]'),
            Checkpoint(name="Adampur AFS", location_name="Jalandhar, Punjab", lat=31.4337, long=75.7608, checkpoint_type="Military Airbase", capacity=300, tcp_incharge="IAF", scheduled_departures='[]'),
            Checkpoint(name="Amritsar Airport (ATQ)", location_name="Amritsar, Punjab", lat=31.7096, long=74.7973, checkpoint_type="International Airport", capacity=800, tcp_incharge="CISF", scheduled_departures='[]'),
            Checkpoint(name="Chandigarh Airport (IXC)", location_name="Mohali, Punjab", lat=30.6735, long=76.7885, checkpoint_type="International Airport", capacity=600, tcp_incharge="CISF", scheduled_departures='[]'),
            Checkpoint(name="Bhisiana AFS", location_name="Bhatinda, Punjab", lat=30.2709, long=74.7570, checkpoint_type="Military Airbase", capacity=400, tcp_incharge="IAF", scheduled_departures='[]'),
            Checkpoint(name="Halwara AFS", location_name="Ludhiana, Punjab", lat=30.7512, long=75.6267, checkpoint_type="Military Airbase", capacity=300, tcp_incharge="IAF", scheduled_departures='[]'),
            Checkpoint(name="Ambala AFS", location_name="Ambala, Haryana", lat=30.3692, long=76.8153, checkpoint_type="Military Airbase", capacity=500, tcp_incharge="IAF", scheduled_departures='[]'),
            Checkpoint(name="Gaggal Airport", location_name="Kangra, HP", lat=32.1652, long=76.2634, checkpoint_type="Domestic Airport", capacity=100, tcp_incharge="HP Police", scheduled_departures='[]'),
            Checkpoint(name="Bhuntar Airport", location_name="Kullu, HP", lat=31.8763, long=77.1541, checkpoint_type="Domestic Airport", capacity=100, tcp_incharge="HP Police", scheduled_departures='[]'),
            Checkpoint(name="Shimla Airport", location_name="Jubbarhatti, HP", lat=31.0818, long=77.0673, checkpoint_type="Domestic Airport", capacity=80, tcp_incharge="HP Police", scheduled_departures='[]'),
        ]
        db.add_all(checkpoints)
        print(f"Added {len(checkpoints)} Traffic Control Checkpoints.")

        await db.commit()
        print("Seeding Complete. High-Fidelity Routing Active.")

if __name__ == "__main__":
    asyncio.run(seed_data())
