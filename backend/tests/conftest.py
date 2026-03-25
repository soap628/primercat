from pathlib import Path
import sys

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture(autouse=True)
def clear_ncbi_cache():
    from app.services import ncbi_client

    ncbi_client._cache.clear()
    ncbi_client._last_request_at = 0.0
    yield
    ncbi_client._cache.clear()
    ncbi_client._last_request_at = 0.0
