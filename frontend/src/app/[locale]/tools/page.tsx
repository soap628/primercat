import { Link } from "@/navigation";
import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";

export default async function ToolsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "tools" });

  const cards = [
    {
      eyebrow: t("card_pcr_eyebrow"),
      title: t("card_pcr_title"),
      body: t("card_pcr_body"),
      href: "/pcr",
      cta: t("card_pcr_cta"),
      code: "PCR",
      tone: "#17856f",
      system: "Primer3 · thermodynamics",
    },
    {
      eyebrow: t("card_primer_eyebrow"),
      title: t("card_primer_title"),
      body: t("card_primer_body"),
      href: "/primer",
      cta: t("card_primer_cta"),
      code: "QP",
      tone: "#c454a9",
      system: "RefSeq · Primer3 · BLAST",
    },
    {
      eyebrow: t("card_grna_eyebrow"),
      title: t("card_grna_title"),
      body: t("card_grna_body"),
      href: "/grna",
      cta: t("card_grna_cta"),
      code: "CR",
      tone: "#2f70b8",
      system: "CRISPR · off-target ranking",
    },
    {
      eyebrow: t("card_blast_eyebrow"),
      title: t("card_blast_title"),
      body: t("card_blast_body"),
      href: "/blast",
      cta: t("card_blast_cta"),
      code: "BL",
      tone: "#b7670c",
      system: "NCBI BLAST · sequence search",
    },
    {
      eyebrow: t("card_mw_eyebrow"),
      title: t("card_mw_title"),
      body: t("card_mw_body"),
      href: "/mw-calc",
      cta: t("card_mw_cta"),
      code: "MW",
      tone: "#667085",
      system: "formula · dilution · conversion",
    },
    {
      eyebrow: t("card_solutions_eyebrow"),
      title: t("card_solutions_title"),
      body: t("card_solutions_body"),
      href: "/solutions",
      cta: t("card_solutions_cta"),
      code: "SL",
      tone: "#497d70",
      system: "recipes · scaling · records",
    },
    {
      eyebrow: t("card_safety_eyebrow"),
      title: t("card_safety_title"),
      body: t("card_safety_body"),
      href: "/chemical-safety",
      cta: t("card_safety_cta"),
      code: "HS",
      tone: "#b5473c",
      system: "GHS · SDS · PubChem",
    },
  ];

  const whyItems: string[] = t.raw("whyItems") as string[];

  const sections = [
    {
      number: "01",
      title: locale === "zh" ? "核心序列设计" : "Core sequence design",
      body: locale === "zh"
        ? "从端点 PCR、qPCR 到 gRNA 与序列检索，集中处理高频分子设计任务。"
        : "Handle everyday molecular design work, from endpoint PCR and qPCR to gRNA and sequence search.",
      cards: cards.slice(0, 4),
      startIndex: 0,
    },
    {
      number: "02",
      title: locale === "zh" ? "实验室工作台" : "Laboratory workbench",
      body: locale === "zh"
        ? "配制、计算和化学品安全资料，放在实验操作触手可及的位置。"
        : "Preparation, calculation, and chemical-safety references kept within reach at the bench.",
      cards: cards.slice(4),
      startIndex: 4,
    },
  ];

  return (
    <div className="tools-directory-v4">
      <section className="tools-directory-hero">
        <div className="tools-directory-intro">
          <div className="tools-directory-kicker">{t("badge")}</div>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
          <div className="tools-directory-note">{t("note")}</div>
        </div>

        <aside className="tools-directory-summary">
          <div className="tools-directory-summary-label">{t("heroAsideTitle")}</div>
          <p>{t("heroAsideBody")}</p>
          <div className="tools-directory-metric">
            <span>{t("heroMetricLabel")}</span>
            <strong>{t("heroMetricValue")}</strong>
            <p>{t("heroMetricBody")}</p>
          </div>
        </aside>
      </section>

      {sections.map((section) => (
        <section key={section.number} className="tools-directory-section">
          <header className="tools-directory-section-head">
            <span>{section.number}</span>
            <div>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </div>
          </header>

          <div className="tools-directory-list">
            {section.cards.map((card, index) => (
              <Link key={card.title} href={card.href} className="tools-directory-item" style={{ "--tool-tone": card.tone } as CSSProperties}>
                <span className="tools-directory-signal" aria-hidden="true">
                  <i />
                  <strong>{card.code}</strong>
                  <small>{String(section.startIndex + index + 1).padStart(2, "0")}</small>
                </span>
                <div className="tools-directory-item-copy">
                  <div className="tools-directory-eyebrow">{card.eyebrow}</div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  <span className="tools-directory-system">{card.system}</span>
                </div>
                <span className="tools-directory-cta"><span>{card.cta}</span><b aria-hidden="true">→</b></span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="tools-directory-principles">
        <div className="tools-directory-principles-copy">
          <div className="tools-directory-kicker">{t("whyLabel")}</div>
          <h2>{t("whyTitle")}</h2>
          <div className="tools-directory-principle-list">
            {whyItems.map((item, index) => (
              <div key={item} className="tools-directory-principle">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="tools-directory-actions">
          <Link href="/primer" className="tools-directory-action-primary">{t("primaryCta")}</Link>
          <Link href="/methods" className="tools-directory-action-secondary">{t("secondaryCta")}</Link>
        </div>
      </section>
    </div>
  );
}
