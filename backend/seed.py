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

        # Calculate mid-point for asset placement
        mid_idx = len(waypoints_high_fidelity) // 2
        mid_pt = waypoints_high_fidelity[mid_idx]

        # Assets
        assets = [
            TransportAsset(name="IXJ-01 (Heavy)", asset_type="Tatra 8x8", capacity_tons=10.0, is_available=True, current_lat=start_pt[0], current_long=start_pt[1], fuel_status=100.0),
            TransportAsset(name="SXR-01 (Rapid)", asset_type="Maruti Gypsy", capacity_tons=0.5, is_available=True, current_lat=end_pt[0], current_long=end_pt[1], fuel_status=100.0),
            TransportAsset(name="CVY-Alpha Lead", asset_type="Ashok Leyland Stallion", capacity_tons=2.5, is_available=False, current_lat=mid_pt[0], current_long=mid_pt[1], fuel_status=65.0),
        ]
        db.add_all(assets)

        convoy1 = Convoy(name="Air-Link-Supply-01", start_location="Jammu Airport", end_location="Srinagar Airport", status="IN_TRANSIT", start_time=datetime.utcnow())
        db.add(convoy1)

        await db.commit()
        print("Seeding Complete. High-Fidelity Routing Active.")

if __name__ == "__main__":
    asyncio.run(seed_data())
