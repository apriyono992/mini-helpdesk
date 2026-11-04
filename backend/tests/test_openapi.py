import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_openapi_schema(client: AsyncClient):
    res = await client.get("/openapi.json")
    assert res.status_code == 200
    data = res.json()

    assert data["info"]["title"] == "HelpDesk Mini API"
    assert data["info"]["version"] == "1.0.0"

    tag_names = {t["name"] for t in data.get("tags", [])}
    assert {"auth", "users", "tickets", "categories", "websocket"}.issubset(tag_names)

    paths = data.get("paths", {})
    assert "/auth/login" in paths
    assert "/auth/registerbusiness" in paths
    assert "/tickets" in paths
    assert "/categories" in paths

    # Check summaries exist
    assert "summary" in paths["/auth/login"]["post"]
    assert "summary" in paths["/tickets"]["post"]
    assert "summary" in paths["/tickets"]["get"]


@pytest.mark.asyncio
async def test_swagger_docs_accessible(client: AsyncClient):
    res = await client.get("/docs")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_cors_origin_from_settings(client: AsyncClient):
    res = await client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert res.headers.get("access-control-allow-credentials") == "true"

