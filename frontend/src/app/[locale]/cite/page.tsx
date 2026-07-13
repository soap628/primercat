"use client";

import { useState } from "react";
import { Link } from "@/navigation";

const BIBTEX = `@software{wang_primercat_2026,
  author    = {Wang, Zihao},
  title     = {{PrimerCat}: An Auditable Platform for qPCR Primer Design,
               CRISPR gRNA Design, and BLAST Sequence Search},
  year      = {2026},
  version   = {1.0},
  url       = {https://primercat.tech},
}`;

const APA_ZH = `Wang, Z. (2026). PrimerCat: An auditable platform for qPCR primer design, CRISPR gRNA design, and BLAST sequence search (Version 1.0) [Software]. https://primercat.tech`;
const APA_EN = `Wang, Z. (2026). PrimerCat: An auditable platform for qPCR primer design, CRISPR gRNA design, and BLAST sequence search (Version 1.0) [Software]. https://primercat.tech`;

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          {label}
        </span>
        <button
          onClick={copy}
          style={{
            cursor: "pointer",
            fontSize: 11, fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 8,
            border: copied ? "1px solid rgba(255,177,238,0.4)" : "1px solid var(--border)",
            background: copied ? "rgba(255,177,238,0.08)" : "var(--bg-inset)",
            color: copied ? "#ffb1ee" : "var(--text-2)",
            transition: "all 0.15s",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: "16px 18px",
        borderRadius: 12,
        background: "var(--bg-inset)",
        border: "1px solid var(--border)",
        fontSize: 12.5,
        lineHeight: 1.75,
        color: "var(--text-2)",
        fontFamily: "var(--font-mono, monospace)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        overflowX: "auto",
      }}>
        {text}
      </pre>
    </div>
  );
}

const COPY = {
  zh: {
    badge: "引用",
    title: "如何引用 PrimerCat",
    intro: "如果 PrimerCat 对您的研究有帮助，请按以下格式引用。目前提供 URL 引用，Zenodo DOI 正在申请中，发布后将更新此页面。",
    doiNotice: "关于 DOI",
    doiBody: "正式 DOI 尚未发布。如需在论文中引用，建议使用上方 URL 格式；DOI 发布后可向期刊补充更新引用信息。如有疑问请联系我们。",
    ctaAbout: "关于开发者",
    ctaContact: "联系 / 合作",
  },
  en: {
    badge: "Citation",
    title: "How to Cite PrimerCat",
    intro: "If PrimerCat contributed to your research, please cite it using one of the formats below. A Zenodo DOI is pending — URL citation is available now.",
    doiNotice: "About the DOI",
    doiBody: "A formal DOI has not yet been issued. For immediate citation needs, use the URL format above. Once the Zenodo record is published, you can update the citation in your manuscript. Feel free to contact us if needed.",
    ctaAbout: "About the Developer",
    ctaContact: "Contact / Collaborate",
  },
} as const;

export default function CitePage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const apa = locale === "zh" ? APA_ZH : APA_EN;

  return (
    <div className="story-page" style={{ maxWidth: 820 }}>
      <section style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
          {copy.badge}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-1)", margin: "0 0 10px" }}>
          {copy.title}
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: "var(--text-2)", maxWidth: 680 }}>
          {copy.intro}
        </p>
      </section>

      <section className="story-surface" style={{ padding: "22px clamp(18px, 3vw, 28px)", marginBottom: 14 }}>
        <CopyBlock label="BibTeX (@software)" text={BIBTEX} />
        <CopyBlock label="APA 7th" text={apa} />
      </section>

      <section className="story-surface" style={{ padding: "20px clamp(18px, 3vw, 28px)", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffa42b", marginBottom: 8 }}>
          {copy.doiNotice}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: 0 }}>
          {copy.doiBody}
        </p>
      </section>

      <section style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
        <Link href="/about">
          <button className="hero-btn-secondary">{copy.ctaAbout}</button>
        </Link>
        <Link href="/contact">
          <button className="hero-btn-secondary">{copy.ctaContact}</button>
        </Link>
      </section>
    </div>
  );
}
