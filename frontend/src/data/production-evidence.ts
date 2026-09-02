import cohortBenchmark from "@/data/qpcr-reference-cohort-mouse-v0.6.json";

export const productionEvidence = {
  schema_version: "1.0",
  snapshot_date: "2026-09-03",
  release: {
    audit_basis_commit: "0f42ebe40691063006762792c745093115420524",
    audit_basis_source_url: "https://github.com/soap628/primercat/commit/0f42ebe40691063006762792c745093115420524",
    backend_tests_passed: 283,
    frontend_production_build: "passed",
    scope: {
      zh: "该提交是本快照所记录的软件与线上流程核验基线；证据说明页面可能由后续文档提交发布。",
      en: "This commit is the software and production-flow audit baseline recorded by this snapshot; the evidence page itself may be published by a later documentation commit.",
    },
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
    checked_at: "2026-09-03",
    check_type: "production smoke test",
    public_routes_checked_http_200: 8,
    workflows_checked_passed: ["qPCR", "PCR", "CRISPR", "BLAST"],
    status: "passed",
  },
  interpretation_limits: {
    zh: [
      "数据库行数只描述索引表的记录规模，不是独立基因、可用 gRNA 或实验验证位点数量。",
      "计算筛查通过只对所列参考版本、参数、判定规则和命中上限成立，不是湿实验成功率。",
      "自动化测试、构建、文件校验和线上冒烟测试属于软件与数据完整性证据，不构成生物学或临床验证。",
    ],
    en: [
      "Database row counts describe indexed table records, not unique genes, usable guides, or experimentally validated sites.",
      "A computational screen pass is limited to the listed reference versions, parameters, decision rules, and hit caps; it is not a wet-lab success rate.",
      "Automated tests, builds, file checksums, and production smoke tests are software and data-integrity evidence, not biological or clinical validation.",
    ],
  },
} as const;

export type ProductionEvidence = typeof productionEvidence;
