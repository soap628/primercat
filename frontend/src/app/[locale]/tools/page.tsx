import { getTranslations } from "next-intl/server";
import ToolsAppLauncher, { type ToolApp } from "./ToolsAppLauncher";

export default async function ToolsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "tools" });
  const isZh = locale === "zh";
  const ready = isZh ? "可用" : "Ready";

  const apps: ToolApp[] = [
    {
      id: "qpcr-primer",
      category: "design",
      eyebrow: t("card_primer_eyebrow"),
      title: t("card_primer_title"),
      body: t("card_primer_body"),
      code: "QP",
      tone: "#c454a9",
      system: "RefSeq · Primer3 · BLAST",
      status: ready,
      actions: [{ href: "/primer", label: t("card_primer_cta") }],
    },
    {
      id: "endpoint-pcr",
      category: "design",
      eyebrow: t("card_pcr_eyebrow"),
      title: t("card_pcr_title"),
      body: t("card_pcr_body"),
      code: "PCR",
      tone: "#17856f",
      system: "Primer3 · thermodynamics",
      status: ready,
      actions: [{ href: "/pcr", label: t("card_pcr_cta") }],
    },
    {
      id: "crispr-grna",
      category: "design",
      eyebrow: t("card_grna_eyebrow"),
      title: t("card_grna_title"),
      body: t("card_grna_body"),
      code: "CR",
      tone: "#2f70b8",
      system: "CRISPR · off-target ranking",
      status: "Beta",
      actions: [{ href: "/grna", label: t("card_grna_cta") }],
    },
    {
      id: "blast-search",
      category: "design",
      eyebrow: t("card_blast_eyebrow"),
      title: t("card_blast_title"),
      body: t("card_blast_body"),
      code: "BL",
      tone: "#b7670c",
      system: "NCBI BLAST · sequence search",
      status: ready,
      actions: [{ href: "/blast", label: t("card_blast_cta") }],
    },
    {
      id: "solution-preparation",
      category: "lab",
      eyebrow: t("card_solutions_eyebrow"),
      title: t("card_solutions_title"),
      body: t("card_solutions_body"),
      code: "SL",
      tone: "#497d70",
      system: "recipes · scaling · records",
      status: ready,
      actions: [{ href: "/solutions", label: t("card_solutions_cta") }],
    },
    {
      id: "molecular-weight",
      category: "lab",
      eyebrow: t("card_mw_eyebrow"),
      title: t("card_mw_title"),
      body: t("card_mw_body"),
      code: "MW",
      tone: "#667085",
      system: "formula · dilution · conversion",
      status: ready,
      actions: [{ href: "/mw-calc", label: t("card_mw_cta") }],
    },
    {
      id: "chemical-safety",
      category: "lab",
      eyebrow: t("card_safety_eyebrow"),
      title: t("card_safety_title"),
      body: t("card_safety_body"),
      code: "HS",
      tone: "#b5473c",
      system: "GHS · SDS · PubChem",
      status: ready,
      actions: [{ href: "/chemical-safety", label: t("card_safety_cta") }],
    },
    {
      id: "methods-trust",
      category: "knowledge",
      eyebrow: isZh ? "算法 · 数据来源 · 验证边界" : "Algorithms · sources · validation limits",
      title: isZh ? "方法与可信度" : "Methods & Trust",
      body: isZh
        ? "把方法流程、数据库来源、评分逻辑、能力边界和实验验证层级放在同一个入口中查看。"
        : "Review methodology, data sources, scoring logic, capability limits, and experimental-validation tiers in one place.",
      code: "MV",
      tone: "#8b5d97",
      system: "methods · evidence · limitations",
      status: ready,
      featured: true,
      actions: [
        { href: "/methods", label: isZh ? "查看方法" : "View methods" },
        { href: "/validation", label: isZh ? "查看可信度" : "View trust" },
      ],
    },
  ];

  return (
    <ToolsAppLauncher
      locale={locale}
      title={isZh ? "全部应用" : "All applications"}
      intro={isZh
        ? "按任务选择应用。序列设计、实验计算、安全资料以及方法与可信度入口集中在一个工作台。"
        : "Choose an app by task. Sequence design, bench calculations, safety references, and methods & trust live in one workspace."}
      note={t("note")}
      apps={apps}
    />
  );
}
