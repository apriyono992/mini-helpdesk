import pytest
from httpx import AsyncClient

from tests.conftest import _register, _create_user, _login


@pytest.fixture(scope="module")
async def setup(client):
    tokens_a = await _register(client, "CatBizA", "admin_a@cat.com")
    admin_token_a = tokens_a["access_token"]
    await _create_user(client, admin_token_a, "cust_a@cat.com", "customer")
    cust_tokens_a = await _login(client, "cust_a@cat.com")
    cust_token_a = cust_tokens_a["access_token"]

    tokens_b = await _register(client, "CatBizB", "admin_b@cat.com")
    admin_token_b = tokens_b["access_token"]

    return {
        "admin_a": admin_token_a,
        "cust_a": cust_token_a,
        "admin_b": admin_token_b,
    }


@pytest.mark.asyncio
async def test_admin_create_and_list_category(client: AsyncClient, setup):
    r = await client.post(
        "/categories",
        json={"name": "Billing"},
        headers={"Authorization": f"Bearer {setup['admin_a']}"},
    )
    assert r.status_code == 201
    cat = r.json()
    assert cat["name"] == "Billing"

    r_list = await client.get(
        "/categories",
        headers={"Authorization": f"Bearer {setup['admin_a']}"},
    )
    assert r_list.status_code == 200
    names = [c["name"] for c in r_list.json()]
    assert "Billing" in names


@pytest.mark.asyncio
async def test_customer_can_list_but_cannot_create(client: AsyncClient, setup):
    # Customer can list
    r_list = await client.get(
        "/categories",
        headers={"Authorization": f"Bearer {setup['cust_a']}"},
    )
    assert r_list.status_code == 200

    # Customer cannot create
    r_create = await client.post(
        "/categories",
        json={"name": "Hacking"},
        headers={"Authorization": f"Bearer {setup['cust_a']}"},
    )
    assert r_create.status_code == 403


@pytest.mark.asyncio
async def test_admin_update_and_delete_category(client: AsyncClient, setup):
    # Create category to update
    r_create = await client.post(
        "/categories",
        json={"name": "To Update"},
        headers={"Authorization": f"Bearer {setup['admin_a']}"},
    )
    cat_id = r_create.json()["id"]

    # Update
    r_update = await client.patch(
        f"/categories/{cat_id}",
        json={"name": "Updated Name"},
        headers={"Authorization": f"Bearer {setup['admin_a']}"},
    )
    assert r_update.status_code == 200
    assert r_update.json()["name"] == "Updated Name"

    # Delete
    r_del = await client.delete(
        f"/categories/{cat_id}",
        headers={"Authorization": f"Bearer {setup['admin_a']}"},
    )
    assert r_del.status_code == 204


@pytest.mark.asyncio
async def test_category_isolation_between_businesses(client: AsyncClient, setup):
    # Biz A creates category
    r_a = await client.post(
        "/categories",
        json={"name": "BizA Only"},
        headers={"Authorization": f"Bearer {setup['admin_a']}"},
    )
    cat_id_a = r_a.json()["id"]

    # Biz B cannot see it in list
    r_b_list = await client.get(
        "/categories",
        headers={"Authorization": f"Bearer {setup['admin_b']}"},
    )
    names_b = [c["name"] for c in r_b_list.json()]
    assert "BizA Only" not in names_b

    # Biz B cannot update Biz A's category -> 404
    r_b_update = await client.patch(
        f"/categories/{cat_id_a}",
        json={"name": "Hijacked"},
        headers={"Authorization": f"Bearer {setup['admin_b']}"},
    )
    assert r_b_update.status_code == 404

    # Biz B cannot delete Biz A's category -> 404
    r_b_del = await client.delete(
        f"/categories/{cat_id_a}",
        headers={"Authorization": f"Bearer {setup['admin_b']}"},
    )
    assert r_b_del.status_code == 404


@pytest.mark.asyncio
async def test_duplicate_category_in_same_business_conflict(client: AsyncClient, setup):
    await client.post(
        "/categories",
        json={"name": "Network"},
        headers={"Authorization": f"Bearer {setup['admin_a']}"},
    )
    r_dup = await client.post(
        "/categories",
        json={"name": "Network"},
        headers={"Authorization": f"Bearer {setup['admin_a']}"},
    )
    assert r_dup.status_code == 409
