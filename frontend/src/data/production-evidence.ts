import cohortBenchmark from "@/data/qpcr-reference-cohort-mouse-v0.6.json";

export const productionEvidence = {
  schema_version: "1.0",
  snapshot_date: "2026-09-03",
  release: {
    commit: "0f42ebe40691063006762792c745093115420524",
    source_url: "https://github.com/soap628/primercat/commit/0f42ebe40691063006762792c745093115420524",
    backend_tests_passed: 283,
    frontend_production_build: "passed",
  },
  references: {
    human: {
      assembly_name: "GRCh38.p14",
      assembly_accession: "GCF_000001405.40",
      annotation_release: "GCF_000001405.40-RS_2025_08",
      assembly_url: "https://www.ncbi.nlm.nih.gov/datasets/genome/GCF_000001405.40/",
      annotation_url: "https://www.ncbi.nlm.nih.gov/refseq/annotation_euk/Homo_sapiens/GCF_000001405.40-RS_2025_08/",
      grna_feature_rows: 4_514_782,
      transcript_locus_rows: 202_461,
      runtime_artifacts_sha256: { passed: 17, total: 17 },
      checksums_url: "/evidence/production-reference-checksums-v1.json",
    },
    mouse: {
      assembly_name: "GRCm39",
      assembly_accession: "GCF_000001635.27",
      annotation_release: "GCF_000001635.27-RS_2024_02",
      assembly_url: "https://www.ncbi.nlm.nih.gov/datasets/genome/GCF_000001635.27/",
      annotation_url: "https://www.ncbi.nlm.nih.gov/refseq/annotation_euk/Mus_musculus/GCF_000001635.27-RS_2024_02/",
      grna_feature_rows: 3_023_953,
      updated_artifacts_sha256: { passed: 3, total: 3 },
      checksums_url: "/evidence/production-reference-checksums-v1.json",
    },
  },
  computational_audit: {
    benchmark_id: "qpcr-fixed-refseq-mouse-cohort-v0.6",
    benchmark_url: "/benchmarks/qpcr-fixed-refseq-mouse-cohort-v0.6.json",
    genes: cohortBenchmark.results.cohort_records,
    design_success_records: cohortBenchmark.results.design_success_records,
    candidate_pairs_screened: cohortBenchmark.results.candidate_pairs_screened,
    combined_computational_pass_pairs: cohortBenchmark.results.combined_computational_pass_pairs,
    genes_with_at_least_one_pass: cohortBenchmark.results.records_with_at_least_one_combined_pass,
  },
  deployment_verification: {
    public_routes_http_200: 8,
    workflows_passed: ["qPCR", "PCR", "CRISPR", "BLAST"],
    status: "passed",
  },
  interpretation_limits: {
    zh: [
      "数据库行数描述实现规模，不是独立基因、gRNA 或实验验证位点数量。",
      "计算通过只对所述参考、阈值和命中上限成立，不是湿实验成功率。",
      "自动化测试、构建、校验和线上流程检查提供软件及数据完整性证据，不构成生物学验证。",
    ],
    en: [
      "Database row counts are implementation-scale records, not counts of unique genes, guides, or experimentally validated sites.",
      "A computational pass is limited to the stated references, thresholds, and hit caps; it is not a wet-lab success rate.",
      "Automated tests, builds, checksums, and online smoke tests establish software and data-integrity evidence, not biological validity.",
    ],
  },
} as const;

export type ProductionEvidence = typeof productionEvidence;
