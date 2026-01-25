import asyncio
import os
import sys

# Setup Path
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)

from app.core.database import engine
from sqlalchemy import text

async def migrate():
    print("Migrating Schema: Adding 'role' column to transport_assets...")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE transport_assets ADD COLUMN role VARCHAR DEFAULT 'CARGO'"))
            print("Successfully added 'role' column.")
        except Exception as e:
            if "duplicate column" in str(e):
                print("Column 'role' already exists. Skipping.")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
