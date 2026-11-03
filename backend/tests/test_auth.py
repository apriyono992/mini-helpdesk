"""
Auth endpoint tests: register, login, refresh, me, password not leaked.
"""
import pytest
from httpx import AsyncClient

from tests.conftest import _register, _login


@pytest.mark.asyncio
async def test_register_business_returns_tokens(client: AsyncClient):
    r = await client.post("/auth/registerbusiness", json={
        "business_name": "AuthTestBiz",
        "full_name": "Auth Admin",
        "email": "auth-admin@test.com",
        "password": "secret123",
    })
    assert r.status_code == 201
    body = r.json()
    assert "access_token" in body
    assert "refresh_token" in body
    # Password must NOT appear anywhere in response
    assert "password" not in str(body)
    assert "password_hash" not in str(body)


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    await _register(client, "LoginBiz", "login-test@biz.com")
    r = await client.post("/auth/login", json={"email": "login-test@biz.com", "password": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_no_password(client: AsyncClient):
    tokens = await _register(client, "MeBiz", "me-test@biz.com")
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 200
    body = r.json()
    assert "password" not in body
    assert "password_hash" not in body


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    tokens = await _register(client, "RefreshBiz", "refresh-test@biz.com")
    r = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200
    assert "access_token" in r.json()


@pytest.mark.asyncio
async def test_access_token_rejected_as_refresh(client: AsyncClient):
    tokens = await _register(client, "BadRefreshBiz", "bad-refresh@biz.com")
    r = await client.post("/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert r.status_code == 401
