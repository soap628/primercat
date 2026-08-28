import { Link } from "@/navigation";

const COPY = {
  zh: {
    badge: "工作原理",
    title: "从序列或基因名开始，系统帮你做什么",
    intro:
      "PrimerCat 包含四个核心序列工具：qPCR 引物设计、常规 PCR 引物设计、CRISPR gRNA 设计与 BLAST 序列比对。每个工具的工作方式都透明可查，结果页会把推理依据和结论边界一起带回来。",

    whyTitle: "为什么这里的结果有依据可查",
    whyCards: [
      {
        title: "自动帮你找到正确的模板",
        body: "输入基因名称，系统自动在 NCBI 数据库里找到最合适的参考序列——不需要你自己去下载或粘贴。",
      },
      {
        title: "结果附带推荐理由",
        body: "不只给你一条引物或 gRNA 序列，还告诉你它为什么排在前面：Tm、GC 含量、特异性状态、跨外显子设计……每一项都列在结果页里。",
      },
      {
        title: "局限也写在页面上",
        body: "筛查范围和边界会在结果里明确标注，不让你去猜「这个结果能信多少」。",
      },
    ],

    bgTitle: "背景知识：理解这些概念，让结果更有意义",
    bgConcepts: [
      {
        tag: "qPCR",
        color: "#22c55e",
        title: "实时定量 PCR（qPCR）",
        body: "qPCR 通过荧光染料或探针，在每个 PCR 循环实时监测扩增产物的积累量。荧光信号超过背景阈值时的循环数称为 Ct 值——Ct 越小，起始模板量越多。这使得 qPCR 成为检测基因表达量（mRNA 水平）的标准方法。",
      },
      {
        tag: "RT-qPCR",
        color: "#22c55e",
        title: "RT-qPCR：从 mRNA 到 cDNA",
        body: "检测基因表达时，先用逆转录酶将 mRNA 反转录为 cDNA（互补 DNA），再以 cDNA 为模板进行 qPCR 扩增，称为 RT-qPCR。这是目前最常用的基因表达定量方法。基因组 DNA 污染是 RT-qPCR 常见干扰源，跨外显子引物设计可有效排除该干扰。",
      },
      {
        tag: "引物设计",
        color: "#3b82f6",
        title: "Tm 和 GC%：引物稳定性的核心参数",
        body: "熔解温度（Tm）是引物与模板恰好半解链时的温度，决定了 PCR 最佳退火温度。G-C 碱基对（3 个氢键）比 A-T（2 个氢键）更稳定，GC 含量越高，Tm 越高。理想引物 Tm 在 58–62°C、GC% 在 40–60%，既保证与模板高效结合，也减少非特异性扩增。",
      },
      {
        tag: "引物设计",
        color: "#3b82f6",
        title: "跨外显子设计：排除基因组 DNA 干扰",
        body: "基因组 DNA 含有内含子，而成熟 mRNA 经剪接已将内含子去除。将引物设计在两个相邻外显子的交界处，扩增子仅存在于 cDNA 中，而不存在于基因组 DNA——从而避免基因组 DNA 残留导致的假阳性扩增。",
      },
      {
        tag: "引物设计",
        color: "#3b82f6",
        title: "发卡结构与引物二聚体",
        body: "引物自身折叠形成的发卡结构（hairpin）会阻碍其与模板结合；两条引物相互配对形成的二聚体会竞争消耗引物，降低扩增效率。PrimerCat 通过 Primer3 的热力学模型在设计阶段筛除这类结构风险高的候选引物。",
      },
      {
        tag: "CRISPR",
        color: "#7c3aed",
        title: "CRISPR-Cas9 如何编辑基因",
        body: "guide RNA（gRNA，约 20 nt）通过碱基互补配对定位到基因组目标位点，引导 Cas9 核酸酶在 PAM 位点上游 3 bp 处切割双链 DNA。细胞修复时发生非同源末端连接（NHEJ，产生插入/缺失突变，用于基因敲除）或同源定向修复（HDR，用于精准替换）。",
      },
      {
        tag: "CRISPR",
        color: "#7c3aed",
        title: "PAM 位点：Cas 蛋白识别 DNA 的钥匙",
        body: "PAM（原型间隔子邻近基序）是紧邻 gRNA 靶序列的短核苷酸序列，是 Cas 蛋白识别并结合 DNA 的必要条件。SpCas9 需要 NGG，SpCas9-NG 放宽为 NG，Cas12a 识别靶序列 5' 端的 TTTV。PAM 位点密度决定了给定序列可设计的 gRNA 数量上限。",
      },
      {
        tag: "分子生物学",
        color: "#64748b",
        title: "RefSeq：从基因名到参考序列",
        body: "NCBI RefSeq 数据库收录了经审校的基因参考转录本（NM_ 编号）和蛋白序列（NP_ 编号）。同一基因往往有多个转录本（剪接异构体）。PrimerCat 优先选取 CDS 最完整、外显子最多的主转录本作为设计模板，并在结果页注明所选转录本 ID 及选择依据。",
      },
    ],

    qpcrTitle: "qPCR 引物设计",
    qpcrIntro:
      "输入基因名称，系统自动完成模板查找、引物生成、特异性初筛、综合排序，最后把推荐理由和设计依据一起展示给你。",
    qpcrSteps: [
      {
        title: "1. 自动找到最佳参考序列",
        body: "系统从 NCBI RefSeq 数据库实时查询，筛选编码蛋白质的转录本，优先选 CDS 最完整、外显子最多的主要转录本作为设计模板。",
      },
      {
        title: "2. 按约束条件批量生成候选",
        body: "基于转录本序列，在 Tm、GC%、产物长度、发卡结构和二聚体风险的约束下批量生成引物，初步按评分过滤。",
      },
      {
        title: "3. 特异性初筛（按可用后端）",
        body: "配置了 hg38/mm10 本地索引时，候选引物由 Bowtie2 做基因组层面筛查；索引不可用时，系统将候选批量提交至 NCBI RefSeq RNA BLAST，并在结果中明确标注筛查范围。",
      },
      {
        title: "4. 多维打分 + 推荐理由",
        body: "引物按 Tm、GC%、当前特异性证据、跨外显子能力、二聚体风险五个维度综合排序。未完成远程筛查的候选不会获得特异性分。",
      },
    ],
    qpcrReadTitle: "结果页包含",
    qpcrReadItems: [
      "本次使用的参考转录本及选择依据",
      "每对引物的 Tm、GC%、产物大小、特异性状态",
      "每对引物为什么排在当前位置的具体推荐理由",
      "扩增子序列，可直接用于后续分析",
    ],
    qpcrBoundaryTitle: "需要了解的边界",
    qpcrBoundaryBody:
      "结果页会注明本次使用的是本地基因组 Bowtie2 还是 RefSeq RNA BLAST。只有前者覆盖完整参考基因组；后者属于转录本层面初筛。两者都不等同于实验室 PCR 验证。",

    grnaTitle: "CRISPR gRNA 设计",
    grnaIntro:
      "输入基因名称或直接粘贴序列，系统扫描全部 PAM 位点、按活性打分排序，并根据当前可用后端执行脱靶风险初筛。",
    grnaSteps: [
      {
        title: "1. 自动获取目标序列",
        body: "输入基因名称，系统自动从 NCBI RefSeq 获取编码序列。也可以直接粘贴任意 DNA 序列，灵活适配不同场景。",
      },
      {
        title: "2. 全序列 PAM 位点扫描",
        body: "在正链和互补链上扫描全部 PAM 位点，支持 SpCas9（NGG）、SpCas9-NG（NG）、Cas12a（TTTV）三种核酸酶。",
      },
      {
        title: "3. 活性评分排序",
        body: "基于 GC 含量、种子区序列特征、3' 末端偏好等序列特征对每条 gRNA 打分，按预测活性排序，把最有潜力的候选排在前面。",
      },
      {
        title: "4. 脱靶风险初筛（按可用后端）",
        body: "配置本地基因组索引时执行全基因组候选匹配；否则使用 NCBI BLAST 进行基础筛查。结果会明确显示使用的后端、证据强度与命中详情。",
      },
    ],
    grnaReadTitle: "结果页包含",
    grnaReadItems: [
      "按活性评分排序的全部候选 gRNA",
      "每条 gRNA 的 GC%、PAM 序列、位置和链方向",
      "脱靶筛查状态：低风险 / 中风险 / 高风险，附具体命中信息",
      "使用了哪条参考序列（基因名模式下显示转录本 ID）",
    ],
    grnaBoundaryTitle: "需要了解的边界",
    grnaBoundaryBody:
      "活性分数基于序列特征估算，不是经实验验证的预测值。BLAST 回退模式不覆盖完整基因组；即使使用本地索引，正式 CRISPR 实验前仍建议进行更严格的脱靶分析和湿实验验证。",

    sourceTitle: "数据来源",
    sources: [
      "NCBI RefSeq：转录本和模板序列（引物 + gRNA）",
      "Primer3：qPCR 与常规 PCR 引物设计算法及热力学结构检查",
      "Bowtie2 + hg38/mm10（配置后）：基因组层面筛查；NCBI BLAST：索引不可用时的转录本或序列相似性初筛",
    ],

    ctaTitle: "透明的工作方式，比承诺「准确」更可信",
    ctaBody:
      "有经验的科研用户对「保证准确」类措辞天然保持警惕。PrimerCat 的做法是：把每一步的依据和局限直接写在结果页，由用户自己判断是否足够。",
    ctaPrimer: "设计 qPCR 引物",
    ctaGrna: "设计 gRNA",
    ctaValidation: "查看可信度说明",
  },
  en: {
    badge: "How It Works",
    title: "What happens after you provide a sequence or gene name",
    intro:
      "PrimerCat includes four core sequence tools: qPCR primer design, endpoint PCR primer design, CRISPR gRNA design, and BLAST sequence alignment. Each tool is transparent about what it does, and each result page states both its reasoning and scope boundary.",

    whyTitle: "Why these results come with traceable evidence",
    whyCards: [
      {
        title: "Finds the right template for you",
        body: "Enter a gene name and the system automatically locates the best reference sequence from NCBI — no manual download or paste required.",
      },
      {
        title: "Results include the reasoning",
        body: "You get more than a primer or gRNA sequence. You see why it ranked where it did: Tm, GC content, specificity status, exon-spanning design — every factor is listed on the result page.",
      },
      {
        title: "Scope boundaries are stated clearly",
        body: "The screening scope and its limitations are labeled in the result. You won't have to guess how much to trust any individual output.",
      },
    ],

    bgTitle: "Background: concepts that make the results more useful",
    bgConcepts: [
      {
        tag: "qPCR",
        color: "#22c55e",
        title: "Real-time quantitative PCR (qPCR)",
        body: "qPCR monitors amplicon accumulation in real time using a fluorescent dye or probe. The cycle at which fluorescence crosses a background threshold is called the Ct value — the lower the Ct, the more starting template was present. This makes qPCR the standard method for measuring gene expression (mRNA levels).",
      },
      {
        tag: "RT-qPCR",
        color: "#22c55e",
        title: "RT-qPCR: from mRNA to cDNA",
        body: "To measure gene expression, mRNA is first reverse-transcribed into complementary DNA (cDNA), then amplified by qPCR — hence RT-qPCR. Genomic DNA contamination is a common source of false signal; exon-spanning primer design is the standard way to guard against it.",
      },
      {
        tag: "Primer Design",
        color: "#3b82f6",
        title: "Tm and GC%: the stability parameters",
        body: "Melting temperature (Tm) is the temperature at which half the primer–template duplexes have separated. G–C pairs (3 hydrogen bonds) are more stable than A–T (2 bonds), so higher GC% raises Tm. Ideal primers have Tm 58–62°C and GC% 40–60%, balancing efficient annealing against non-specific amplification.",
      },
      {
        tag: "Primer Design",
        color: "#3b82f6",
        title: "Exon-spanning design: blocking genomic DNA",
        body: "Mature mRNA is spliced — introns are removed. Placing a primer across an exon–exon junction creates an amplicon that exists only in cDNA, not in genomic DNA. This eliminates false-positive signal from residual genomic DNA in an RNA sample.",
      },
      {
        tag: "Primer Design",
        color: "#3b82f6",
        title: "Hairpins and primer dimers",
        body: "A hairpin forms when a primer folds back on itself, blocking template binding. Primer dimers form when two primers hybridise to each other, consuming the primers and reducing yield. PrimerCat uses Primer3's thermodynamic models to screen out high-risk candidates at the design stage.",
      },
      {
        tag: "CRISPR",
        color: "#7c3aed",
        title: "How CRISPR-Cas9 edits a gene",
        body: "A guide RNA (~20 nt) base-pairs with the genomic target and recruits Cas9 to cut both DNA strands 3 bp upstream of the PAM site. Repair by non-homologous end joining (NHEJ) introduces insertions/deletions for gene knockout; homology-directed repair (HDR) enables precise sequence substitution.",
      },
      {
        tag: "CRISPR",
        color: "#7c3aed",
        title: "PAM sites: how Cas proteins find DNA",
        body: "The PAM (protospacer adjacent motif) is a short DNA sequence adjacent to the target site that is required for Cas binding. SpCas9 requires NGG; SpCas9-NG relaxes this to NG; Cas12a recognises TTTV on the 5′ side of the target. PAM density sets the ceiling on how many guides can be designed for any given sequence.",
      },
      {
        tag: "Molecular Biology",
        color: "#64748b",
        title: "RefSeq: from gene name to reference sequence",
        body: "NCBI RefSeq archives curated reference transcripts (NM_ accessions) and proteins (NP_ accessions). A single gene often has multiple transcripts (splice isoforms). PrimerCat selects the canonical transcript with the most complete CDS and highest exon count, and records the transcript ID and selection rationale on the result page.",
      },
    ],

    qpcrTitle: "qPCR Primer Design",
    qpcrIntro:
      "Enter a gene name and the system handles transcript selection, primer generation, specificity screening, and ranked output — with the design rationale on the same page.",
    qpcrSteps: [
      {
        title: "1. Automatically find the best reference sequence",
        body: "The system queries NCBI RefSeq in real time, filters protein-coding transcripts, and selects the canonical transcript with the most complete CDS and the highest exon count as the design template.",
      },
      {
        title: "2. Generate candidates under design constraints",
        body: "Primers are generated from the transcript sequence under Tm, GC%, product size, hairpin, and dimer constraints, then pre-filtered by penalty score.",
      },
      {
        title: "3. Specificity screening with the available backend",
        body: "When an hg38/mm10 local index is configured, Bowtie2 provides genome-level screening. Otherwise, candidates are batched into an NCBI RefSeq RNA BLAST request and the narrower transcript-level scope is labeled in the result.",
      },
      {
        title: "4. Multi-factor ranking with rationale",
        body: "Primers are ranked across five dimensions — Tm, GC%, available specificity evidence, exon-spanning design, and dimer risk. Candidates with an incomplete remote screen receive no specificity points.",
      },
    ],
    qpcrReadTitle: "Every result page includes",
    qpcrReadItems: [
      "Which reference transcript was used and why",
      "Tm, GC%, product size, and specificity status for each primer pair",
      "The specific reason each pair is ranked where it is",
      "Amplicon sequence ready for downstream use",
    ],
    qpcrBoundaryTitle: "Scope boundary",
    qpcrBoundaryBody:
      "The result page states whether local-genome Bowtie2 or RefSeq RNA BLAST was used. Only the former covers the full reference genome; the latter is transcript-level screening. Neither is equivalent to wet-lab PCR validation.",

    grnaTitle: "CRISPR gRNA Design",
    grnaIntro:
      "Enter a gene name or paste a sequence directly. The system scans all PAM sites, ranks candidates by predicted activity, and screens off-target risk using whichever backend is currently available.",
    grnaSteps: [
      {
        title: "1. Automatically fetch the target sequence",
        body: "Enter a gene name and the system fetches the coding sequence from NCBI RefSeq automatically. You can also paste any DNA sequence directly for full flexibility.",
      },
      {
        title: "2. Full-sequence PAM site scan",
        body: "Both strands are scanned for all valid PAM sites. Supports SpCas9 (NGG), SpCas9-NG (NG), and Cas12a (TTTV) in the same interface.",
      },
      {
        title: "3. Activity scoring and ranking",
        body: "Each guide is scored on GC content, seed-region sequence features, and 3′ nucleotide preferences. Candidates are ranked so the most promising guides appear first.",
      },
      {
        title: "4. Off-target screening with the available backend",
        body: "A configured local-genome index enables genome-wide candidate matching; otherwise, NCBI BLAST provides a basic screen. The result identifies the backend, evidence strength, and supporting hits.",
      },
    ],
    grnaReadTitle: "Every result page includes",
    grnaReadItems: [
      "All candidate gRNAs ranked by predicted activity score",
      "GC%, PAM sequence, position, and strand for each guide",
      "Off-target risk label (Low / Medium / High) with supporting hit details",
      "Which reference sequence was used (transcript ID shown in gene-name mode)",
    ],
    grnaBoundaryTitle: "Scope boundary",
    grnaBoundaryBody:
      "Activity scores are sequence-feature estimates, not validated wet-lab predictions. BLAST fallback mode does not cover the complete genome; even with a local index, formal CRISPR work still requires rigorous off-target analysis and wet-lab confirmation.",

    sourceTitle: "Data sources",
    sources: [
      "NCBI RefSeq: transcript and template sequences (primers + gRNA)",
      "Primer3: qPCR and endpoint PCR primer design plus thermodynamic structure checks",
      "Bowtie2 + hg38/mm10 (when configured): genome-level screening; NCBI BLAST: transcript or sequence-similarity screening when an index is unavailable",
    ],

    ctaTitle: "Transparency is more credible than overpromising",
    ctaBody:
      "Researchers with experience are skeptical of tools that claim to guarantee accuracy. PrimerCat's approach: put every design decision and its limitations on the result page, and let you decide whether the evidence is sufficient.",
    ctaPrimer: "Design qPCR Primers",
    ctaGrna: "Design gRNAs",
    ctaValidation: "View Confidence Scope",
  },
} as const;

export default function MethodsPage({ params: { locale } }: { params: { locale: string } }) {
  const copy = locale === "zh" ? COPY.zh : COPY.en;

  const heroAsideTitle = locale === "zh" ? "四个工具，一套透明逻辑" : "Four tools, one transparent approach";
  const heroAsideBody = locale === "zh"
    ? "qPCR 引物、常规 PCR 引物、CRISPR gRNA、BLAST 比对。每个工具都把工作原理和结论边界写在结果页，不让你猜。"
    : "qPCR primers, endpoint PCR primers, CRISPR gRNAs, and BLAST alignment. Each tool returns its reasoning and scope boundary alongside the results.";
  const heroMetricLabel = locale === "zh" ? "核心流程" : "Core Flow";
  const heroMetricValue = "RefSeq → Design → Screen → Rank";
  const heroMetricBody = locale === "zh"
    ? "自动找模板，按约束设计，做初步筛查，最后把推荐理由写回结果页。"
    : "Auto-fetch a template, design under constraints, run a first-pass screen, return the rationale.";

  return (
    <div className="story-page">
      <section
        className="story-hero"
        style={{
          padding: "34px clamp(22px, 4vw, 40px)",
          borderRadius: 34,
          background:
            "radial-gradient(circle at top right, rgba(83,245,166,0.08), transparent 28%), linear-gradient(135deg, #0a1628 0%, #0d2238 58%, #0f3460 100%)",
          color: "#fff",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div className="story-hero-grid">
          <div className="story-hero-panel">
            <div className="story-kicker">{copy.badge}</div>
            <h1 className="story-display" style={{ margin: "16px 0 14px", maxWidth: 920 }}>
              {copy.title}
            </h1>
            <p className="story-copy" style={{ color: "rgba(255,255,255,0.84)", maxWidth: 920 }}>{copy.intro}</p>
          </div>

          <aside className="story-hero-aside">
            <div className="story-mini-label">{heroAsideTitle}</div>
            <div className="story-mini-body" style={{ marginTop: 10 }}>{heroAsideBody}</div>
            <div className="story-mini-metric">
              <div className="story-mini-label">{heroMetricLabel}</div>
              <div className="story-mini-value" style={{ fontSize: 13, letterSpacing: "0.01em" }}>{heroMetricValue}</div>
              <div className="story-mini-body">{heroMetricBody}</div>
            </div>
          </aside>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-1)" }}>{copy.whyTitle}</div>
        <div className="story-card-grid">
          {copy.whyCards.map((card) => (
            <div key={card.title} className="tool-card story-card">
              <div className="story-card-title">{card.title}</div>
              <p className="story-card-copy">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Background Knowledge ─────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-1)" }}>{copy.bgTitle}</div>
        <div className="story-card-grid bg-concepts-grid">
          {copy.bgConcepts.map((concept) => (
            <div key={concept.title} className="tool-card story-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: concept.color, background: `${concept.color}18`,
                  padding: "2px 8px", borderRadius: 20, border: `1px solid ${concept.color}40`,
                }}>
                  {concept.tag}
                </span>
              </div>
              <div className="story-card-title">{concept.title}</div>
              <p className="story-card-copy">{concept.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── qPCR Primer Design ────────────────────────────────────────── */}
      <section
        className="story-surface story-split"
        style={{ padding: "24px clamp(20px, 4vw, 30px)" }}
      >
        <div className="story-column">
          <div style={{ maxWidth: 920, marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
              qPCR
            </div>
            <h2 style={{ fontSize: 30, letterSpacing: "-0.04em", color: "var(--text-1)", marginBottom: 10 }}>{copy.qpcrTitle}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.85, color: "var(--text-2)" }}>{copy.qpcrIntro}</p>
          </div>
          <div className="story-column">
            {copy.qpcrSteps.map((step) => (
              <div key={step.title} className="tool-card story-card">
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>{step.title}</div>
                <p className="story-card-copy">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="story-column">
          <div className="tool-card story-card">
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
              {copy.qpcrReadTitle}
            </div>
            <div className="story-bullet-list">
              {copy.qpcrReadItems.map((item) => (
                <div key={item} className="story-bullet">{item}</div>
              ))}
            </div>
          </div>

          <div className="tool-card story-note-card">
            <div className="story-note-title">{copy.qpcrBoundaryTitle}</div>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: 0 }}>{copy.qpcrBoundaryBody}</p>
          </div>
        </div>
      </section>

      {/* ── CRISPR gRNA Design ────────────────────────────────────────── */}
      <section
        className="story-surface story-split"
        style={{ padding: "24px clamp(20px, 4vw, 30px)" }}
      >
        <div className="story-column">
          <div style={{ maxWidth: 920, marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--grna-color, #7c3aed)", marginBottom: 10 }}>
              CRISPR
            </div>
            <h2 style={{ fontSize: 30, letterSpacing: "-0.04em", color: "var(--text-1)", marginBottom: 10 }}>{copy.grnaTitle}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.85, color: "var(--text-2)" }}>{copy.grnaIntro}</p>
          </div>
          <div className="story-column">
            {copy.grnaSteps.map((step) => (
              <div key={step.title} className="tool-card story-card">
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>{step.title}</div>
                <p className="story-card-copy">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="story-column">
          <div className="tool-card story-card">
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--grna-color, #7c3aed)", marginBottom: 10 }}>
              {copy.grnaReadTitle}
            </div>
            <div className="story-bullet-list">
              {copy.grnaReadItems.map((item) => (
                <div key={item} className="story-bullet">{item}</div>
              ))}
            </div>
          </div>

          <div className="tool-card story-note-card">
            <div className="story-note-title">{copy.grnaBoundaryTitle}</div>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: 0 }}>{copy.grnaBoundaryBody}</p>
          </div>
        </div>
      </section>

      {/* ── Data Sources ─────────────────────────────────────────────── */}
      <section
        className="story-surface"
        style={{ padding: "20px clamp(20px, 4vw, 30px)" }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 12 }}>
          {copy.sourceTitle}
        </div>
        <div className="story-card-grid">
          {copy.sources.map((item) => (
            <div key={item} className="story-card">
              <div className="story-card-copy">{item}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section
        className="story-cta-panel"
        style={{
          padding: "26px clamp(20px, 4vw, 30px)",
          background: "linear-gradient(135deg, #0b1e3e, #15324b)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
          {locale === "zh" ? "设计原则" : "Design Principle"}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 12 }}>{copy.ctaTitle}</div>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: "rgba(255,255,255,0.78)", maxWidth: 760 }}>{copy.ctaBody}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <Link href="/primer">
            <button className="hero-btn-primary">{copy.ctaPrimer}</button>
          </Link>
          <Link href="/grna">
            <button className="hero-btn-secondary">{copy.ctaGrna}</button>
          </Link>
          <Link href="/validation">
            <button className="hero-btn-secondary">{copy.ctaValidation}</button>
          </Link>
        </div>
      </section>
    </div>
  );
}
