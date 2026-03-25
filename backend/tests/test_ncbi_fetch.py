from app.services.ncbi_fetch import fetch_gene_info


def test_fetch_gene_info_reuses_cached_wrappers(monkeypatch):
    from app.services import ncbi_fetch

    calls = {"search": 0, "summary": 0}

    def fake_esearch(**kwargs):
        calls["search"] += 1
        assert kwargs["db"] == "gene"
        return {"IdList": ["7157"]}

    def fake_esummary(**kwargs):
        calls["summary"] += 1
        assert kwargs["db"] == "gene"
        return {
            "DocumentSummarySet": {
                "DocumentSummary": [
                    {
                        "Description": "tumor protein p53",
                        "Summary": "guardian of the genome",
                        "Chromosome": "17",
                        "MapLocation": "17p13.1",
                        "OtherAliases": "P53",
                    }
                ]
            }
        }

    monkeypatch.setattr(ncbi_fetch, "entrez_esearch", fake_esearch)
    monkeypatch.setattr(ncbi_fetch, "entrez_esummary", fake_esummary)

    first = fetch_gene_info("TP53", "human")
    second = fetch_gene_info("TP53", "human")

    assert calls == {"search": 1, "summary": 1}
    assert first.gene_symbol == "TP53"
    assert second.chromosome == "17"
