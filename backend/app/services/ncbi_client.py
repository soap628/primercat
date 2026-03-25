import copy
import time
from collections import OrderedDict
from threading import Lock
from typing import Any, Callable, Hashable

from Bio import Entrez, SeqIO
from Bio.Blast import NCBIWWW, NCBIXML

from app.core.config import settings

Entrez.email = settings.NCBI_EMAIL or "primercat@example.com"
Entrez.tool = settings.NCBI_TOOL
Entrez.timeout = 30  # Entrez HTTP 请求超时（秒）
if settings.NCBI_API_KEY:
    Entrez.api_key = settings.NCBI_API_KEY

_cache_lock = Lock()
_cache: "OrderedDict[tuple[Hashable, ...], tuple[float, Any]]" = OrderedDict()
_rate_lock = Lock()
_last_request_at = 0.0


def _deepcopy(value: Any) -> Any:
    return copy.deepcopy(value)


def _purge_expired(now: float) -> None:
    expired = [
        key for key, (created_at, _) in _cache.items()
        if now - created_at > settings.NCBI_CACHE_TTL_SECONDS
    ]
    for key in expired:
        _cache.pop(key, None)


def cached_call(
    namespace: str,
    *parts: Hashable,
    loader: Callable[[], Any],
    should_cache: Callable[[Any], bool] | None = None,
) -> Any:
    key = (namespace, *parts)
    now = time.time()
    with _cache_lock:
        _purge_expired(now)
        cached = _cache.get(key)
        if cached is not None:
            _, value = cached
            _cache.move_to_end(key)
            return _deepcopy(value)

    value = loader()
    if should_cache is not None and not should_cache(value):
        return value

    with _cache_lock:
        _cache[key] = (time.time(), _deepcopy(value))
        _cache.move_to_end(key)
        while len(_cache) > settings.NCBI_CACHE_MAXSIZE:
            _cache.popitem(last=False)

    return _deepcopy(value)


def throttle_ncbi() -> None:
    global _last_request_at
    with _rate_lock:
        now = time.monotonic()
        wait = (_last_request_at + settings.ncbi_request_interval_seconds) - now
        if wait > 0:
            # 预占下一个时间槽，然后在锁外等待，避免其他线程长时间阻塞
            _last_request_at = now + wait
        else:
            _last_request_at = now
            wait = 0.0
    if wait > 0:
        time.sleep(wait)


def entrez_esearch(**kwargs: Any) -> Any:
    throttle_ncbi()
    handle = Entrez.esearch(**kwargs)
    try:
        return Entrez.read(handle)
    finally:
        handle.close()


def entrez_esummary(**kwargs: Any) -> Any:
    throttle_ncbi()
    handle = Entrez.esummary(**kwargs)
    try:
        return Entrez.read(handle)
    finally:
        handle.close()


def entrez_fetch_genbank_records(**kwargs: Any) -> list[Any]:
    throttle_ncbi()
    handle = Entrez.efetch(**kwargs)
    try:
        return list(SeqIO.parse(handle, "genbank"))
    finally:
        handle.close()


def run_qblast(**kwargs: Any) -> list[Any]:
    throttle_ncbi()
    handle = NCBIWWW.qblast(**kwargs)
    try:
        return list(NCBIXML.parse(handle))
    finally:
        handle.close()
