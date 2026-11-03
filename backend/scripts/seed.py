"""
Seed: 2 businesses × (1 Admin, 1 Agent, 2 Customer) + default master categories.
Idempotent: safe to run multiple times without duplicating or overwriting existing data.
Run: python scripts/seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.business import Business
from app.models.user import User, UserRole
from app.models.category import Category

BUSINESSES = [
    {
        "name": "Acme Corp",
        "categories": ["Technical Support", "Billing", "General Inquiry"],
        "users": [
            {"email": "admin@acme.com", "full_name": "Acme Admin", "password": "admin1234", "role": UserRole.admin},
            {"email": "agent@acme.com", "full_name": "Acme Agent", "password": "agent1234", "role": UserRole.agent},
            {"email": "cust1@acme.com", "full_name": "Acme Customer 1", "password": "cust1234", "role": UserRole.customer},
            {"email": "cust2@acme.com", "full_name": "Acme Customer 2", "password": "cust1234", "role": UserRole.customer},
        ],
    },
    {
        "name": "Globex Inc",
        "categories": ["Technical Support", "Billing", "Product Feedback"],
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
            # 1. Get or create business
            res_biz = await session.execute(
                select(Business).where(Business.name == biz_data["name"])
            )
            biz = res_biz.scalar_one_or_none()
            if not biz:
                biz = Business(name=biz_data["name"])
                session.add(biz)
                await session.flush()

            # 2. Add categories if not exist
            for cat_name in biz_data.get("categories", []):
                res_cat = await session.execute(
                    select(Category).where(
                        Category.business_id == biz.id,
                        Category.name == cat_name,
                    )
                )
                if not res_cat.scalar_one_or_none():
                    session.add(Category(business_id=biz.id, name=cat_name))

            # 3. Add users if not exist
            for u in biz_data["users"]:
                res_user = await session.execute(
                    select(User).where(
                        User.business_id == biz.id,
                        User.email == u["email"],
                    )
                )
                if not res_user.scalar_one_or_none():
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
