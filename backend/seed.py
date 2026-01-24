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
        print("Added Precision Route.")

        # Commit route first to get ID
        await db.flush()

        # Convoy
        convoy1 = Convoy(name="Air-Link-Supply-01", start_location="Jammu Airport", end_location="Srinagar Airport", status="IN_TRANSIT", start_time=datetime.utcnow(), route_id=route_main.id)
        db.add(convoy1)
        
        # Commit convoy to get ID
        await db.flush()

        # Calculate mid-point for asset placement
        mid_idx = len(waypoints_high_fidelity) // 2
        mid_pt = waypoints_high_fidelity[mid_idx]

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

            # Assets In Transit (Assigned to Convoy) - 3 Vehicles as requested
            TransportAsset(name="CVY-Alpha Lead", asset_type="Ashok Leyland Stallion", capacity_tons=2.5, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=65.0, convoy_id=convoy1.id, driver_name="Nk. Gurdeep", personnel_count=12),
            TransportAsset(name="CVY-Alpha Mid", asset_type="Tatra 8x8", capacity_tons=10.0, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=62.0, convoy_id=convoy1.id, driver_name="Hav. Mahendra", personnel_count=4),
            TransportAsset(name="CVY-Alpha Rear", asset_type="Tatra 6x6", capacity_tons=8.0, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=60.0, convoy_id=convoy1.id, driver_name="Sep. John Doe", personnel_count=2),
            
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
        ]
        db.add_all(checkpoints)
        print(f"Added {len(checkpoints)} Traffic Control Checkpoints.")

        await db.commit()
        print("Seeding Complete. High-Fidelity Routing Active.")

if __name__ == "__main__":
    asyncio.run(seed_data())
