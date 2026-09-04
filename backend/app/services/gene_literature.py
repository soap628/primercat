import html
import logging
import re
from urllib.parse import urlencode

from app.schemas.gene_primer import (
    GeneLiteratureRecord,
    GeneLiteratureResponse,
    Species,
)
from app.services.ncbi_client import cached_call, entrez_esearch, entrez_esummary

logger = logging.getLogger("uvicorn")

QPCR_QUERY = (
    '("Real-Time Polymerase Chain Reaction"[MeSH Terms] '
    'OR qPCR[Title/Abstract] OR RT-qPCR[Title/Abstract] '
    'OR "quantitative PCR"[Title/Abstract] '
    'OR "real-time PCR"[Title/Abstract])'
)
SPECIES_QUERY = {
    Species.human: '"Humans"[MeSH Terms]',
    Species.mouse: '"Mice"[MeSH Terms]',
}


def _clean_text(value: object) -> str:
    text = html.unescape(str(value or ""))
    return re.sub(r"<[^>]+>", "", text).strip()


def _article_identifiers(document: object) -> dict[str, str]:
    identifiers: dict[str, str] = {}
    for item in document.get("ArticleIds", []):
        id_type = str(item.get("IdType") or "").lower()
        value = str(item.get("Value") or "").strip()
        if id_type and value:
            identifiers[id_type] = value
    return identifiers


def _record_from_summary(document: object) -> GeneLiteratureRecord | None:
    identifiers = _article_identifiers(document)
    attributes = getattr(document, "attributes", {})
    pmid = identifiers.get("pubmed") or str(attributes.get("uid") or "").strip()
    title = _clean_text(document.get("Title"))
    if not pmid or not title:
        return None

    publication_date = _clean_text(document.get("PubDate") or document.get("EPubDate"))
    year_match = re.search(r"(?:19|20)\d{2}", publication_date)
    authors = [
        _clean_text(author.get("Name"))
        for author in document.get("Authors", [])
        if _clean_text(author.get("Name"))
    ]
    doi = identifiers.get("doi")
    pmc_id = identifiers.get("pmc")

    return GeneLiteratureRecord(
        pmid=pmid,
        title=title,
        journal=_clean_text(document.get("FullJournalName") or document.get("Source")),
        publication_date=publication_date,
        year=int(year_match.group(0)) if year_match else None,
        authors=authors,
        publication_types=[_clean_text(value) for value in document.get("PubType", []) if _clean_text(value)],
        doi=doi,
        pmc_id=pmc_id,
        pubmed_url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
        doi_url=f"https://doi.org/{doi}" if doi else None,
        pmc_url=f"https://pmc.ncbi.nlm.nih.gov/articles/{pmc_id}/" if pmc_id else None,
    )


def _search_query(gene: str, species: Species) -> str:
    escaped_gene = gene.strip().replace('"', "")
    return (
        f'"{escaped_gene}"[Title/Abstract] AND {QPCR_QUERY} '
        f'AND {SPECIES_QUERY[species]} NOT Review[Publication Type]'
    )


def query_gene_literature(
    gene: str,
    species: Species,
    limit: int = 6,
) -> GeneLiteratureResponse:
    normalized_gene = gene.strip()
    search_query = _search_query(normalized_gene, species)
    search_url = f"https://pubmed.ncbi.nlm.nih.gov/?{urlencode({'term': search_query, 'sort': 'bestmatch'})}"

    def _load() -> GeneLiteratureResponse:
        search = entrez_esearch(
            db="pubmed",
            term=search_query,
            retmax=limit,
            sort="relevance",
        )
        ids = [str(value) for value in search.get("IdList", [])]
        records: list[GeneLiteratureRecord] = []
        if ids:
            summary = entrez_esummary(db="pubmed", id=",".join(ids), version="2.0")
            documents = summary.get("DocumentSummarySet", {}).get("DocumentSummary", [])
            records = [
                record
                for document in documents
                if (record := _record_from_summary(document)) is not None
            ]

        return GeneLiteratureResponse(
            query_gene=normalized_gene,
            species=species,
            search_query=search_query,
            search_url=search_url,
            total_results=int(search.get("Count", 0)),
            records=records[:limit],
            message=(
                "PubMed records matching the gene, species, and qPCR-focused query."
                if records
                else "No PubMed record matched the qPCR-focused query."
            ),
        )

    try:
        return cached_call(
            "gene_qpcr_literature_v1",
            normalized_gene.upper(),
            species.value,
            limit,
            loader=_load,
        )
    except Exception as exc:
        logger.warning("PubMed literature lookup unavailable for %s: %s", normalized_gene, exc)
        return GeneLiteratureResponse(
            query_gene=normalized_gene,
            species=species,
            search_query=search_query,
            search_url=search_url,
            available=False,
            message="PubMed literature lookup is temporarily unavailable.",
        )
