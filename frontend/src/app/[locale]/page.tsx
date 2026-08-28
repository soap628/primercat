"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import HomeTopBar from "../HomeTopBar";
import { useEffect, useState, useRef } from "react";

function CatLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <ellipse cx="11" cy="13.5" rx="7.5" ry="6.8" fill="white" opacity="0.96" />
      <polygon points="4.2,10 6.5,3.5 9.8,8.8" fill="white" opacity="0.96" />
      <polygon points="17.8,10 15.5,3.5 12.2,8.8" fill="white" opacity="0.96" />
      <polygon points="5.4,9.6 7,5.2 9.2,8.8" fill="#fca5a5" opacity="0.65" />
      <polygon points="16.6,9.6 15,5.2 12.8,8.8" fill="#fca5a5" opacity="0.65" />
      <circle cx="8.2" cy="13" r="1.4" fill="#ffb1ee" />
      <circle cx="13.8" cy="13" r="1.4" fill="#ffb1ee" />
      <circle cx="8.7" cy="12.5" r="0.45" fill="white" />
      <circle cx="14.3" cy="12.5" r="0.45" fill="white" />
      <ellipse cx="11" cy="16.2" rx="0.9" ry="0.65" fill="#fca5a5" opacity="0.9" />
    </svg>
  );
}

function QpcrCatAnimation() {
  return (
    <svg className="qpcr-anim" viewBox="0 0 560 190" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="dnaGrad" x1="0" y1="0" x2="560" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(255,177,238,0)" />
          <stop offset="25%"  stopColor="rgba(255,177,238,0.2)" />
          <stop offset="50%"  stopColor="rgba(83,157,245,0.15)" />
          <stop offset="75%"  stopColor="rgba(255,177,238,0.2)" />
          <stop offset="100%" stopColor="rgba(255,177,238,0)" />
        </linearGradient>
        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Background DNA helix ── */}
      <g className="qpcr-dna-bg">
        <path d="M10 93 C50 85,90 101,130 93 C170 85,210 101,250 93 C290 85,330 101,370 93 C410 85,450 101,490 93 C515 89,540 91,550 93"
          stroke="url(#dnaGrad)" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M10 107 C50 115,90 99,130 107 C170 115,210 99,250 107 C290 115,330 99,370 107 C410 115,450 99,490 107 C515 111,540 109,550 107"
          stroke="url(#dnaGrad)" strokeWidth="1.4" strokeLinecap="round" />
        {[60,100,140,180,380,420,460,500].map((x) => (
          <line key={x} x1={x} y1="95" x2={x} y2="105" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        ))}
      </g>

      {/* ── Left primer tag ── */}
      <g className="qpcr-primer-left">
        <line x1="78" y1="100" x2="232" y2="100" stroke="#ffb1ee" strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/>
        <text x="82" y="93" fontSize="8" fill="#ffb1ee" fontWeight="700" letterSpacing="0.07em" opacity="0.7">5′→3′  F</text>
      </g>

      {/* ── Right primer tag ── */}
      <g className="qpcr-primer-right">
        <line x1="328" y1="100" x2="482" y2="100" stroke="#539df5" strokeWidth="1.6" strokeLinecap="round" opacity="0.65"/>
        <text x="430" y="93" fontSize="8" fill="#539df5" fontWeight="700" letterSpacing="0.07em" opacity="0.7">R  3′←5′</text>
      </g>

      {/* ── Cat — main character ── */}
      <g className="qpcr-cat-body" filter="url(#softGlow)">
        {/* halo */}
        <circle cx="280" cy="103" r="56" fill="rgba(255,177,238,0.10)" className="cat-halo"/>

        {/* ears */}
        <polygon points="240,76 248,50 265,74" fill="#ffb1ee" opacity="0.97"/>
        <polygon points="320,76 312,50 295,74" fill="#ffb1ee" opacity="0.97"/>
        <polygon points="244,74 250,57 262,72" fill="#fca5a5" opacity="0.6"/>
        <polygon points="316,74 310,57 298,72" fill="#fca5a5" opacity="0.6"/>

        {/* body */}
        <circle cx="280" cy="105" r="45" fill="#ffb1ee" opacity="0.97"/>

        {/* eyes */}
        <g className="cat-eye-left">
          <ellipse cx="264" cy="100" rx="6.5" ry="7" fill="white" opacity="0.95"/>
          <circle cx="265" cy="100.5" r="4.2" fill="#111"/>
          <circle cx="263.5" cy="98.5" r="1.5" fill="white"/>
        </g>
        <g className="cat-eye-right">
          <ellipse cx="296" cy="100" rx="6.5" ry="7" fill="white" opacity="0.95"/>
          <circle cx="297" cy="100.5" r="4.2" fill="#111"/>
          <circle cx="295.5" cy="98.5" r="1.5" fill="white"/>
        </g>

        {/* nose */}
        <ellipse cx="280" cy="113" rx="3.5" ry="2.2" fill="#fca5a5" opacity="0.9"/>
        {/* mouth */}
        <path d="M277 115.5 Q280 119.5 283 115.5" stroke="#fca5a5" strokeWidth="1" fill="none" opacity="0.75"/>

        {/* whiskers */}
        <line x1="246" y1="110" x2="262" y2="112" stroke="white" strokeWidth="0.9" opacity="0.4"/>
        <line x1="246" y1="115" x2="262" y2="115" stroke="white" strokeWidth="0.9" opacity="0.4"/>
        <line x1="298" y1="112" x2="314" y2="110" stroke="white" strokeWidth="0.9" opacity="0.4"/>
        <line x1="298" y1="115" x2="314" y2="115" stroke="white" strokeWidth="0.9" opacity="0.4"/>
      </g>

      {/* ── Tail ── */}
      <g className="qpcr-tail">
        <path d="M319 127 C350 144 370 164 357 151 C344 138 328 150 320 139"
          stroke="#ffb1ee" strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.88"/>
      </g>

      {/* ── Floating badges ── */}
      <g className="qpcr-badge badge-left">
        <rect x="36" y="130" width="76" height="22" rx="6"
          fill="rgba(255,177,238,0.08)" stroke="rgba(255,177,238,0.22)" strokeWidth="1"/>
        <text x="74" y="145" textAnchor="middle" fontSize="9" fill="#ffb1ee" fontWeight="700">TP53  ✓</text>
      </g>
      <g className="qpcr-badge badge-right">
        <rect x="448" y="130" width="82" height="22" rx="6"
          fill="rgba(83,157,245,0.08)" stroke="rgba(83,157,245,0.22)" strokeWidth="1"/>
        <text x="489" y="145" textAnchor="middle" fontSize="9" fill="#539df5" fontWeight="700">Score 94 / 100</text>
      </g>
      <g className="qpcr-badge badge-top">
        <rect x="196" y="22" width="168" height="22" rx="6"
          fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
        <text x="280" y="37" textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.42)" fontWeight="600" letterSpacing="0.05em">Primer3 · BLAST · RefSeq</text>
      </g>
    </svg>
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
              {p.rank === 1 && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#ffb1ee", background: "rgba(255,177,238,0.1)", border: "1px solid rgba(255,177,238,0.3)", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.05em" }}>{isZh ? "推荐" : "TOP"}</span>}
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

  const stats = [
    { value: t("stat_primers_value"), label: t("stat_primers_label") },
    { value: t("stat_users_value"),   label: t("stat_users_label") },
    { value: t("stat_species_value"), label: t("stat_species_label") },
  ];

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
      iconBg: "linear-gradient(135deg,#121212,#ffb1ee)",
      tagColor: "#ffb1ee", icon: "Q",
      glowColor: "rgba(255,177,238,0.06)",
      borderHover: "rgba(255,177,238,0.28)",
      shadowColor: "rgba(255,177,238,0.14)",
    },
    {
      tag: t("pcr_card_tag"), title: t("pcr_card_title"), desc: t("pcr_card_desc"),
      href: "/pcr",
      iconBg: "linear-gradient(135deg,#121212,#19b99a)",
      tagColor: "#36d7b7", icon: "P",
      glowColor: "rgba(25,185,154,0.06)",
      borderHover: "rgba(25,185,154,0.28)",
      shadowColor: "rgba(25,185,154,0.14)",
    },
    {
      tag: t("grna_card_tag"), title: t("grna_card_title"), desc: t("grna_card_desc"),
      href: "/grna",
      iconBg: "linear-gradient(135deg,#121212,#539df5)",
      tagColor: "#539df5", icon: "C",
      glowColor: "rgba(83,157,245,0.06)",
      borderHover: "rgba(83,157,245,0.28)",
      shadowColor: "rgba(83,157,245,0.14)",
    },
    {
      tag: t("blast_card_tag"), title: t("blast_card_title"), desc: t("blast_card_desc"),
      href: "/blast",
      iconBg: "linear-gradient(135deg,#181818,#ffa42b)",
      tagColor: "#ffa42b", icon: "B",
      glowColor: "rgba(255,164,43,0.06)",
      borderHover: "rgba(255,164,43,0.28)",
      shadowColor: "rgba(255,164,43,0.14)",
    },
  ];

  const featIcons = ["🧬", "🔬", "🎯", "📊", "🔭", "📄"];
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
    <div>
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
            🐱 <span style={{ color: "#ffb1ee" }}>Easter egg unlocked!</span> You found the cat party 🎉
          </div>
        </div>
      )}

      <HomeTopBar locale={locale} />

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

          {/* animation */}
          <QpcrCatAnimation />

          {/* headline */}
          <h1 className="hero-headline">
            {locale === "zh" ? (
              <>
                <span style={{ color: "#ffffff" }}>引物</span><span style={{ color: "#ffb1ee" }}>猫</span>
                <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.85)" }}>{" — "}{t("page_headline_2")}</span>
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
              {locale === "zh" ? "全程自动 · 每步可查" : "Automated · Traceable"}
            </span>
          </div>

          {/* CTAs */}
          <div className="hero-cta-row">
            <Link href="/primer" className="hero-cta">
              {t("cta_primer")}
            </Link>
            <Link href="/grna" className="hero-cta-ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              {t("cta_grna")}
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

          {/* stats */}
          <div className="hero-stats">
            {stats.map((s, idx) => (
              <div key={s.label} className="hero-stat">
                {idx === 2 ? (
                  <div className="hero-stat-species">
                    {s.value.split(" · ").map((sp) => (
                      <span key={sp} className="hero-stat-species-pill">{sp}</span>
                    ))}
                  </div>
                ) : (
                  <div className="hero-stat-value">{s.value}</div>
                )}
                <div className="hero-stat-label">{s.label}</div>
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
                <div style={{
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
                <div className="home-tool-icon" style={{ background: card.iconBg }}>
                  <span style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>{card.icon}</span>
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
                <div className="home-feat-icon">{featIcons[i]}</div>
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
