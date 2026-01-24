
import asyncio
import sys
import os
from sqlalchemy import text

backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)

from app.core.database import SessionLocal

async def migrate_db():
    print("Migrating Database Schema...")
    async with SessionLocal() as db:
        try:
            # 1. TransportAsset: current_checkpoint_id
            print("Adding current_checkpoint_id to transport_assets...")
            await db.execute(text("ALTER TABLE transport_assets ADD COLUMN IF NOT EXISTS current_checkpoint_id INTEGER REFERENCES checkpoints(id);"))
            
            # 2. LogisticsIndent: request_type & remarks
            print("Adding request_type & remarks to LogisticsIndent...")
            await db.execute(text("ALTER TABLE logistics_indents ADD COLUMN IF NOT EXISTS request_type VARCHAR DEFAULT 'STANDARD';"))
            await db.execute(text("ALTER TABLE logistics_indents ADD COLUMN IF NOT EXISTS remarks VARCHAR;"))
            
            await db.commit()
            print("Migration Successful!")
        except Exception as e:
            print(f"Migration Failed: {e}")
            await db.rollback()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate_db())
