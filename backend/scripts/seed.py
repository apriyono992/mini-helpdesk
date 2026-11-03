"""
Seed: 2 businesses × (1 Admin, 1 Agent, 2 Customer)
Run: python scripts/seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.business import Business
from app.models.user import User, UserRole

BUSINESSES = [
    {
        "name": "Acme Corp",
        "users": [
            {"email": "admin@acme.com", "full_name": "Acme Admin", "password": "admin1234", "role": UserRole.admin},
            {"email": "agent@acme.com", "full_name": "Acme Agent", "password": "agent1234", "role": UserRole.agent},
            {"email": "cust1@acme.com", "full_name": "Acme Customer 1", "password": "cust1234", "role": UserRole.customer},
            {"email": "cust2@acme.com", "full_name": "Acme Customer 2", "password": "cust1234", "role": UserRole.customer},
        ],
    },
    {
        "name": "Globex Inc",
        "users": [
            {"email": "admin@globex.com", "full_name": "Globex Admin", "password": "admin1234", "role": UserRole.admin},
            {"email": "agent@globex.com", "full_name": "Globex Agent", "password": "agent1234", "role": UserRole.agent},
            {"email": "cust1@globex.com", "full_name": "Globex Customer 1", "password": "cust1234", "role": UserRole.customer},
            {"email": "cust2@globex.com", "full_name": "Globex Customer 2", "password": "cust1234", "role": UserRole.customer},
        ],
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for biz_data in BUSINESSES:
            biz = Business(name=biz_data["name"])
            session.add(biz)
            await session.flush()

            for u in biz_data["users"]:
                session.add(User(
                    business_id=biz.id,
                    email=u["email"],
                    full_name=u["full_name"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                ))

        await session.commit()
    print("Seed complete.")
    for b in BUSINESSES:
        print(f"\n[{b['name']}]")
        for u in b["users"]:
            print(f"  {u['role'].value:8s}  {u['email']}  /  {u['password']}")


if __name__ == "__main__":
    asyncio.run(seed())
