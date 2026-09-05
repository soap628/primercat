# Production release: beefb01

Deployed on 2026-09-05 to https://primercat.tech. Application source:
`beefb01b97a2f06f8150aac120d658983c7d05fc`.

## Release and rollback

- Release directory: `/root/primercat-beefb01` on the existing Tencent Lighthouse host.
- Both Docker images built successfully on the server. Only `backend` and
  `frontend` were recreated under Compose project `primercat` (`--no-deps`).
- Existing database, cache volumes, certificates and nginx container were retained.
  nginx configuration validation and reload succeeded.
- Previous release directory: `/root/primercat-f36104e`.
- Previous images retained as `primercat-backend:rollback-f36104e` and
  `primercat-frontend:rollback-f36104e`. Rollback must explicitly use these images;
  merely running Compose from the old directory would reuse the new `latest` tags.
- Existing runtime environment files were copied without printing their contents.

## Reference mount correction

Before this deployment, the running backend mounted the empty directory
`/root/primercat-f36104e/reference-data`. The existing catalog was still preserved
at `/opt/primercat/reference-data/qpcr-catalog.sqlite3` (109,318,144 bytes).

The new release has a `reference-data` symlink to `/opt/primercat/reference-data`.
Build and start commands also explicitly used
`PRIMERCAT_REFERENCE_ROOT=/opt/primercat/reference-data`. The running backend was
verified to mount that directory read-only at `/var/lib/primercat/reference`.
Future releases must preserve this absolute source; do not accidentally mount an
empty release-local directory. This correction restores the existing qPCR catalog,
not full genome/transcriptome indexes, which were not installed in this release.

## Production verification

- Backend `/health`, checked inside the container: `{"status":"ok"}`;
  Docker health: `healthy`. Public `/health` does not route to FastAPI.
- Container `remote_blast.py` SHA-256 matches the reviewed source:
  `d648be76f153386d57ded50f44149698c21fc32a5c77c76d3b0c68592b646cc5`.
- HTTP 200: `/zh/primer`, `/zh/pcr`, `/zh/blast`, `/en/blast`.
- Real POST `/api/v1/blast/search`: 20 nt GAPDH F
  `GATTTGGTCGTATTGGGCGC`, human, RefSeq RNA, with no explicit short-mode or
  E-value override. Response confirmed auto short mode, E-value 1000, word size 7,
  hit limit 50, exact submitted sequence and length. Returned 50 hits, including
  six full-length 100% identity GAPDH matches; first accession `NM_001289745`,
  E-value 0.00338889. This is sequence-matching evidence, not experimental or
  exhaustive paired-specificity validation.
- `/api/v1/gene-primer/known?gene=GAPDH&species=human&limit=5`: gene index available,
  193,814 catalog genes, 4,702 catalog pairs, two returned GAPDH records. Counts are
  catalog coverage, not the number of experimentally validated genes.
- Real qPCR GAPDH design returned five pairs. Expanded pair 2 and selected the
  amplicon panel; navigated to Utilities and back, refreshed, changed to English
  and back to Chinese. Input, all five pairs, expanded panel, completed source
  records and literature were retained; computation did not restart.
- Source-primer BLAST href verified to contain the original OriGene forward
  sequence, source ID, gene, direction, database and human species in the fragment.
- PCR design on a labelled 900 bp synthetic QA template returned five pairs.
  Expanded pair 1 survived navigation and refresh. Cleared this QA workspace and
  refreshed: empty input, no resurrected result. Temporary PCR QA tab closed.

Session retention is tab-scoped, not an account backup. In-flight designs do not
continue across page departures, and previously lost results cannot be recovered.
The public NCBI service remains an external availability dependency.
