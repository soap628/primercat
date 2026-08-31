"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { useEffect, useState, useRef } from "react";

function PrimerCatMascot({ locale, onActivate, expanded }: { locale: string; onActivate: () => void; expanded: boolean }) {
  const isZh = locale === "zh";

  return (
    <button
      type="button"
      className="home-mascot-trigger"
      onClick={onActivate}
      aria-label={isZh ? "点击 PrimerCat 猫咪" : "Click the PrimerCat mascot"}
      aria-haspopup="dialog"
      aria-expanded={expanded}
    >
      <svg className="home-mascot" viewBox="0 0 180 170" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="mascotCoat" x1="48" y1="32" x2="132" y2="157" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--mascot-coat-light)" />
            <stop offset="1" stopColor="var(--mascot-coat-dark)" />
          </linearGradient>
          <linearGradient id="mascotTail" x1="111" y1="112" x2="157" y2="147" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--mascot-coat-dark)" />
            <stop offset="1" stopColor="var(--mascot-coat-light)" />
          </linearGradient>
        </defs>

        <ellipse className="home-mascot-shadow" cx="91" cy="157" rx="45" ry="5.5" />
        <path className="home-mascot-tail" d="M110 119c24-8 45 1 47 16 2 13-10 23-23 18-10-4-14-14-8-22 4-6 12-6 18-2" stroke="url(#mascotTail)" strokeWidth="10" strokeLinecap="round" />

        <g className="home-mascot-body">
          <path className="home-mascot-torso" d="M68 82c-12 9-18 28-16 49 1 19 10 28 27 28h30c15 0 23-8 20-20-2-11-9-18-19-22 3-15-2-28-13-36-8-5-20-5-29 1Z" fill="url(#mascotCoat)" />
          <path className="home-mascot-chest" d="M72 91c-8 15-9 36-4 59 4 5 10 7 18 7h5c-5-24-2-47 7-68-9-4-18-3-26 2Z" />
          <path className="home-mascot-haunch" d="M108 116c13 4 20 12 22 23 2 11-7 19-21 19H96c11-9 15-23 12-42Z" />
          <path className="home-mascot-paw" d="M69 119c-1 12-1 22 1 31m20-34c-2 13-2 24 0 34" />
          <path className="home-mascot-paw-toes" d="M62 151c5-2 10-2 15 0m6 0c5-2 10-2 15 0" />
        </g>

        <g className="home-mascot-head">
          <path className="home-mascot-face" d="M47 60c0-10 3-19 10-26L54 13l21 14c9-4 20-4 29 0l21-13-4 23c6 7 8 15 8 24-1 22-18 36-41 36-24 0-41-15-41-37Z" fill="url(#mascotCoat)" />
          <path className="home-mascot-ear-inner" d="m59 24 13 9-11 7-2-16Zm53 9 9-8-2 16-7-8Z" />
          <path className="home-mascot-face-highlight" d="M82 28c4-2 9-2 13 0-2 8-4 14-6 21-2-7-4-14-7-21Z" />
          <path className="home-mascot-brow" d="M63 54c5-3 11-3 16 0m18 0c5-3 11-3 15 0" />
          <g className="home-mascot-eyes">
            <path d="M62 62c4-6 12-6 17 0-4 6-12 6-17 0Z" className="home-mascot-eye-white" />
            <path d="M97 62c4-6 12-6 17 0-4 6-12 6-17 0Z" className="home-mascot-eye-white" />
            <ellipse cx="71" cy="62" rx="1.8" ry="4" className="home-mascot-iris" />
            <ellipse cx="106" cy="62" rx="1.8" ry="4" className="home-mascot-iris" />
            <circle cx="70.5" cy="60.8" r=".8" className="home-mascot-eye-glint" />
            <circle cx="105.5" cy="60.8" r=".8" className="home-mascot-eye-glint" />
          </g>
          <ellipse className="home-mascot-cheek" cx="82" cy="75" rx="8" ry="6" />
          <ellipse className="home-mascot-cheek" cx="95" cy="75" rx="8" ry="6" />
          <path className="home-mascot-chin" d="M82 80c2 6 10 7 13 0-4 2-9 2-13 0Z" />
          <path className="home-mascot-nose" d="m85 72 3.5-1.6L92 72l-3.5 3.4L85 72Z" />
          <path className="home-mascot-mouth" d="M88.5 75v4m0 0c-3 3-6 3-8 1m8-1c3 3 6 3 8 1" />
          <g className="home-mascot-whiskers">
            <path d="M72 75 44 70m29 10-31 2m63-7 28-5m-29 10 31 2" />
          </g>
        </g>

        <g className="home-mascot-collar">
          <path d="M68 91c13 6 28 6 41 0" />
          <circle cx="88.5" cy="97" r="4.5" />
          <path d="m86.5 97 2-2 2 2-2 2-2-2Z" />
        </g>
      </svg>
    </button>
  );
}

function ProductEvidenceGraphic({ locale }: { locale: string }) {
  const isZh = locale === "zh";
  const mascotNotes = isZh
    ? [
        "这对候选，值得看看。",
        "ΔTm 在目标范围内。",
        "跨外显子，降低 gDNA 干扰。",
        "BLAST 初筛完成，别忘了做实验。",
        "94 分，还得上实验台。",
      ]
    : [
        "This candidate is worth reviewing.",
        "ΔTm is within the target range.",
        "Exon-spanning can reduce gDNA interference.",
        "BLAST screening is complete. Validate it experimentally.",
        "Score 94. Bench test next.",
      ];
  const [noteIndex, setNoteIndex] = useState(0);
  const [easterEggOpen, setEasterEggOpen] = useState(false);
  const easterEggDialogRef = useRef<HTMLDivElement>(null);
  const easterEggCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setNoteIndex((current) => (current + 1) % mascotNotes.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [mascotNotes.length]);

  useEffect(() => {
    if (!easterEggOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const bodyHadStyle = document.body.hasAttribute("style");
    const focusTimer = window.setTimeout(() => easterEggCloseRef.current?.focus(), 20);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEasterEggOpen(false);
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = easterEggDialogRef.current?.querySelectorAll<HTMLElement>('button, a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      if (previousOverflow) document.body.style.overflow = previousOverflow;
      else document.body.style.removeProperty("overflow");
      if (!bodyHadStyle && document.body.getAttribute("style") === "") document.body.removeAttribute("style");
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [easterEggOpen]);

  return (
    <>
      <div className="home-evidence" aria-label={isZh ? "PrimerCat 产品结果示意预览" : "PrimerCat product result preview"}>
        <div className="home-evidence-topline">
          <div>
            <span>{isZh ? "示意预览" : "Illustrative preview"}</span>
            <strong>TP53 · NM_000546</strong>
          </div>
          <span className="home-evidence-status"><i />{isZh ? "RNA 初筛未见明显非目标命中" : "No evident non-target RNA hit"}</span>
        </div>

        <div className="home-evidence-track">
          <div className="home-evidence-axis" aria-hidden="true"><span>5′</span><span>3′</span></div>
          <div className="home-evidence-gene" aria-hidden="true">
            <span className="exon exon-1" /><span className="exon exon-2" /><span className="exon exon-3" /><span className="exon exon-4" />
          </div>
          <div className="home-mascot-note" aria-hidden="true">
            <strong key={`${locale}-${noteIndex}`} className="home-mascot-note-copy">{mascotNotes[noteIndex]}</strong>
            <span className="home-mascot-note-dots"><i /><i /><i /></span>
          </div>
          <PrimerCatMascot locale={locale} onActivate={() => setEasterEggOpen(true)} expanded={easterEggOpen} />
          <div className="home-evidence-primer forward" aria-hidden="true"><b>F</b><span>AGGCTGCTCCCC...</span></div>
          <div className="home-evidence-primer reverse" aria-hidden="true"><span>CGTGCAAGTCAC...</span><b>R</b></div>
        </div>

        <div className="home-evidence-metrics">
          <div><span>ΔTm</span><strong>0.3 °C</strong></div>
          <div><span>GC</span><strong>55%</strong></div>
          <div><span>{isZh ? "扩增子" : "Amplicon"}</span><strong>152 bp</strong></div>
        </div>

        <div className="home-evidence-footer">
          <div className="home-evidence-score"><strong>94</strong><span>/ 100<br />{isZh ? "综合评分" : "ranked score"}</span></div>
          <div className="home-evidence-sources"><span>NCBI RefSeq</span><span>Primer3</span><span>RNA BLAST</span></div>
        </div>
      </div>

      {easterEggOpen && (
        <div
          className="home-easter-veil"
          onMouseDown={(event) => event.target === event.currentTarget && setEasterEggOpen(false)}
        >
          <div
            ref={easterEggDialogRef}
            className="home-easter-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-easter-title"
            aria-describedby="home-easter-description"
          >
            <button
              ref={easterEggCloseRef}
              type="button"
              className="home-easter-close"
              onClick={() => setEasterEggOpen(false)}
              aria-label={isZh ? "关闭彩蛋" : "Close easter egg"}
            >
              <span aria-hidden="true">×</span>
            </button>
            <div className="home-easter-paw" aria-hidden="true">
              <i /><i /><i /><i /><b />
            </div>
            <span className="home-easter-kicker">PRIMERCAT · SECRET ROUTE</span>
            <h2 id="home-easter-title">{isZh ? "你发现了彩蛋！" : "You found the easter egg!"}</h2>
            <p id="home-easter-description">
              {isZh ? "跟着猫爪，你发现了站长的老巢。" : "Follow the paw prints to the webmaster’s hideout."}
            </p>
            <div className="home-easter-domain">soap628.com</div>
            <a className="home-easter-action" href="https://soap628.com" target="_blank" rel="noopener noreferrer">
              {isZh ? "点击前往" : "Visit the hideout"}<span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

// Step visual mockups — real UI-like screenshots
function StepVisual({ step, locale }: { step: number; locale: string }) {
  const isZh = locale === "zh";

  if (step === 0) {
    return (
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Mock input form */}
        <div style={{
          borderRadius: 12, background: "var(--bg-card)", border: "1px solid var(--border)",
          padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {isZh ? "基因名称" : "Gene Name"}
          </div>
          <div style={{
            padding: "9px 12px", borderRadius: 8,
            background: "var(--bg-inset)", border: "1.5px solid #ffb1ee55",
            fontSize: 15, fontWeight: 600, color: "#ffffff", fontFamily: "var(--font-mono)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>TP53</span>
            <span style={{ width: 10, height: 18, borderLeft: "2px solid #ffb1ee", opacity: 0.7, animation: "blink 1.1s step-end infinite" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(isZh ? ["人类", "小鼠"] : ["Human", "Mouse"]).map((s, i) => (
              <div key={s} style={{
                flex: 1, padding: "7px 0", borderRadius: 7, textAlign: "center",
                fontSize: 12, fontWeight: 600,
                background: i === 0 ? "rgba(255,177,238,0.15)" : "var(--bg-inset)",
                border: i === 0 ? "1px solid rgba(255,177,238,0.4)" : "1px solid var(--border)",
                color: i === 0 ? "#ffb1ee" : "var(--text-2)",
              }}>{s}</div>
            ))}
          </div>
          <div style={{
            padding: "10px 0", borderRadius: 999,
            background: "#ffb1ee", color: "#000",
            fontSize: 12, fontWeight: 800, textAlign: "center", letterSpacing: "0.06em",
            cursor: "default",
          }}>
            {isZh ? "开始设计 →" : "Design Primers →"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(isZh ? ["NM_000546", "NM_001126112"] : ["NM_000546", "NM_001126112"]).map((nm) => (
            <div key={nm} style={{
              padding: "4px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: "rgba(255,177,238,0.08)", border: "1px solid rgba(255,177,238,0.18)",
              color: "#ffb1ee", fontFamily: "var(--font-mono)",
            }}>{nm}</div>
          ))}
        </div>
      </div>
    );
  }

  if (step === 1) {
    const pipelineSteps = isZh
      ? [
          { label: "RefSeq 转录本", done: true, color: "#ffb1ee" },
          { label: "Primer3 设计", done: true, color: "#ffb1ee" },
          { label: "BLAST 初筛", done: true, color: "#539df5" },
          { label: "打分排序", done: false, color: "#ffa42b", active: true },
        ]
      : [
          { label: "RefSeq fetch", done: true, color: "#ffb1ee" },
          { label: "Primer3 design", done: true, color: "#ffb1ee" },
          { label: "BLAST screen", done: true, color: "#539df5" },
          { label: "Scoring", done: false, color: "#ffa42b", active: true },
        ];
    return (
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
        {pipelineSteps.map((ps, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 14px", borderRadius: 10,
            background: ps.active ? `rgba(255,164,43,0.08)` : "var(--bg-card)",
            border: ps.active ? "1px solid rgba(255,164,43,0.3)" : "1px solid var(--border)",
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
              background: ps.done ? ps.color : "transparent",
              border: ps.done ? "none" : `2px solid ${ps.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {ps.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              {ps.active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: ps.color, animation: "blink 1s ease-in-out infinite" }} />}
            </div>
            <span style={{ fontSize: 12, fontWeight: ps.active ? 700 : 500, color: ps.active ? "#ffffff" : "var(--text-2)", fontFamily: "var(--font-mono)", flex: 1 }}>
              {ps.label}
            </span>
            {ps.done && <span style={{ fontSize: 10, color: ps.color, fontWeight: 700 }}>✓</span>}
            {ps.active && (
              <div style={{ display: "flex", gap: 3 }}>
                {[0,1,2].map(j => (
                  <div key={j} style={{
                    width: 4, height: 4, borderRadius: "50%", background: ps.color,
                    opacity: 0.7, animationDelay: `${j * 0.2}s`,
                  }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // step 2 — results
  const pairs = [
    { rank: 1, score: 94, tm: "61.2°C", gc: "52%", exon: true, color: "#ffb1ee" },
    { rank: 2, score: 88, tm: "59.8°C", gc: "48%", exon: true, color: "#539df5" },
    { rank: 3, score: 81, tm: "60.4°C", gc: "55%", exon: false, color: "#ffa42b" },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
      {pairs.map((p) => (
        <div key={p.rank} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 10,
          background: p.rank === 1 ? `rgba(255,177,238,0.06)` : "var(--bg-card)",
          border: p.rank === 1 ? "1px solid rgba(255,177,238,0.25)" : "1px solid var(--border)",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${p.color}33, ${p.color}11)`,
            border: `1px solid ${p.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: p.color,
          }}>#{p.rank}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
              {isZh ? `引物对 ${p.rank}` : `Pair ${p.rank}`}
              {p.rank === 1 && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#ffb1ee", background: "rgba(255,177,238,0.1)", border: "1px solid rgba(255,177,238,0.3)", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.05em" }}>{isZh ? "排序首位" : "RANK 1"}</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
              Tm {p.tm} · GC {p.gc}
              {p.exon && <span style={{ marginLeft: 6, color: "#ffb1ee" }}>{isZh ? "跨外显子" : "exon-span"}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: p.color }}>{p.score}</div>
            <div style={{ fontSize: 9, color: "var(--text-2)", letterSpacing: "0.04em" }}>/100</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Easter egg: Konami Code → Cat Party ── */
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
function useKonami(onTrigger: () => void) {
  const seq = useRef<string[]>([]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      seq.current = [...seq.current, e.key].slice(-KONAMI.length);
      if (seq.current.join(",") === KONAMI.join(",")) onTrigger();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onTrigger]);
}

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations("home");
  const [party, setParty] = useState(false);
  const partyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useKonami(() => {
    setParty(true);
    if (partyTimeout.current) clearTimeout(partyTimeout.current);
    partyTimeout.current = setTimeout(() => setParty(false), 5000);
  });

  const steps = [
    {
      num: "01", title: t("how_step1_title"), desc: t("how_step1_desc"),
      ca: "#ffb1ee", cb: "#e87fd8",
    },
    {
      num: "02", title: t("how_step2_title"), desc: t("how_step2_desc"),
      ca: "#539df5", cb: "#ffb1ee",
    },
    {
      num: "03", title: t("how_step3_title"), desc: t("how_step3_desc"),
      ca: "#ffb1ee", cb: "#539df5",
    },
  ];

  const toolCards = [
    {
      tag: t("primer_card_tag"), title: t("primer_card_title"), desc: t("primer_card_desc"),
      href: "/primer",
      tagColor: "#c454a9", icon: "QP",
      glowColor: "rgba(255,177,238,0.06)",
      borderHover: "rgba(255,177,238,0.28)",
      shadowColor: "rgba(255,177,238,0.14)",
    },
    {
      tag: t("pcr_card_tag"), title: t("pcr_card_title"), desc: t("pcr_card_desc"),
      href: "/pcr",
      tagColor: "var(--home-pcr-tone)", icon: "PCR",
      glowColor: "rgba(25,185,154,0.06)",
      borderHover: "rgba(25,185,154,0.28)",
      shadowColor: "rgba(25,185,154,0.14)",
    },
    {
      tag: t("grna_card_tag"), title: t("grna_card_title"), desc: t("grna_card_desc"),
      href: "/grna",
      tagColor: "var(--home-grna-tone)", icon: "CR",
      glowColor: "rgba(83,157,245,0.06)",
      borderHover: "rgba(83,157,245,0.28)",
      shadowColor: "rgba(83,157,245,0.14)",
    },
    {
      tag: t("blast_card_tag"), title: t("blast_card_title"), desc: t("blast_card_desc"),
      href: "/blast",
      tagColor: "#b7670c", icon: "BL",
      glowColor: "rgba(255,164,43,0.06)",
      borderHover: "rgba(255,164,43,0.28)",
      shadowColor: "rgba(255,164,43,0.14)",
    },
  ];

  const featMarkers = ["TX", "EX", "SP", "RK", "QC", "RP"];
  const features = [
    { title: t("feat_transcript_title"), desc: t("feat_transcript_desc") },
    { title: t("feat_exon_title"),       desc: t("feat_exon_desc") },
    { title: t("feat_blast_title"),      desc: t("feat_blast_desc") },
    { title: t("feat_score_title"),      desc: t("feat_score_desc") },
    { title: t("feat_props_title"),      desc: t("feat_props_desc") },
    { title: t("feat_export_title"),     desc: t("feat_export_desc") },
  ];

  const openLabel = t("tools_open");
  const howLabel  = t("how_label");
  const whyLabel  = t("why_label");

  return (
    <div className="home-page-v4">
      {/* ── Easter egg: Cat Party overlay ── */}
      {party && (
        <div className="cat-party-overlay" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="cat-party-emoji" style={{
              left: `${Math.random() * 90 + 5}%`,
              animationDelay: `${Math.random() * 1.2}s`,
              animationDuration: `${1.4 + Math.random() * 1.2}s`,
              fontSize: `${20 + Math.floor(Math.random() * 24)}px`,
            }}>
              {["🐱","🧬","🎉","✨","🟢","🔬","💚","🎊","🐾","🧪"][i % 10]}
            </span>
          ))}
          <div className="cat-party-message">
            🐱 <span style={{ color: "#ffb1ee" }}>{locale === "zh" ? "彩蛋已解锁！" : "Easter egg unlocked!"}</span> {locale === "zh" ? "欢迎来到猫咪派对" : "You found the cat party"} 🎉
          </div>
        </div>
      )}

      {/* ══ HERO ══ */}
      <section className="home-hero-wrap home-breakout">
        {/* large diffuse pink glow */}
        <div className="hero-glow-blob" aria-hidden="true" />
        {/* floating ambient particles */}
        <div className="hero-particles" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="hero-particle" style={{
              left: `${8 + i * 7.5}%`,
              animationDelay: `${i * 0.45}s`,
              animationDuration: `${6 + (i % 5)}s`,
            }} />
          ))}
        </div>

        <div className="home-hero-inner">

          <ProductEvidenceGraphic locale={locale} />

          {/* headline */}
          <div className="home-hero-kicker">PRIMERCAT · {locale === "zh" ? "生命科学设计工具" : "LIFE SCIENCE DESIGN TOOLS"}</div>
          <h1 className="hero-headline">
            {locale === "zh" ? (
              <>
                <span style={{ color: "#ffffff" }}>引物</span><span style={{ color: "#ffb1ee" }}>猫</span>
                <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.85)" }}>：{t("page_headline_2")}</span>
              </>
            ) : (
              <>
                <span style={{ fontWeight: 400 }}>
                  <span style={{ color: "#ffffff" }}>Primer</span><span style={{ color: "#ffb1ee" }}>Cat</span>
                </span>
                <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.85)" }}>{" — "}{t("page_headline_2")}</span>
              </>
            )}
          </h1>

          {/* pipeline row */}
          <div className="hero-pipeline">
            {(locale === "zh"
              ? ["转录本", "Primer3", "BLAST", "评分"]
              : ["Transcript", "Primer3", "BLAST", "Ranked"]
            ).map((step, i, arr) => (
              <span key={step} className="hero-pipeline-row">
                <span className="hero-pipeline-step">{step}</span>
                {i < arr.length - 1 && <span className="hero-pipeline-arrow">→</span>}
              </span>
            ))}
            <span className="hero-pipeline-tag">
              {locale === "zh" ? "自动运行 · 依据可查" : "Automated · Evidence shown"}
            </span>
          </div>

          {/* CTAs */}
          <div className="hero-cta-row">
            <Link href="/primer" className="hero-cta">
              {t("cta_primer")}
            </Link>
            <Link href="/pcr" className="hero-cta-ghost">
              {t("cta_pcr")}
            </Link>
            <Link href="/grna" className="hero-cta-ghost">
              {t("cta_grna")}
            </Link>
            <Link href="/blast" className="hero-cta-ghost">
              {t("cta_blast")}
            </Link>
          </div>

          {/* feature pills */}
          <div className="hero-pills">
            {[t("page_feat_1"), t("page_feat_2"), t("page_feat_3")].map((f) => (
              <div key={f} className="hero-pill">
                <div className="hero-pill-dot" />
                {f}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="home-how-wrap home-breakout">
        <div className="home-how-inner">
          <div className="home-section-label">{howLabel}</div>
          <h2 className="home-section-title">{t("how_title")}</h2>
          <p className="home-section-sub">{t("how_sub")}</p>

          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`home-how-step${i % 2 === 1 ? " reverse" : ""}`}
            >
              {/* text side */}
              <div>
                <div className="home-how-step-number" style={{
                  fontSize: 64, fontWeight: 900, letterSpacing: "-0.04em",
                  lineHeight: 1, marginBottom: 8,
                  background: `linear-gradient(135deg, ${step.ca}, ${step.cb})`,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text", opacity: 0.2,
                }}>
                  {step.num}
                </div>
                <h3 className="home-how-step-title">{step.title}</h3>
                <p className="home-how-step-desc">{step.desc}</p>
              </div>

              {/* visual side */}
              <div
                className="home-how-step-visual"
                style={{ "--step-color-a": step.ca, "--step-color-b": step.cb } as React.CSSProperties}
              >
                <StepVisual step={i} locale={locale} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ TOOLS ══ */}
      <section className="home-tools-wrap home-breakout">
        <div className="home-tools-inner">
          <div className="home-section-label" style={{ color: "#ffb1ee" }}>
            {t("tools_label")}
          </div>
          <h2 className="home-section-title" style={{ color: "#ffffff" }}>
            {t("tools_title")}
          </h2>
          <p className="home-section-sub" style={{ color: "rgba(255,255,255,0.45)" }}>
            {t("tools_sub")}
          </p>

          <div className="home-tools-grid">
            {toolCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="home-tool-card"
                style={{
                  "--card-glow": card.glowColor,
                  "--card-border-hover": card.borderHover,
                  "--card-shadow-color": card.shadowColor,
                } as React.CSSProperties}
              >
                <div className="home-tool-icon" style={{ "--tool-tone": card.tagColor } as React.CSSProperties}>
                  <span>{card.icon}</span>
                </div>
                <span className="home-tool-tag" style={{ color: card.tagColor }}>{card.tag}</span>
                <p className="home-tool-title">{card.title}</p>
                <p className="home-tool-desc">{card.desc}</p>
                <span className="home-tool-cta" style={{ color: card.tagColor }}>
                  {openLabel} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="home-feats-wrap home-breakout">
        <div className="home-feats-inner">
          <div className="home-section-label">{whyLabel}</div>
          <h2 className="home-section-title">{t("features_title")}</h2>
          <p className="home-section-sub">{t("features_subtitle")}</p>

          <div className="home-features-grid">
            {features.map((f, i) => (
              <div key={f.title} className="home-feat-card">
                <div className="home-feat-icon">{featMarkers[i]}</div>
                <p className="home-feat-title">{f.title}</p>
                <p className="home-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
