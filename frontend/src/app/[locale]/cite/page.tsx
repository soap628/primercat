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

function CopyBlock({ label, text, locale }: { label: string; text: string; locale: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="citation-block-v7" style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          {label}
        </span>
        <button
          className="citation-copy-v7"
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
          {copied ? (locale === "zh" ? "已复制" : "Copied") : (locale === "zh" ? "复制" : "Copy")}
        </button>
      </div>
      <pre className="citation-code-v7" style={{
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
    intro: "如在研究中使用 PrimerCat，可采用以下 URL 引用格式。",
    doiNotice: "关于 DOI",
    doiBody: "PrimerCat 当前尚未分配 DOI。投稿前请核对期刊的软件引用要求；需要时可先使用上方 URL 格式。",
    ctaAbout: "关于开发者",
    ctaContact: "联系 / 合作",
  },
  en: {
    badge: "Citation",
    title: "How to Cite PrimerCat",
    intro: "If you use PrimerCat in your research, cite it with one of the URL-based formats below.",
    doiNotice: "About the DOI",
    doiBody: "PrimerCat does not currently have a DOI. Check the target journal's software-citation requirements before submission; the URL format above may be used where appropriate.",
    ctaAbout: "About the Developer",
    ctaContact: "Contact / Collaborate",
  },
} as const;

export default function CitePage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;
  const apa = locale === "zh" ? APA_ZH : APA_EN;

  return (
    <div className="story-page aux-page-v7 cite-page-v7" style={{ maxWidth: 820 }}>
      <section className="aux-hero-v7" style={{ marginBottom: 24 }}>
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
        <CopyBlock label="BibTeX (@software)" text={BIBTEX} locale={locale} />
        <CopyBlock label="APA 7th" text={apa} locale={locale} />
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
