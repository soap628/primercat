from app.schemas.gene_primer import Species
from app.services import gene_literature


class FakeDocument(dict):
    def __init__(self, *args, uid: str, **kwargs):
        super().__init__(*args, **kwargs)
        self.attributes = {"uid": uid}


def _run_loader(_namespace, *_parts, loader, **_kwargs):
    return loader()


def test_pubmed_literature_is_normalized_with_traceable_links(monkeypatch):
    observed = {}

    def fake_search(**kwargs):
        observed.update(kwargs)
        return {"Count": "42", "IdList": ["36184577"]}

    document = FakeDocument(
        {
            "Title": "Selection and validation of <i>reference genes</i> for qPCR.",
            "FullJournalName": "Immunology and cell biology",
            "PubDate": "2022 Nov",
            "Authors": [{"Name": "Ren G"}, {"Name": "Juhl M"}],
            "PubType": ["Journal Article", "Research Support, Non-U.S. Gov't"],
            "ArticleIds": [
                {"IdType": "pubmed", "Value": "36184577"},
                {"IdType": "pmc", "Value": "PMC9828170"},
                {"IdType": "doi", "Value": "10.1111/imcb.12590"},
            ],
        },
        uid="36184577",
    )

    monkeypatch.setattr(gene_literature, "cached_call", _run_loader)
    monkeypatch.setattr(gene_literature, "entrez_esearch", fake_search)
    monkeypatch.setattr(
        gene_literature,
        "entrez_esummary",
        lambda **_kwargs: {"DocumentSummarySet": {"DocumentSummary": [document]}},
    )

    result = gene_literature.query_gene_literature("GAPDH", Species.human)

    assert result.available is True
    assert result.total_results == 42
    assert result.ranking == gene_literature.RANKING
    assert observed["sort"] == "relevance"
    assert '"GAPDH"[Title/Abstract]' in observed["term"]
    assert '"Humans"[MeSH Terms]' in observed["term"]
    assert '"Review"[Publication Type]' in observed["term"]
    assert '"Journal Article"[Publication Type]' in observed["term"]
    assert "hasretractionin" in observed["term"]
    assert result.records[0].title == "Selection and validation of reference genes for qPCR."
    assert result.records[0].year == 2022
    assert result.records[0].authors == ["Ren G", "Juhl M"]
    assert result.records[0].pubmed_url == "https://pubmed.ncbi.nlm.nih.gov/36184577/"
    assert result.records[0].pmc_url == "https://pmc.ncbi.nlm.nih.gov/articles/PMC9828170/"
    assert result.records[0].doi_url == "https://doi.org/10.1111/imcb.12590"
    assert "may contain" in result.message


def test_pubmed_failure_returns_search_link_without_claiming_results(monkeypatch):
    monkeypatch.setattr(gene_literature, "cached_call", _run_loader)
    monkeypatch.setattr(
        gene_literature,
        "entrez_esearch",
        lambda **_kwargs: (_ for _ in ()).throw(TimeoutError("NCBI unavailable")),
    )

    result = gene_literature.query_gene_literature("Trp53", Species.mouse)

    assert result.available is False
    assert result.records == []
    assert "pubmed.ncbi.nlm.nih.gov" in result.search_url
    assert '"Mice"[MeSH Terms]' in result.search_query


def _document(pmid, journal="Test Journal", title="Gene expression measured using qPCR", types=None):
    return FakeDocument(
        {"Title": title, "FullJournalName": journal, "PubType": types or ["Journal Article"]},
        uid=pmid,
    )


def _query_tier(term):
    if '"Cell"[ta]' in term:
        return "cns"
    if '"Nature Methods"[ta]' in term:
        return "cns_family"
    if '"Nucleic Acids Research"[ta]' in term:
        return "specialist"
    return "other"


def _mock_searches(monkeypatch, matches, documents):
    observed = []

    def fake_search(**kwargs):
        observed.append(kwargs)
        result = matches[_query_tier(kwargs["term"])]
        if isinstance(result, Exception):
            raise result
        return {"Count": str(len(result)), "IdList": result}

    monkeypatch.setattr(gene_literature, "cached_call", _run_loader)
    monkeypatch.setattr(gene_literature, "entrez_esearch", fake_search)
    monkeypatch.setattr(
        gene_literature, "entrez_esummary",
        lambda **_kwargs: {"DocumentSummarySet": {"DocumentSummary": documents}},
    )
    return observed


def test_priority_queries_find_cns_articles_missing_from_broad_best_match(monkeypatch):
    observed = _mock_searches(monkeypatch, {
        "other": ["50", "40", "30", "60", "70", "80"],
        "cns": ["12", "11"],
        "cns_family": ["20", "30"],
        "specialist": ["40"],
    }, [
        _document("11", "Nature"), _document("40", "Nucleic acids research"),
        _document("50"), _document("30", "Molecular cell"),
        _document("12", "Cell"), _document("20", "Nature methods"),
        _document("60"), _document("70"), _document("80"),
    ])

    result = gene_literature.query_gene_literature("GAPDH", Species.human)

    assert [record.pmid for record in result.records] == ["12", "11", "20", "30", "40", "50"]
    assert [record.journal_tier for record in result.records] == [
        "cns", "cns", "cns_family", "cns_family", "specialist", "other",
    ]
    assert len(observed) == 4
    assert result.partial is False
    for query in observed:
        assert '"GAPDH"[Title/Abstract]' in query["term"]
        assert gene_literature.QPCR_QUERY in query["term"]
        assert '"Humans"[MeSH Terms]' in query["term"]
        assert query["sort"] == "relevance"


def test_empty_priority_tiers_fall_back_without_relaxing_relevance(monkeypatch):
    _mock_searches(monkeypatch, {
        "other": ["3", "1", "2"], "cns": [], "cns_family": [], "specialist": [],
    }, [_document("1"), _document("2"), _document("3")])

    result = gene_literature.query_gene_literature("Trp53", Species.mouse, limit=2)

    assert [record.pmid for record in result.records] == ["3", "1"]
    assert all(record.journal_tier == "other" for record in result.records)
    assert result.total_results == 3
    assert result.total_results_exact is True


def test_duplicate_pmids_keep_highest_tier_and_relevance_order(monkeypatch):
    _mock_searches(monkeypatch, {
        "other": ["1", "1", "2", "3", "4"],
        "cns": ["2", "2", "1"], "cns_family": ["2", "3"], "specialist": ["3", "4"],
    }, [_document("4"), _document("3"), _document("1"), _document("2")])

    result = gene_literature.query_gene_literature("GAPDH", Species.human)

    assert [(record.pmid, record.journal_tier) for record in result.records] == [
        ("2", "cns"), ("1", "cns"), ("3", "cns_family"), ("4", "specialist"),
    ]


def test_summary_excludes_retractions_and_reviews_then_fills_from_fallback(monkeypatch):
    _mock_searches(monkeypatch, {
        "other": ["1", "2", "3", "4", "5"],
        "cns": ["1", "2"], "cns_family": ["3"], "specialist": [],
    }, [
        _document("1", types=["Journal Article", "Retracted Publication"]),
        _document("2", types=["Review"]),
        _document("3", title="Retraction Note: Gene expression measured using qPCR"),
        _document("4"), _document("5"),
    ])

    result = gene_literature.query_gene_literature("GAPDH", Species.human, limit=2)

    assert [record.pmid for record in result.records] == ["4", "5"]


def test_failed_priority_query_preserves_available_results_and_does_not_cache_partial(monkeypatch):
    _mock_searches(monkeypatch, {
        "other": ["1", "2"], "cns": TimeoutError("NCBI busy"),
        "cns_family": ["2"], "specialist": [],
    }, [_document("1"), _document("2")])
    observed = {}

    def capture_cache(_namespace, *_parts, loader, should_cache):
        result = loader()
        observed["cacheable"] = should_cache(result)
        return result

    monkeypatch.setattr(gene_literature, "cached_call", capture_cache)
    result = gene_literature.query_gene_literature("GAPDH", Species.human)

    assert result.available is True
    assert result.partial is True
    assert result.total_results_exact is True
    assert [record.pmid for record in result.records] == ["2", "1"]
    assert observed["cacheable"] is False


def test_broad_query_failure_does_not_report_a_false_zero_match_count(monkeypatch):
    _mock_searches(monkeypatch, {
        "other": TimeoutError("NCBI busy"), "cns": ["1"], "cns_family": [], "specialist": [],
    }, [_document("1", "Cell")])

    result = gene_literature.query_gene_literature("GAPDH", Species.human)

    assert result.available is True
    assert result.partial is True
    assert result.total_results_exact is False
    assert [record.pmid for record in result.records] == ["1"]


def test_summary_failure_returns_unavailable_with_manual_search_link(monkeypatch):
    _mock_searches(monkeypatch, {
        "other": ["1"], "cns": [], "cns_family": [], "specialist": [],
    }, [])
    monkeypatch.setattr(
        gene_literature, "entrez_esummary",
        lambda **_kwargs: (_ for _ in ()).throw(TimeoutError("NCBI busy")),
    )

    result = gene_literature.query_gene_literature("GAPDH", Species.human)

    assert result.available is False
    assert result.records == []
    assert "pubmed.ncbi.nlm.nih.gov" in result.search_url
