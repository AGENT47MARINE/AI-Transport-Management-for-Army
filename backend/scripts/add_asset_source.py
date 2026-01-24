
import asyncio
import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine

async def add_column():
    async with engine.begin() as conn:
        try:
            # Check if column exists (PostgreSQL specific, but generic enough for now)
            # Or just try adding it and ignore error
            print("Attempting to add 'asset_source' column to 'transport_assets'...")
            await conn.execute(text("ALTER TABLE transport_assets ADD COLUMN asset_source VARCHAR DEFAULT 'MILITARY'"))
            print("Column added successfully.")
        except Exception as e:
            if "duplicate column" in str(e):
                print("Column 'asset_source' already exists.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
