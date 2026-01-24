
import asyncio
import sys
import os
from sqlalchemy import select

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def seed_users():
    async with SessionLocal() as db:
        # Check if users exist
        result = await db.execute(select(User).where(User.username == "commander"))
        if not result.scalars().first():
            print("Creating 'commander' user...")
            u1 = User(
                username="commander",
                hashed_password=get_password_hash("pass123"),
                role="COMMANDER"
            )
            db.add(u1)
        
        result2 = await db.execute(select(User).where(User.username == "tcpadmin"))
        if not result2.scalars().first():
             print("Creating 'tcpadmin' user...")
             u2 = User(
                username="tcpadmin",
                hashed_password=get_password_hash("pass123"),
                role="TCP_INCHARGE"
            )
             db.add(u2)
        
        await db.commit()
        print("Users seeded.")

if __name__ == "__main__":
    asyncio.run(seed_users())
