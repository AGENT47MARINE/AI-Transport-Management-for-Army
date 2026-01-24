
import asyncio
import sys
import os
import random
from datetime import datetime, timedelta
from sqlalchemy import select

# Add the backend root directory to sys.path
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)

from app.core.database import SessionLocal
from app.models.checkpoint import Checkpoint
from app.models.asset import TransportAsset
from app.models.logistics import LogisticsIndent
from app.models.convoy import Convoy

async def seed_tcp_data():
    print("Seeding TCP Dashboard Data...")
    
    async with SessionLocal() as db:
        # 1. Get our Target TCP (Nagrota/Udhampur - ID 1)
        # If not sure of ID, we'll fetch the first one or create it.
        result = await db.execute(select(Checkpoint))
        checkpoints = result.scalars().all()
        
        if not checkpoints:
            print("No checkpoints found. Seeding basic TCPs first...")
            # Create a dummy TCP if none exist
            tcp = Checkpoint(
                name="TCP-1 Nagrota",
                location_name="Nagrota Toll",
                lat=32.77,
                long=74.90,
                checkpoint_type="Toll Gate",
                capacity=50,
                tcp_incharge="Maj. Sharma"
            )
            db.add(tcp)
            await db.commit()
            await db.refresh(tcp)
            target_tcp = tcp
        else:
            # Prefer Nagrota if exists, else first
            target_tcp = next((cp for cp in checkpoints if "Nagrota" in cp.name), checkpoints[0])
            
        print(f"Targeting TCP: {target_tcp.name} (ID: {target_tcp.id})")

        # 2. Seed Idle Assets (Parked at this TCP)
        # We'll add a few vehicles that are "Available" and parked here.
        idle_assets_data = [
            {"name": "Rec-Veh-04", "type": "RECOVERY", "cap": 10},
            {"name": "ALS-Res-01", "type": "TRUCK", "cap": 2.5},
            {"name": "Amb-Med-09", "type": "AMBULANCE", "cap": 0}
        ]
        
        for asset_d in idle_assets_data:
            # Check if exists to avoid dupes
            res = await db.execute(select(TransportAsset).where(TransportAsset.name == asset_d["name"]))
            if res.scalars().first(): continue

            asset = TransportAsset(
                name=asset_d["name"],
                asset_type=asset_d["type"],
                capacity_tons=asset_d["cap"],
                is_available=True,
                current_checkpoint_id=target_tcp.id,
                current_lat=target_tcp.lat,
                current_long=target_tcp.long,
                fuel_status=90.0,
                driver_name="Pvt. Singh"
            )
            db.add(asset)
        
        # 3. Get Active Convoys for Logistics Requests
        res = await db.execute(select(Convoy))
        convoys = res.scalars().all()
        
        if not convoys:
            print("No convoys found to attach requests to.")
        else:
            # 4. Seed Logistics Intimations (Standard)
            # Pick a convoy
            c1 = convoys[0]
            indent1 = LogisticsIndent(
                convoy_id=c1.id,
                location_id=target_tcp.id,
                request_type="STANDARD",
                status="PENDING",
                fuel_diesel_liters=500.0,
                accommodation_personnel=45,
                arrival_time_est=datetime.utcnow() + timedelta(hours=2)
            )
            db.add(indent1)
            
            # 5. Seed Overstay Requests
            # Pick another convoy if possible
            c2 = convoys[1] if len(convoys) > 1 else convoys[0]
            indent2 = LogisticsIndent(
                convoy_id=c2.id,
                location_id=target_tcp.id,
                request_type="OVERSTAY",
                status="PENDING",
                remarks="Vehicle breakdown (ALS-09), requiring 6hr halt for repairs.",
                arrival_time_est=datetime.utcnow()
            )
            db.add(indent2)

        await db.commit()
        print("Seeding Complete!")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_tcp_data())
