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
Entrez.timeout = 60  # Entrez HTTP 请求超时（秒）
if settings.NCBI_API_KEY:
    Entrez.api_key = settings.NCBI_API_KEY

# ── Cache backend selection ──────────────────────────────────────────────────
# If NCBI_CACHE_DIR is set, use diskcache (shared across all workers/processes).
# Otherwise fall back to the in-process OrderedDict LRU cache (single-worker only).

_disk_cache: Any = None  # diskcache.Cache instance, if enabled

if settings.NCBI_CACHE_DIR:
    try:
        import diskcache  # type: ignore[import]
        _disk_cache = diskcache.Cache(
            settings.NCBI_CACHE_DIR,
            size_limit=512 * 1024 * 1024,  # 512 MB on-disk limit
        )
    except Exception:
        _disk_cache = None

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
    key_str = ":".join(str(p) for p in key)

    # ── diskcache path (multi-worker) ────────────────────────────────────────
    if _disk_cache is not None:
        cached = _disk_cache.get(key_str)
        if cached is not None:
            return _deepcopy(cached) if isinstance(cached, (list, dict)) else cached
        value = loader()
        if should_cache is None or should_cache(value):
            _disk_cache.set(key_str, value, expire=settings.NCBI_CACHE_TTL_SECONDS)
        return value

    # ── in-process LRU path (single-worker fallback) ─────────────────────────
    now = time.time()
    with _cache_lock:
        _purge_expired(now)
        cached_entry = _cache.get(key)
        if cached_entry is not None:
            _, value = cached_entry
            _cache.move_to_end(key)
            return _deepcopy(value) if isinstance(value, (list, dict)) else value

    value = loader()
    if should_cache is not None and not should_cache(value):
        return value

    with _cache_lock:
        _cache[key] = (time.time(), _deepcopy(value) if isinstance(value, (list, dict)) else value)
        _cache.move_to_end(key)
        while len(_cache) > settings.NCBI_CACHE_MAXSIZE:
            _cache.popitem(last=False)

    return _deepcopy(value) if isinstance(value, (list, dict)) else value


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


def run_qblast(retries: int = 2, retry_delay: float = 1.5, **kwargs: Any) -> list[Any]:
    """
    Submit a BLAST query via NCBI WWW BLAST and parse the XML results.

    Retries up to `retries` times on transient errors (network timeouts,
    NCBI 5xx responses). Each retry waits `retry_delay` seconds.
    Raises the last exception if all attempts fail.
    """
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            throttle_ncbi()
            handle = NCBIWWW.qblast(**kwargs)
            try:
                return list(NCBIXML.parse(handle))
            finally:
                handle.close()
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                time.sleep(retry_delay)
    raise last_exc  # type: ignore[misc]
