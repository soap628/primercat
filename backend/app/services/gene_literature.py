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

# Curated retrieval precedence, not a citation-metric or impact-factor ranking.
# Exact journal title/abbreviation queries are supported by PubMed's [ta] field:
# https://pubmed.ncbi.nlm.nih.gov/help/#searching-by-journal
# Journal names checked against the publishers' journal directories and NLM:
# https://www.nature.com/nature-portfolio/about-journals/research-journals
# https://www.cell.com/journals
# https://cts.sciencemag.org/
# https://www.ncbi.nlm.nih.gov/nlmcatalog/journals
JOURNAL_TIERS = (
    ("cns", ("Cell", "Nature", "Science")),
    ("cns_family", (
        "Nature Biotechnology", "Nature Cell Biology", "Nature Chemical Biology",
        "Nature Genetics", "Nature Immunology", "Nature Medicine", "Nature Methods",
        "Nature Microbiology", "Nature Neuroscience", "Nature Structural & Molecular Biology",
        "Nature Cancer", "Nature Metabolism", "Nature Communications",
        "Cancer Cell", "Cell Host & Microbe", "Cell Metabolism", "Cell Stem Cell",
        "Cell Reports", "Cell Reports Medicine", "Cell Genomics", "Developmental Cell",
        "Molecular Cell", "Immunity", "Neuron", "Curr Biol",
        "Science Advances", "Science Immunology", "Science Translational Medicine",
    )),
    ("specialist", (
        "Proc Natl Acad Sci U S A", "Nucleic Acids Research", "The EMBO Journal",
        "EMBO Reports", "EMBO Molecular Medicine", "Genome Biology", "Genome Research",
        "Cell Research", "The Journal of Clinical Investigation", "The Journal of Experimental Medicine",
        "Cancer Discovery", "Molecular Systems Biology", "eLife",
    )),
)
RANKING = "Curated journal priority, then PubMed Best Match"
EXCLUDED_PUBLICATION_TYPES = (
    "Review", "Systematic Review", "Meta-Analysis", "Editorial", "Comment", "News",
    "Published Erratum", "Retracted Publication", "Retraction Notice",
    "Expression of Concern",
)
EXCLUDED_TYPES_NORMALIZED = {value.casefold() for value in EXCLUDED_PUBLICATION_TYPES}
# Legacy publication type remains useful for defensive summary filtering, but
# PubMed's current query vocabulary uses Retraction Notice instead.
EXCLUDED_TYPES_NORMALIZED.add("retraction of publication")


def _journal_query(journals: tuple[str, ...]) -> str:
    # NLM recommends removing special characters in journal-title searches.
    return "(" + " OR ".join(
        f'"{journal.replace("&", "")}"[ta]' for journal in journals
    ) + ")"


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

    publication_types = [_clean_text(value) for value in document.get("PubType", []) if _clean_text(value)]
    if any(value.casefold() in EXCLUDED_TYPES_NORMALIZED for value in publication_types):
        return None
    # Defend against recently updated notices even if the search index lags.
    if re.match(r"^(?:retracted(?:\s+article)?|retraction(?:\s+(?:notice|note))?|correction|erratum)\s*:", title, re.I):
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
        publication_types=publication_types,
        doi=doi,
        pmc_id=pmc_id,
        pubmed_url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
        doi_url=f"https://doi.org/{doi}" if doi else None,
        pmc_url=f"https://pmc.ncbi.nlm.nih.gov/articles/{pmc_id}/" if pmc_id else None,
    )


def _search_query(gene: str, species: Species) -> str:
    escaped_gene = gene.strip().replace('"', "")
    excluded = " OR ".join(f'"{value}"[Publication Type]' for value in EXCLUDED_PUBLICATION_TYPES)
    return (
        f'"{escaped_gene}"[Title/Abstract] AND {QPCR_QUERY} '
        f'AND {SPECIES_QUERY[species]} AND "Journal Article"[Publication Type] '
        f'NOT ({excluded} OR hasretractionin OR hasretractionof)'
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
        # Search priority journals independently: reordering just the first six
        # broad Best Match hits cannot discover a relevant CNS paper below them.
        # The broad query also supplies fallback hits and the total match count.
        queries = [("other", search_query)] + [
            (tier, f"({search_query}) AND {_journal_query(journals)}")
            for tier, journals in JOURNAL_TIERS
        ]
        matches: dict[str, list[str]] = {}
        total_results = 0
        total_results_exact = False
        partial = False
        for tier, query in queries:
            try:
                search = entrez_esearch(db="pubmed", term=query, retmax=limit * 2, sort="relevance")
                matches[tier] = list(dict.fromkeys(str(value) for value in search.get("IdList", [])))
                if tier == "other":
                    total_results = int(search.get("Count", 0))
                    total_results_exact = True
            except Exception as exc:
                partial = True
                logger.warning("PubMed %s journal lookup unavailable for %s: %s", tier, normalized_gene, exc)

        # Preserve PubMed's relevance order inside each tier, independent of the
        # order ESummary returns documents. A PMID occurs at most once.
        tier_by_id: dict[str, str] = {}
        for tier in [*(tier for tier, _ in JOURNAL_TIERS), "other"]:
            for pmid in matches.get(tier, []):
                tier_by_id.setdefault(pmid, tier)
        ids = list(tier_by_id)
        records: list[GeneLiteratureRecord] = []
        if ids:
            summary = entrez_esummary(db="pubmed", id=",".join(ids), version="2.0")
            documents = summary.get("DocumentSummarySet", {}).get("DocumentSummary", [])
            records_by_id = {
                record.pmid: record
                for document in documents
                if (record := _record_from_summary(document)) is not None
            }
            for pmid, tier in tier_by_id.items():
                if (record := records_by_id.get(pmid)) is not None:
                    record.journal_tier = tier
                    records.append(record)

        if not matches:
            raise RuntimeError("All PubMed journal searches were unavailable")

        return GeneLiteratureResponse(
            query_gene=normalized_gene,
            species=species,
            search_query=search_query,
            search_url=search_url,
            ranking=RANKING,
            total_results=total_results,
            total_results_exact=total_results_exact,
            partial=partial,
            records=records[:limit],
            message=(
                "Gene-, species-, and qPCR-related research, with curated journal precedence. "
                "These articles may contain experimentally tested primer pairs; inspect the methods and supplements."
                if records
                else (
                    "Some PubMed searches were unavailable; no article could be retrieved."
                    if partial else "No PubMed record matched the qPCR-focused research query."
                )
            ),
        )

    try:
        return cached_call(
            "gene_qpcr_literature_v2_journal_priority",
            normalized_gene.upper(),
            species.value,
            limit,
            loader=_load,
            should_cache=lambda result: result.available and not result.partial,
        )
    except Exception as exc:
        logger.warning("PubMed literature lookup unavailable for %s: %s", normalized_gene, exc)
        return GeneLiteratureResponse(
            query_gene=normalized_gene,
            species=species,
            search_query=search_query,
            search_url=search_url,
            ranking=RANKING,
            total_results_exact=False,
            available=False,
            message="PubMed literature lookup is temporarily unavailable.",
        )
