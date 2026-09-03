import asyncio

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core import rate_limit


def _request(path: str, ip: str = "127.0.0.1") -> Request:
    return Request({
        "type": "http",
        "method": "POST",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [],
        "client": (ip, 12345),
        "server": ("testserver", 80),
    })


def test_rate_limits_are_isolated_by_route(monkeypatch):
    monkeypatch.setattr(rate_limit, "_buckets", {})
    design_check = rate_limit.rate_limit_dependency(rpm=1).dependency
    validation_check = rate_limit.rate_limit_dependency(rpm=3).dependency

    asyncio.run(design_check(_request("/api/v1/gene-primer/design")))
    asyncio.run(validation_check(_request("/api/v1/gene-primer/validate-known")))
    asyncio.run(validation_check(_request("/api/v1/gene-primer/validate-known")))
    asyncio.run(validation_check(_request("/api/v1/gene-primer/validate-known")))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(design_check(_request("/api/v1/gene-primer/design")))
    assert exc.value.status_code == 429


def test_forwarded_ip_uses_the_first_address(monkeypatch):
    monkeypatch.setattr(rate_limit, "_buckets", {})
    check = rate_limit.rate_limit_dependency(rpm=1).dependency
    scope = _request("/limited").scope
    scope["headers"] = [(b"x-forwarded-for", b"203.0.113.10, 10.0.0.2")]

    asyncio.run(check(Request(scope)))

    assert ("203.0.113.10", "POST:/limited") in rate_limit._buckets
