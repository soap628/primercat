import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.schemas.gene_primer import (
    KnownPrimerValidationRequest,
    KnownPrimerValidationResponse,
    TranscriptAmpliconClass,
)
from app.services.primer_bowtie2 import (
    primer_bowtie2_available,
    validate_primer_pairs_batch,
)
from app.services.primer_transcriptome import (
    combined_computational_specificity_pass,
    transcriptome_bowtie2_available,
    validate_transcriptome_primer_pairs_batch,
)


_executor = ThreadPoolExecutor(max_workers=3)


def _observed_product_size(genome, transcriptome) -> int | None:
    if transcriptome:
        for product in transcriptome.top_amplicons:
            if product.classification == TranscriptAmpliconClass.target_transcript:
                return product.product_size
    if genome:
        for product in genome.top_amplicons:
            if product.is_target:
                return product.product_size
    return None


async def validate_known_primer_pair(
    req: KnownPrimerValidationRequest,
) -> KnownPrimerValidationResponse:
    """Re-screen a sourced primer pair against PrimerCat's fixed references.

    This endpoint does not reinterpret a vendor or publication claim. It adds a
    separate, current computational check and reports when the required local
    reference indexes are unavailable.
    """
    species = req.species.value
    target = req.target_transcript
    pair = [(req.forward_primer.upper(), req.reverse_primer.upper())]
    genome_ready = primer_bowtie2_available(species)
    transcriptome_ready = transcriptome_bowtie2_available(species)

    if not genome_ready and not transcriptome_ready:
        return KnownPrimerValidationResponse(
            status="unavailable",
            scope="none",
            target_transcript=target,
            message="Versioned local genome and transcriptome indexes are unavailable.",
        )

    loop = asyncio.get_running_loop()
    genome = None
    transcriptome = None
    tasks = []
    if genome_ready:
        tasks.append(loop.run_in_executor(
            _executor,
            validate_primer_pairs_batch,
            pair,
            species,
            target,
        ))
    if transcriptome_ready:
        tasks.append(loop.run_in_executor(
            _executor,
            validate_transcriptome_primer_pairs_batch,
            pair,
            species,
            target,
        ))

    try:
        results = await asyncio.wait_for(asyncio.gather(*tasks), timeout=120)
    except asyncio.TimeoutError:
        return KnownPrimerValidationResponse(
            status="unavailable",
            scope="timeout",
            target_transcript=target,
            message="PrimerCat reference re-screen timed out.",
        )

    result_index = 0
    if genome_ready:
        genome = results[result_index][0].pair
        result_index += 1
    if transcriptome_ready:
        transcriptome = results[result_index][0]

    genome_usable = bool(
        genome and genome.checked and genome.status not in {"error", "truncated"}
    )
    transcriptome_usable = bool(
        transcriptome
        and transcriptome.checked
        and transcriptome.status not in {"error", "truncated"}
    )
    check_complete = genome_usable and transcriptome_usable
    if check_complete:
        passed = combined_computational_specificity_pass(genome, transcriptome)
        status = "passed" if passed else "review"
        scope = "reference_genome_and_refseq_transcriptome_bowtie2"
    else:
        status = "partial" if genome_usable or transcriptome_usable else "unavailable"
        scope = (
            "reference_genome_bowtie2"
            if genome_usable
            else "refseq_transcriptome_bowtie2" if transcriptome_usable else "none"
        )

    reference_assembly = (
        genome.reference_assembly if genome else transcriptome.reference_assembly if transcriptome else None
    )
    return KnownPrimerValidationResponse(
        status=status,
        scope=scope,
        reference_assembly=reference_assembly,
        target_transcript=target,
        observed_product_size=_observed_product_size(genome, transcriptome),
        genome_pair_validation=genome,
        transcriptome_pair_validation=transcriptome,
        message="PrimerCat computational re-screen completed." if status != "unavailable" else "Reference re-screen unavailable.",
    )
