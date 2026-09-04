"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { productionEvidence } from "@/data/production-evidence";

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
  const easterEggAudioRef = useRef<HTMLAudioElement>(null);

  const openEasterEgg = useCallback(() => {
    setEasterEggOpen(true);
    const audio = easterEggAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, []);

  const closeEasterEgg = useCallback(() => {
    setEasterEggOpen(false);
    const audio = easterEggAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

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
        closeEasterEgg();
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
  }, [closeEasterEgg, easterEggOpen]);

  return (
    <>
      <audio ref={easterEggAudioRef} src="/audio/primer-cat-easter-egg.mp3" preload="auto" />
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
          <PrimerCatMascot locale={locale} onActivate={openEasterEgg} expanded={easterEggOpen} />
          <div className="home-evidence-primer forward" aria-hidden="true"><b>F</b><span>AGGCTGCTCCCC...</span></div>
          <div className="home-evidence-primer reverse" aria-hidden="true"><span>CGTGCAAGTCAC...</span><b>R</b></div>
        </div>

        <div className="home-evidence-metrics">
          <div><span>ΔTm</span><strong>0.3 °C</strong></div>
          <div><span>GC</span><strong>55%</strong></div>
          <div><span>{isZh ? "扩增子" : "Amplicon"}</span><strong>152 bp</strong></div>
        </div>

        <div className="home-evidence-footer">
          <div className="home-evidence-score is-status"><strong>{isZh ? "参数优秀" : "Strong parameters"}</strong><span>{isZh ? "特异性证据已记录" : "Specificity evidence recorded"}</span></div>
          <div className="home-evidence-sources"><span>NCBI RefSeq</span><span>Primer3</span><span>RNA BLAST</span></div>
        </div>
      </div>

      {easterEggOpen && (
        <div
          className="home-easter-veil"
          onMouseDown={(event) => event.target === event.currentTarget && closeEasterEgg()}
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
              onClick={closeEasterEgg}
              aria-label={isZh ? "关闭彩蛋" : "Close easter egg"}
            >
              <span aria-hidden="true">×</span>
            </button>
            <div className="home-easter-paw" aria-hidden="true">
              <i /><i /><i /><i /><b />
            </div>
            <h2 id="home-easter-title">{isZh ? "恭喜你发现了一个彩蛋！" : "Congratulations, you found an easter egg!"}</h2>
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

const HOME_REFERENCES = [
  { id: 1, citation: "Morales J, et al. A joint NCBI and EMBL-EBI transcript set for clinical genomics and research. Nature. 2022;604:310–315.", pmid: "35388217", doi: "10.1038/s41586-022-04558-8", href: "https://pubmed.ncbi.nlm.nih.gov/35388217/" },
  { id: 2, citation: "O’Leary NA, et al. Reference sequence (RefSeq) database at NCBI: current status, taxonomic expansion, and functional annotation. Nucleic Acids Res. 2016;44:D733–D745.", pmid: "26553804", doi: "10.1093/nar/gkv1189", href: "https://pubmed.ncbi.nlm.nih.gov/26553804/" },
  { id: 3, citation: "Untergasser A, et al. Primer3—new capabilities and interfaces. Nucleic Acids Res. 2012;40:e115.", pmid: "22730293", doi: "10.1093/nar/gks596", href: "https://pubmed.ncbi.nlm.nih.gov/22730293/" },
  { id: 4, citation: "Ye J, et al. Primer-BLAST: a tool to design target-specific primers for polymerase chain reaction. BMC Bioinformatics. 2012;13:134.", pmid: "22708584", doi: "10.1186/1471-2105-13-134", href: "https://pubmed.ncbi.nlm.nih.gov/22708584/" },
  { id: 5, citation: "Camacho C, et al. BLAST+: architecture and applications. BMC Bioinformatics. 2009;10:421.", pmid: "20003500", doi: "10.1186/1471-2105-10-421", href: "https://pubmed.ncbi.nlm.nih.gov/20003500/" },
  { id: 6, citation: "Doench JG, et al. Optimized sgRNA design to maximize activity and minimize off-target effects of CRISPR-Cas9. Nat Biotechnol. 2016;34:184–191.", pmid: "26780180", doi: "10.1038/nbt.3437", href: "https://pubmed.ncbi.nlm.nih.gov/26780180/" },
  { id: 7, citation: "Bustin SA, et al. MIQE 2.0: Revision of the Minimum Information for Publication of Quantitative Real-Time PCR Experiments Guidelines. Clin Chem. 2025;71:634–651.", pmid: "40272429", doi: "10.1093/clinchem/hvaf043", href: "https://pubmed.ncbi.nlm.nih.gov/40272429/" },
] as const;

const HOME_SCIENCE_COPY = {
  zh: {
    methodLabel: "方法概览",
    methodTitle: "候选结果从哪里来",
    methodIntro: "PrimerCat 为每个结果保留参考序列、设计约束、筛查范围和排序依据；研究者仍需在真实实验体系中确认其表现。",
    methodSteps: [
      { number: "01", title: "确定参考序列", body: "PrimerCat 从 NCBI RefSeq 获取记录；人类基因优先采用 MANE Select，并保留 accession 与选择规则。", note: "记录物种、版本与转录本规则", refs: [1, 2] },
      { number: "02", title: "生成候选", body: "Primer3 按长度、Tm、GC%、产物区间和热力学阈值生成引物。", note: "输出序列、坐标与扩增子", refs: [3] },
      { number: "03", title: "固定参考筛查", body: "PrimerCat 在可用的固定基因组和配套 RefSeq RNA 中模拟成对扩增，并显示数据库范围与命中上限。", note: "当前人和小鼠采用版本固定的本地参考", refs: [4, 5] },
      { number: "04", title: "排序与验证", body: "PrimerCat 用分数比较候选，但不把分数解释为成功率；研究者仍应按 MIQE 或相应框架完成实验验证。", note: "计算排序 ≠ 实验结论", refs: [6, 7] },
    ],
    toolsLabel: "科学工作流",
    toolsTitle: "四个入口，对应四类问题",
    toolsIntro: "PrimerCat 为每个工具说明计算方法、当前证据范围与不能据此推出的结论。",
    toolMethods: [
      { method: "Primer3 约束生成；RefSeq RNA BLAST 或本地基因组初筛", boundary: "用于 qPCR 候选优先级；不预测扩增效率或表达定量质量", refs: [2, 3, 4, 7] },
      { method: "Primer3 生成；可选 RefSeq genomic 配对命中筛查", boundary: "不等同于全基因组穷尽的 in-silico PCR", refs: [3, 4, 5] },
      { method: "PAM 扫描、简化活性启发分与序列相似性脱靶筛查", boundary: "风险标签不预测细胞内真实切割或编辑效率", refs: [6] },
      { method: "NCBI BLAST+ 局部相似性检索与 HSP 指标整理", boundary: "相似性本身不证明同源关系、功能或系统发育结论", refs: [5] },
    ],
    methodTerm: "方法",
    boundaryTerm: "使用边界",
    evidenceLabel: "证据解释",
    evidenceTitle: "计算完成，不等于实验有效",
    evidenceIntro: "PrimerCat 明确区分可复算数值、数据库筛查、启发式排序与实验确认。",
    evidenceItems: [
      { code: "COMPUTE", title: "确定性计算", body: "研究者可依据输入复算序列长度、GC%、坐标与配方换算。" },
      { code: "SCREEN", title: "数据库筛查", body: "PrimerCat 的筛查结论只覆盖已声明的数据库、版本、阈值与命中上限。" },
      { code: "RANK", title: "启发式排序", body: "PrimerCat 用分数帮助比较候选，但尚未在独立数据集上将其校准为成功概率。" },
      { code: "VALIDATE", title: "实验验证", body: "研究者需要通过熔解曲线、凝胶、测序、效率曲线或细胞实验确认真实表现。" },
    ],
    disclosureTitle: "诚实的结论边界",
    disclosure: "PrimerCat 报告“未发现明显非目标命中”时，并不声称绝对特异；研究者也不应把高分解释为成功率。样本变异、反应体系和细胞背景仍会改变真实结果。",
    methodsLink: "阅读完整方法",
    validationLink: "查看可信度与验证建议",
    referencesLabel: "主要文献",
    referencesTitle: "方法与文献",
    referencesIntro: "我们为核心算法、数据库与验证框架链接原始论文，并在专页公开完整方法、限制和基准数据。",
    referencesSummary: "查看 7 篇核心参考文献",
  },
  en: {
    methodLabel: "METHODS AT A GLANCE",
    methodTitle: "Where each candidate comes from",
    methodIntro: "PrimerCat retains the reference sequence, constraints, screening scope, and ranking basis for every result. Researchers must still confirm performance in the actual experimental system.",
    methodSteps: [
      { number: "01", title: "Resolve the reference", body: "PrimerCat retrieves NCBI RefSeq records. Human genes preferentially use MANE Select; the accession and applied selection rule remain visible.", note: "Record species, version, and transcript rule", refs: [1, 2] },
      { number: "02", title: "Generate candidates", body: "Primer3 applies length, Tm, GC%, product-size, and thermodynamic constraints.", note: "Output sequence, coordinates, and amplicon", refs: [3] },
      { number: "03", title: "Screen fixed references", body: "PrimerCat simulates paired amplification against available fixed genomes and matched RefSeq RNA, with the database scope and hit cap shown.", note: "Human and mouse now use version-pinned local references", refs: [4, 5] },
      { number: "04", title: "Rank and validate", body: "PrimerCat uses scores to compare candidates, not as success probabilities. Researchers must still follow MIQE or an application-appropriate validation framework.", note: "Computational rank ≠ experimental conclusion", refs: [6, 7] },
    ],
    toolsLabel: "SCIENTIFIC WORKFLOWS",
    toolsTitle: "Four entry points for four distinct questions",
    toolsIntro: "For each tool, PrimerCat states what it computes, which evidence it searches, and what the result cannot establish.",
    toolMethods: [
      { method: "Primer3 constraint generation; RefSeq RNA BLAST or local-genome screening", boundary: "Prioritises qPCR candidates; does not predict efficiency or expression-quantification quality", refs: [2, 3, 4, 7] },
      { method: "Primer3 generation with optional paired RefSeq-genomic hit screening", boundary: "Not an exhaustive whole-genome in-silico PCR", refs: [3, 4, 5] },
      { method: "PAM scan, simplified activity heuristic, and sequence-similarity off-target screen", boundary: "Risk labels do not predict cellular cleavage or editing efficiency", refs: [6] },
      { method: "NCBI BLAST+ local-similarity search with structured HSP metrics", boundary: "Similarity alone does not establish homology, function, or phylogeny", refs: [5] },
    ],
    methodTerm: "Method",
    boundaryTerm: "Boundary",
    evidenceLabel: "EVIDENCE INTERPRETATION",
    evidenceTitle: "Computed does not mean experimentally valid",
    evidenceIntro: "PrimerCat separates reproducible values, database screens, heuristic ranks, and experimental confirmation.",
    evidenceItems: [
      { code: "COMPUTE", title: "Deterministic calculation", body: "Researchers can recalculate sequence length, GC%, coordinates, and recipe arithmetic from the input." },
      { code: "SCREEN", title: "Database screen", body: "PrimerCat's screening statement covers only the declared database, version, thresholds, and hit cap." },
      { code: "RANK", title: "Heuristic rank", body: "PrimerCat uses scores to compare candidates; it does not present them as calibrated success probabilities." },
      { code: "VALIDATE", title: "Experimental validation", body: "Researchers must use melt curves, gels, sequencing, efficiency curves, or cellular assays to establish real performance." },
    ],
    disclosureTitle: "An honest conclusion boundary",
    disclosure: "When PrimerCat reports “no evident non-target hit,” it does not claim absolute specificity, and researchers should not read a high score as a success rate. Sample variation, chemistry, and cellular context can still change the outcome.",
    methodsLink: "Read the complete methods",
    validationLink: "Confidence and validation guidance",
    referencesLabel: "CORE REFERENCES",
    referencesTitle: "Methods and references",
    referencesIntro: "We link core algorithms, databases, and validation frameworks to their original papers and publish the full scope, limitations, and benchmarks on the methods pages.",
    referencesSummary: "Show 7 core references",
  },
} as const;

function HomeCitations({ ids }: { ids: readonly number[] }) {
  return (
    <sup className="home-inline-citations" aria-label={`References ${ids.join(", ")}`}>
      {ids.map((id) => {
        const reference = HOME_REFERENCES.find((item) => item.id === id);
        return <a key={id} href={reference?.href} target="_blank" rel="noopener noreferrer">[{id}]</a>;
      })}
    </sup>
  );
}

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations("home");
  const science = locale === "zh" ? HOME_SCIENCE_COPY.zh : HOME_SCIENCE_COPY.en;
  const zh = locale === "zh";
  const formatCount = new Intl.NumberFormat(zh ? "zh-CN" : "en-US").format;
  const [party, setParty] = useState(false);
  const partyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useKonami(() => {
    setParty(true);
    if (partyTimeout.current) clearTimeout(partyTimeout.current);
    partyTimeout.current = setTimeout(() => setParty(false), 5000);
  });

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
                <span className="hero-name">引物<strong>猫</strong>：</span>
                <span className="hero-promise">全自动生成</span>
                <span className="hero-promise hero-promise-last">可追溯的候选引物</span>
              </>
            ) : (
              <>
                <span className="hero-name">Primer<strong>Cat</strong></span>
                <span className="hero-promise">Design primers.</span>
                <span className="hero-promise hero-promise-last">Keep the evidence.</span>
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

      {/* ══ CURRENT PRODUCTION EVIDENCE ══ */}
      <section className="home-production-snapshot home-breakout" aria-labelledby="home-production-title">
        <div className="home-science-shell">
          <header className="home-science-header">
            <div>
              <h2 id="home-production-title">{zh ? "当前运行依据" : "Current operating basis"}</h2>
              <p>{zh ? `截至 ${productionEvidence.snapshot_date}，我们已将 PrimerCat 使用的参考组装、数据索引、计算审计和发布检查留档，并链接原始来源或机器可读记录。这些证据界定 PrimerCat 的计算范围；研究者仍需完成实验验证。` : `As of ${productionEvidence.snapshot_date}, we have recorded the reference assemblies, data indexes, computational audits, and release checks used by PrimerCat, with links to primary or machine-readable records. This evidence defines PrimerCat's computational scope; researchers must still perform experimental validation.`}</p>
            </div>
          </header>

          <div className="home-production-ledger">
            <article>
              <span>REFERENCE</span>
              <h3>{zh ? "参考数据" : "Reference data"}</h3>
              <p>
                <a href={productionEvidence.references.human.assembly_url} target="_blank" rel="noopener noreferrer">{productionEvidence.references.human.assembly_name} · {productionEvidence.references.human.assembly_accession}</a>
                <i aria-hidden="true"> / </i>
                <a href={productionEvidence.references.mouse.assembly_url} target="_blank" rel="noopener noreferrer">{productionEvidence.references.mouse.assembly_name} · {productionEvidence.references.mouse.assembly_accession}</a>
              </p>
            </article>
            <article>
              <span>INDEX</span>
              <h3>{zh ? "索引范围" : "Index scope"}</h3>
              <p>{zh ? `PrimerCat 当前索引含人类 ${formatCount(productionEvidence.references.human.grna_feature_rows)} 条注释特征记录、${formatCount(productionEvidence.references.human.transcript_locus_rows)} 条转录本—基因组定位记录，以及小鼠 ${formatCount(productionEvidence.references.mouse.grna_feature_rows)} 条注释特征记录。` : `PrimerCat currently indexes ${formatCount(productionEvidence.references.human.grna_feature_rows)} human annotation-feature records, ${formatCount(productionEvidence.references.human.transcript_locus_rows)} human transcript-to-genome locus records, and ${formatCount(productionEvidence.references.mouse.grna_feature_rows)} mouse annotation-feature records.`}</p>
            </article>
            <article>
              <span>AUDIT</span>
              <h3>{zh ? "计算覆盖审计" : "Computational coverage audit"}</h3>
              <p>{zh ? <>我们公开的固定队列纳入 {productionEvidence.computational_audit.genes} 个基因、{formatCount(productionEvidence.computational_audit.candidate_pairs_screened)} 对候选；其中 {formatCount(productionEvidence.computational_audit.combined_computational_pass_pairs)} 对满足预设联合规则，{productionEvidence.computational_audit.genes_with_at_least_one_pass}/{productionEvidence.computational_audit.genes} 个基因至少有一对通过。 <a href={productionEvidence.computational_audit.benchmark_url}>查看审计记录</a></> : <>Our public fixed cohort contains {productionEvidence.computational_audit.genes} genes and {formatCount(productionEvidence.computational_audit.candidate_pairs_screened)} candidate pairs; {formatCount(productionEvidence.computational_audit.combined_computational_pass_pairs)} pairs met the predefined joint rule, and {productionEvidence.computational_audit.genes_with_at_least_one_pass}/{productionEvidence.computational_audit.genes} genes had at least one pass. <a href={productionEvidence.computational_audit.benchmark_url}>Inspect the audit record</a></>}</p>
            </article>
            <article>
              <span>VERIFY</span>
              <h3>{zh ? "完整性与发布检查" : "Integrity and release checks"}</h3>
              <p>{zh ? `我们核对了清单所列的 ${productionEvidence.references.human.runtime_artifacts_sha256.passed}/${productionEvidence.references.human.runtime_artifacts_sha256.total} 个人类运行文件，以及本次更新涉及的 ${productionEvidence.references.mouse.updated_artifacts_sha256.passed}/${productionEvidence.references.mouse.updated_artifacts_sha256.total} 个小鼠文件；跨主机 SHA-256 均一致。PrimerCat 软件基线通过 ${productionEvidence.release.backend_tests_passed} 项后端测试，并完成 qPCR、PCR、CRISPR、BLAST 线上冒烟测试。` : `We checked all ${productionEvidence.references.human.runtime_artifacts_sha256.passed}/${productionEvidence.references.human.runtime_artifacts_sha256.total} listed human runtime files and the ${productionEvidence.references.mouse.updated_artifacts_sha256.passed}/${productionEvidence.references.mouse.updated_artifacts_sha256.total} mouse files changed in this update; every cross-host SHA-256 value matched. The PrimerCat software baseline passed ${productionEvidence.release.backend_tests_passed} backend tests and production smoke tests for qPCR, PCR, CRISPR, and BLAST.`}</p>
            </article>
          </div>

          <div className="home-production-foot">
            <p>{zh ? "研究者不应把索引记录数解释为独立基因或可用候选数量，也不应把“通过”解释为湿实验成功率。" : "Researchers should not interpret index-record counts as unique genes or usable candidates, or a pass as a wet-lab success rate."}</p>
            <div>
              <Link href="/validation#production-snapshot">{zh ? "查看完整证据说明" : "Read the full evidence note"} →</Link>
              <a href="/evidence/production-snapshot-v1.json">JSON ↗</a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SCIENTIFIC METHOD ══ */}
      <section className="home-science-methods home-breakout" aria-labelledby="home-method-title">
        <div className="home-science-shell">
          <header className="home-science-header">
            <div>
              <h2 id="home-method-title">{science.methodTitle}</h2>
              <p>{science.methodIntro}</p>
            </div>
          </header>

          <ol className="home-method-sequence">
            {science.methodSteps.map((step) => (
              <li key={step.number}>
                <span className="home-method-number">{step.number}</span>
                <h3>{step.title}</h3>
                <div className="home-method-copy">
                  <p>{step.body}<HomeCitations ids={step.refs} /></p>
                  <span>{step.note}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══ EVIDENCE BOUNDARIES ══ */}
      <section className="home-science-evidence home-breakout" aria-labelledby="home-evidence-title">
        <div className="home-science-shell">
          <header className="home-science-header">
            <div>
              <h2 id="home-evidence-title">{science.evidenceTitle}</h2>
              <p>{science.evidenceIntro}</p>
            </div>
          </header>

          <div className="home-evidence-levels">
            {science.evidenceItems.map((item) => (
              <article key={item.code}>
                <span>{item.code}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>

          <aside className="home-science-disclosure">
            <span>{science.disclosureTitle}</span>
            <p>{science.disclosure}</p>
            <div>
              <Link href="/methods">{science.methodsLink} →</Link>
              <Link href="/validation">{science.validationLink} →</Link>
            </div>
          </aside>
        </div>
      </section>

      {/* ══ REFERENCES ══ */}
      <section className="home-science-references home-breakout" aria-labelledby="home-references-title">
        <div className="home-science-shell">
          <header className="home-science-header">
            <div>
              <h2 id="home-references-title">{science.referencesTitle}</h2>
              <p>{science.referencesIntro}</p>
            </div>
          </header>

          <details className="home-reference-details">
            <summary>{science.referencesSummary}</summary>
            <ol className="home-reference-list">
              {HOME_REFERENCES.map((reference) => (
                <li key={reference.id} id={`home-reference-${reference.id}`}>
                  <span>{String(reference.id).padStart(2, "0")}</span>
                  <div className="home-reference-record">
                    <a className="home-reference-title-link" href={reference.href} target="_blank" rel="noopener noreferrer">
                      {reference.citation}<span aria-hidden="true"> ↗</span>
                    </a>
                    <span>
                      <a href={reference.href} target="_blank" rel="noopener noreferrer">PMID {reference.pmid}</a>
                      <i aria-hidden="true">·</i>
                      <a href={`https://doi.org/${reference.doi}`} target="_blank" rel="noopener noreferrer">DOI {reference.doi}</a>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </details>
        </div>
      </section>

    </div>
  );
}
