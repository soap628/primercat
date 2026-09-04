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
    assert result.ranking == "PubMed Best Match"
    assert observed["sort"] == "relevance"
    assert '"GAPDH"[Title/Abstract]' in observed["term"]
    assert '"Humans"[MeSH Terms]' in observed["term"]
    assert "NOT Review[Publication Type]" in observed["term"]
    assert result.records[0].title == "Selection and validation of reference genes for qPCR."
    assert result.records[0].year == 2022
    assert result.records[0].authors == ["Ren G", "Juhl M"]
    assert result.records[0].pubmed_url == "https://pubmed.ncbi.nlm.nih.gov/36184577/"
    assert result.records[0].pmc_url == "https://pmc.ncbi.nlm.nih.gov/articles/PMC9828170/"
    assert result.records[0].doi_url == "https://doi.org/10.1111/imcb.12590"


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
