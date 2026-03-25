from app.services.ncbi_client import cached_call


def test_cached_call_caches_successful_result_and_returns_copy():
    calls = {"count": 0}

    def loader():
        calls["count"] += 1
        return {"hits": [{"value": calls["count"]}]}

    first = cached_call("unit_test", "cache", loader=loader)
    first["hits"][0]["value"] = 999
    second = cached_call("unit_test", "cache", loader=loader)

    assert calls["count"] == 1
    assert second["hits"][0]["value"] == 1


def test_cached_call_skips_cache_when_predicate_returns_false():
    calls = {"count": 0}

    def loader():
        calls["count"] += 1
        return {"ok": False, "attempt": calls["count"]}

    first = cached_call(
        "unit_test",
        "skip",
        loader=loader,
        should_cache=lambda value: value["ok"],
    )
    second = cached_call(
        "unit_test",
        "skip",
        loader=loader,
        should_cache=lambda value: value["ok"],
    )

    assert calls["count"] == 2
    assert first["attempt"] == 1
    assert second["attempt"] == 2
