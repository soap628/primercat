export type ProtocolCategory = "nucleic-acid" | "cloning" | "microbiology" | "protein";

export type LocalizedProtocolText = {
  zh: string;
  en: string;
};

export type ProtocolStep = {
  title: LocalizedProtocolText;
  body: LocalizedProtocolText;
  checkpoint?: LocalizedProtocolText;
};

export type ProtocolParameter = {
  label: LocalizedProtocolText;
  value: LocalizedProtocolText;
  note: LocalizedProtocolText;
};

export type ProtocolRecord = {
  id: string;
  category: ProtocolCategory;
  title: LocalizedProtocolText;
  summary: LocalizedProtocolText;
  duration: LocalizedProtocolText;
  difficulty: "routine" | "advanced";
  applicability: LocalizedProtocolText;
  parameters: ProtocolParameter[];
  controls: LocalizedProtocolText[];
  materials: LocalizedProtocolText[];
  steps: ProtocolStep[];
  acceptance: LocalizedProtocolText[];
  records: LocalizedProtocolText[];
  critical: LocalizedProtocolText;
  safety: LocalizedProtocolText;
  sourceLabel: string;
  sourceUrl: string;
};

const t = (zh: string, en: string): LocalizedProtocolText => ({ zh, en });

export const PROTOCOLS: ProtocolRecord[] = [
  {
    id: "high-fidelity-pcr",
    category: "nucleic-acid",
    title: t("高保真 PCR", "High-fidelity PCR"),
    summary: t("从反应设计、主混合液到扩增后验证的基础工作流。参数以 Phusion 为示例，实际设置必须跟随所用酶说明书。", "A bench workflow from reaction planning and master mix setup to post-run verification. Phusion is the worked example; settings must follow the polymerase actually used."),
    duration: t("约 1.5–3 小时", "About 1.5–3 hours"),
    difficulty: "routine",
    applicability: t("适用于使用 NEB Phusion High-Fidelity DNA Polymerase 的常规 DNA 扩增参考。若使用其他聚合酶、热启动体系、长片段、GC-rich 模板或临床/诊断样本，必须采用相应产品说明书和本机构验证流程。", "Reference workflow for routine DNA amplification with NEB Phusion High-Fidelity DNA Polymerase. Other polymerases, hot-start systems, long or GC-rich templates, and clinical/diagnostic samples require the applicable product manual and institutional validation."),
    parameters: [
      { label: t("反应体积", "Reaction volume"), value: t("20 µL 或 50 µL", "20 µL or 50 µL"), note: t("NEB Phusion 示例体系；缩放时保持各组分终浓度。", "NEB Phusion example; preserve final concentrations when scaling.") },
      { label: t("引物终浓度", "Final primer concentration"), value: t("各 0.5 µM", "0.5 µM each"), note: t("对应 10 µM 引物在 20 µL 体系中各加 1 µL。", "Equivalent to 1 µL of each 10 µM primer in a 20 µL reaction.") },
      { label: t("dNTP 终浓度", "Final dNTP concentration"), value: t("各 200 µM", "200 µM each"), note: t("以 10 mM dNTP mix 为例，20 µL 体系加入 0.4 µL。", "For a 10 mM dNTP mix, add 0.4 µL to a 20 µL reaction.") },
      { label: t("循环框架", "Cycling framework"), value: t("98°C 30 s；25–35 cycles", "98°C 30 s; 25–35 cycles"), note: t("变性 98°C 5–10 s；退火由 NEB Tm Calculator 确定；72°C 延伸 15–30 s/kb。仅适用于所引 Phusion 条件。", "Denature at 98°C for 5–10 s; determine annealing with NEB Tm Calculator; extend at 72°C for 15–30 s/kb. Applies only to the cited Phusion conditions.") },
    ],
    controls: [
      t("无模板对照（NTC）：监测主混合液、环境或移液过程污染。", "No-template control (NTC): monitors contamination in master mix, environment, or pipetting."),
      t("阳性扩增对照：在新引物、新模板类型或排错时确认反应体系有效。", "Positive amplification control: confirms reaction competence for new primers, template types, or troubleshooting."),
      t("必要时设置提取空白或逆转录阴性对照，控制上游步骤引入的信号。", "Where relevant, include extraction blanks or no-RT controls for signal introduced upstream."),
    ],
    materials: [
      t("高保真聚合酶、配套缓冲液与 dNTP", "High-fidelity polymerase, supplied buffer, and dNTPs"),
      t("正向/反向引物、模板 DNA 与无核酸酶水", "Forward/reverse primers, template DNA, and nuclease-free water"),
      t("PCR 管、冰盒、移液器与热循环仪", "PCR tubes, ice bucket, pipettes, and thermocycler"),
      t("无模板对照；需要时加入阳性对照", "No-template control and, where appropriate, a positive control"),
    ],
    steps: [
      { title: t("确认反应体系", "Confirm the reaction system"), body: t("打开当前聚合酶的产品说明书，记录缓冲液倍数、推荐引物浓度、模板范围、退火温度算法和延伸速率。不要把不同酶的参数混用。", "Open the current polymerase manual and record buffer strength, primer concentration, template range, annealing-temperature method, and extension rate. Do not mix parameters across enzymes."), checkpoint: t("已确认酶名称、批次与有效期。", "Polymerase identity, lot, and expiry are confirmed.") },
      { title: t("规划对照与孔位", "Plan controls and tube positions"), body: t("至少设置无模板对照，并在需要判断体系是否工作的场景加入阳性对照。先建立加样表，再标记所有反应管。", "Include at least a no-template control and add a positive control when reaction performance must be distinguished from sample failure. Make a loading map before labeling tubes.") },
      { title: t("配制主混合液", "Prepare the master mix"), body: t("在冰上解冻并轻柔混匀组分。按反应数外加合理移液余量配制不含模板的主混合液；聚合酶按说明书要求最后加入。", "Thaw and gently mix components on ice. Prepare a template-free master mix with a sensible pipetting overage; add polymerase last when directed by its manual."), checkpoint: t("主混合液均一且没有明显气泡。", "Master mix is homogeneous without obvious bubbles.") },
      { title: t("分装并加入模板", "Aliquot and add template"), body: t("将主混合液分装到各管，在独立区域加入模板和对照，换枪头避免交叉污染；短暂离心收集液体。", "Aliquot the master mix, add templates and controls in a separate area, change tips to prevent cross-contamination, and briefly spin down."), checkpoint: t("无模板对照最后开盖、最后处理。", "The no-template control is opened and handled last.") },
      { title: t("运行热循环", "Run the thermocycler"), body: t("Phusion 的常规参考是 98°C 初始变性，25–35 个循环，并按 NEB Tm 工具确定退火温度、按片段复杂度设置 15–30 秒/kb 延伸；其他酶必须使用各自参数。", "For Phusion, the routine reference uses 98°C initial denaturation, 25–35 cycles, annealing determined with the NEB Tm tool, and roughly 15–30 s/kb extension depending on template complexity. Other enzymes require their own settings.") },
      { title: t("验证并记录", "Verify and document"), body: t("结合扩增目的选择琼脂糖凝胶、片段分析或下游纯化。先检查对照，再解释样本；记录程序、模板量、引物批次和异常。", "Choose agarose gel analysis, fragment analysis, or cleanup according to the goal. Inspect controls before interpreting samples, and record the program, template input, primer lots, and anomalies."), checkpoint: t("无模板对照未出现目标条带。", "No target-sized band is present in the no-template control.") },
    ],
    acceptance: [
      t("NTC 在目标片段区域无可见扩增；阳性对照产生预期大小条带。", "No visible NTC amplification at the target size; the positive control yields the expected band."),
      t("样本主条带与预期片段大小一致，且非特异条带/拖尾在下游用途允许范围内。", "The principal sample band matches expected size and nonspecific products or smearing are acceptable for the downstream use."),
      t("所有偏离预设程序、试剂替换和重复实验均被记录。", "All deviations, reagent substitutions, and repeats are documented."),
    ],
    records: [
      t("模板 ID、类型、输入量与保存位置", "Template ID, type, input amount, and storage location"),
      t("引物序列/批次、工作液浓度与目标片段长度", "Primer sequences/lots, working concentration, and target length"),
      t("聚合酶货号/批次、反应配方、热循环程序与凝胶原图", "Polymerase catalog/lot, reaction recipe, cycling program, and original gel image"),
    ],
    critical: t("本卡的温度和时间只对应所引 Phusion 示例。不同聚合酶、模板 GC 含量与扩增长度会改变最优条件。", "Temperatures and times on this card apply only to the cited Phusion example. Polymerase choice, template GC content, and amplicon length change the optimum."),
    safety: t("扩增产物区与反应配制区分开；凝胶染料、UV/蓝光成像和含样废物按本实验室 SDS、SOP 与分区制度处理。", "Separate post-amplification work from reaction setup. Handle gel stains, UV/blue-light imaging, and sample waste under laboratory SDS, SOP, and zoning controls."),
    sourceLabel: "NEB · Phusion High-Fidelity DNA Polymerase protocol",
    sourceUrl: "https://www.neb.com/protocols/pcr-protocol-m0530",
  },
  {
    id: "agarose-gel-electrophoresis",
    category: "nucleic-acid",
    title: t("琼脂糖凝胶电泳", "Agarose gel electrophoresis"),
    summary: t("配胶、上样、电泳和成像的一体化检查清单，适合 DNA 片段大小判断与后续切胶前确认。", "A single checklist for casting, loading, running, and imaging DNA gels for size assessment or pre-purification checks."),
    duration: t("约 1.5–2 小时", "About 1.5–2 hours"),
    difficulty: "routine",
    applicability: t("适用于常规双链 DNA 片段的琼脂糖凝胶分离、大小估计和切胶前检查。不适用于需要单碱基分辨率、极短寡核苷酸或脉冲场电泳的样本。", "For routine separation, approximate sizing, and pre-excision inspection of double-stranded DNA. Not intended for single-base resolution, very short oligonucleotides, or pulsed-field applications."),
    parameters: [
      { label: t("琼脂糖浓度", "Agarose concentration"), value: t("常见 0.7%–2.0% (w/v)", "Commonly 0.7%–2.0% (w/v)"), note: t("按目标片段范围选择；低浓度更利于大片段分离，高浓度更利于小片段。", "Choose by target size; lower percentages favor larger fragments and higher percentages smaller fragments.") },
      { label: t("运行缓冲液", "Running buffer"), value: t("1× TAE 或 1× TBE", "1× TAE or 1× TBE"), note: t("凝胶和电泳槽必须使用同一种、同浓度缓冲液。", "Gel and tank must use the same buffer at the same concentration.") },
      { label: t("参考电压", "Reference voltage"), value: t("80–150 V", "80–150 V"), note: t("Addgene 通用参考；应结合电极间距、胶尺寸和设备上限判断。", "Addgene general reference; interpret with electrode spacing, gel size, and equipment limits.") },
      { label: t("停止点", "Stopping point"), value: t("示踪染料迁移至胶长约 75%–80%", "Tracking dye at about 75%–80% of gel length"), note: t("以所用上样染料说明书和目标片段分辨率为准。", "Subject to the loading-dye guide and required fragment resolution.") },
    ],
    controls: [
      t("使用覆盖预期片段范围且批次可追溯的 DNA ladder。", "Use a traceable DNA ladder spanning the expected fragment range."),
      t("酶切或 PCR 结果判读时保留对应未切、NTC 或阳性对照。", "Retain the applicable uncut, NTC, or positive control for digest or PCR interpretation."),
      t("切胶纯化时设置未暴露于高能 UV 的对照或尽量采用蓝光。", "For gel purification, use a non-high-energy-UV control or blue light where possible."),
    ],
    materials: [
      t("琼脂糖、1× TAE 或 1× TBE（胶与槽保持一致）", "Agarose and 1× TAE or 1× TBE, kept identical in gel and tank"),
      t("上样缓冲液、DNA ladder 与核酸染料", "Loading buffer, DNA ladder, and nucleic-acid stain"),
      t("制胶托盘、梳子、电泳槽与电源", "Casting tray, comb, gel tank, and power supply"),
      t("适用于所用染料的成像设备", "An imaging system compatible with the selected stain"),
    ],
    steps: [
      { title: t("选择胶浓度", "Choose gel percentage"), body: t("按目标片段范围选择琼脂糖浓度；常见起点为 0.7%–2%。小片段通常需要更高浓度，大片段通常需要更低浓度。", "Choose agarose percentage for the target fragment range; 0.7%–2% is a common starting span. Smaller fragments generally need higher percentage and larger fragments lower percentage.") },
      { title: t("溶解琼脂糖", "Dissolve agarose"), body: t("将琼脂糖加入与电泳槽相同的 1× 缓冲液，分段加热并间歇轻摇，直至完全澄清。预留足够瓶体空间，防止暴沸。", "Add agarose to the same 1× buffer used in the tank. Heat in short intervals and swirl between them until clear, leaving ample flask headspace to prevent boil-over."), checkpoint: t("溶液中没有可见颗粒。", "No visible particles remain.") },
      { title: t("冷却、加染料并制胶", "Cool, stain, and cast"), body: t("按染料说明书决定预染或后染。溶液冷却到适合制胶的温度后再加入热敏染料，放置梳子并缓慢倒胶，排除梳齿附近气泡。", "Follow the stain manual for pre- or post-staining. Cool the solution to a casting-safe temperature before adding heat-sensitive stain, position the comb, pour slowly, and remove bubbles near the wells.") },
      { title: t("准备样本与槽体", "Prepare samples and tank"), body: t("凝胶完全凝固后放入电泳槽，用相同 1× 缓冲液覆盖。样本加入合适倍数的上样缓冲液，并准备匹配片段范围的 ladder。", "Once fully set, place the gel in the tank and cover with the same 1× buffer. Add the correct loading-buffer amount to samples and choose a ladder spanning the expected fragments."), checkpoint: t("DNA 将从负极向正极迁移，方向已核对。", "Orientation is checked so DNA migrates from negative to positive.") },
      { title: t("上样并运行", "Load and run"), body: t("先上 ladder，再缓慢加入样本，避免刺穿胶孔。Addgene 参考在 80–150 V 运行，直到示踪染料迁移到胶长约 75%–80%；实际电压受胶尺寸和设备限制。", "Load the ladder first, then samples slowly without piercing wells. The Addgene reference runs at 80–150 V until tracking dye reaches about 75%–80% of the gel; actual voltage depends on gel dimensions and equipment."), checkpoint: t("开始运行后气泡和迁移方向正常。", "Bubbles and migration direction look normal after starting.") },
      { title: t("断电后成像", "Power off and image"), body: t("先关闭电源并断开电极，再取出凝胶。按染料要求使用蓝光或 UV 成像；若要回收 DNA，尽量减少高能 UV 暴露。", "Switch off and disconnect the power before removing the gel. Image with blue light or UV as required by the stain; minimize high-energy UV exposure if DNA will be recovered.") },
    ],
    acceptance: [
      t("ladder 条带可分辨且覆盖样本预期片段区间。", "Ladder bands are resolved and span the expected sample range."),
      t("样本泳道无由上样失败、反向运行、缓冲液错误或过载造成的不可解释异常。", "Sample lanes show no unexplained failure due to loading, reversed polarity, incorrect buffer, or overload."),
      t("原始未裁剪图像中包含 ladder、全部样本泳道和曝光信息。", "The original uncropped image includes ladder, all sample lanes, and exposure information."),
    ],
    records: [
      t("胶浓度、缓冲液种类/批次、染料名称与终浓度", "Gel percentage, buffer type/lot, stain identity, and final concentration"),
      t("样本 ID、上样量、ladder 型号和泳道图", "Sample IDs, loading amounts, ladder model, and lane map"),
      t("电压、运行时间、成像设备、曝光设置与原始图像路径", "Voltage, run time, imager, exposure settings, and raw-image path"),
    ],
    critical: t("胶和电泳槽必须使用同一种、同浓度运行缓冲液；水不能替代 TAE/TBE。", "The gel and tank must use the same running buffer at the same concentration; water is not a substitute for TAE/TBE."),
    safety: t("热琼脂糖可能暴沸并造成烫伤；UV 会伤害皮肤和眼睛；核酸染料按实际产品 SDS 与废物规则管理。", "Hot agarose can erupt and burn. UV damages skin and eyes. Manage nucleic-acid stains under the actual product SDS and waste rules."),
    sourceLabel: "Addgene · Agarose Gel Electrophoresis",
    sourceUrl: "https://www.addgene.org/protocols/gel-electrophoresis/",
  },
  {
    id: "restriction-digest",
    category: "cloning",
    title: t("质粒限制性内切酶消化", "Restriction digest of plasmid DNA"),
    summary: t("从酶切位点核对、缓冲液兼容到凝胶验证的通用框架，适合诊断酶切和克隆前制备。", "A general framework from site and buffer checks through gel verification for diagnostic digests and cloning preparation."),
    duration: t("约 1–4 小时", "About 1–4 hours"),
    difficulty: "routine",
    applicability: t("适用于质粒 DNA 的诊断酶切或限制性克隆前制备。双酶切、甲基化敏感位点、高盐/高甘油体系及需要高完整度回收的克隆制备必须按具体酶数据页评估。", "For diagnostic digestion of plasmid DNA or preparation before restriction cloning. Double digests, methylation-sensitive sites, high-salt or high-glycerol reactions, and high-integrity cloning preparations require enzyme-specific evaluation."),
    parameters: [
      { label: t("DNA 输入", "DNA input"), value: t("诊断约 500 ng；克隆常约 1 µg", "About 500 ng diagnostic; about 1 µg cloning"), note: t("Addgene 通用参考；以 DNA 纯度、酶单位定义与下游需求为准。", "Addgene general reference; adjust for DNA purity, enzyme unit definition, and downstream need.") },
      { label: t("反应总体积", "Total reaction volume"), value: t("通常 10–50 µL", "Typically 10–50 µL"), note: t("由 DNA 体积、酶体积、甘油比例和厂家建议共同决定。", "Determined jointly by DNA volume, enzyme volume, glycerol fraction, and manufacturer guidance.") },
      { label: t("酶用量", "Enzyme amount"), value: t("按单位活性计算", "Calculate from unit activity"), note: t("1 unit 的定义通常是在规定条件下 1 小时切割 1 µg DNA；必须查看实际产品定义。", "One unit commonly digests 1 µg DNA in 1 hour under defined conditions; verify the actual product definition.") },
      { label: t("温度与时间", "Temperature and time"), value: t("产品特异", "Product-specific"), note: t("诊断常见 1–2 小时，克隆制备可更长；不得默认所有酶均为 37°C。", "Diagnostic digests commonly run 1–2 hours and cloning preparations may be longer; do not assume every enzyme runs at 37°C.") },
    ],
    controls: [
      t("未切质粒对照：区分质粒构象与真实酶切片段。", "Uncut plasmid control: distinguishes plasmid conformations from true digest fragments."),
      t("已知可切 DNA 或阳性酶切对照：排除酶/缓冲液失活。", "Known digestible DNA or positive digest control: rules out inactive enzyme or buffer."),
      t("双酶切或克隆制备时保留单酶切对照，帮助定位兼容性问题。", "For double digests or cloning preparation, retain single-enzyme controls to localize compatibility failures."),
    ],
    materials: [
      t("纯化质粒 DNA 与所选限制酶", "Purified plasmid DNA and selected restriction enzyme(s)"),
      t("厂家推荐缓冲液；需要时加入 BSA", "Manufacturer-recommended buffer and BSA where required"),
      t("无核酸酶水、恒温设备和电泳材料", "Nuclease-free water, incubator, and electrophoresis supplies"),
      t("未切质粒对照与预期片段图", "Uncut-plasmid control and expected fragment map"),
    ],
    steps: [
      { title: t("核对酶切图谱", "Verify the digest map"), body: t("确认识别位点数量、预期片段大小、方向和是否会切到目标插入片段；诊断酶切应选择能在凝胶上清楚区分的条带组合。", "Confirm recognition-site count, expected fragment sizes, orientation, and whether the target insert is cut. Diagnostic digests should yield bands that can be resolved clearly on a gel."), checkpoint: t("预期条带总长度等于质粒总长度。", "Expected fragment lengths sum to the plasmid length.") },
      { title: t("检查兼容性", "Check compatibility"), body: t("查阅当前酶产品页，确认缓冲液活性、反应温度、甲基化敏感性、热灭活条件和双酶切兼容性。", "Check the current enzyme product page for buffer activity, reaction temperature, methylation sensitivity, heat-inactivation conditions, and double-digest compatibility."), checkpoint: t("双酶切的两种酶在所选条件下均有足够活性。", "Both enzymes have adequate activity under the selected double-digest conditions.") },
      { title: t("建立反应表", "Build the reaction table"), body: t("按 DNA 质量、酶单位和厂家建议确定总体积。设置未切 DNA 对照；批量样本可配制不含 DNA 的主混合液。", "Set total volume from DNA mass, enzyme units, and manufacturer guidance. Include an uncut-DNA control; for batches, prepare a DNA-free master mix.") },
      { title: t("加样与混匀", "Assemble and mix"), body: t("通常先加水和缓冲液，再加 DNA，最后加入酶。轻柔混匀并短暂离心，避免酶长时间停留在无缓冲液或高甘油局部环境。", "Typically add water and buffer first, then DNA, and enzyme last. Mix gently and briefly spin, avoiding prolonged enzyme exposure to unbuffered or locally high-glycerol conditions.") },
      { title: t("按产品条件孵育", "Incubate under product conditions"), body: t("诊断酶切常见约 1 小时，克隆制备可能更长；温度和时间以实际酶说明书为准。不要仅凭“通常 37°C”设定所有酶。", "Diagnostic digests often run for about an hour and cloning preparations may run longer. Use the actual enzyme manual for time and temperature rather than assuming every enzyme runs at 37°C.") },
      { title: t("终止并验证", "Stop and verify"), body: t("按厂家建议热灭活或纯化，随后与未切对照和 ladder 一同电泳。先核对条带数和大小，再进入连接或后续分析。", "Heat-inactivate or purify as directed, then run alongside the uncut control and ladder. Confirm band count and sizes before ligation or downstream analysis."), checkpoint: t("观察结果与理论图谱一致。", "Observed bands match the predicted map.") },
    ],
    acceptance: [
      t("对照行为符合预期，酶切样本的条带数量与理论片段数一致。", "Controls behave as expected and digest band count matches predicted fragments."),
      t("可分辨片段的表观大小与理论值相符；过小片段可能迁出或无法清晰显示，需在判读中注明。", "Resolvable fragments match predicted apparent sizes; very small fragments may run off or remain unresolved and must be noted."),
      t("用于连接的载体不存在明显未切质粒背景，并完成所需纯化/灭活。", "Vector intended for ligation has no substantial uncut-plasmid background and required cleanup/inactivation is complete."),
    ],
    records: [
      t("质粒名称/版本、序列文件、理论酶切图和目标片段大小", "Plasmid name/version, sequence file, predicted map, and target fragment sizes"),
      t("限制酶货号/批次、缓冲液、单位数、总体积、温度和时间", "Restriction-enzyme catalog/lots, buffer, units, total volume, temperature, and time"),
      t("灭活/纯化方式、凝胶原图和结果判定", "Inactivation/cleanup method, original gel image, and interpretation"),
    ],
    critical: t("酶活性、Star activity、甲基化敏感性与热灭活条件都与具体产品有关，必须查当前厂家资料。", "Enzyme activity, star activity, methylation sensitivity, and heat inactivation are product-specific and require the current manufacturer documentation."),
    safety: t("含核酸染料的凝胶与缓冲液不得按普通水溶液处理；切胶和 UV 成像须使用机构批准的防护与废弃流程。", "Gels and buffers containing nucleic-acid stain are not ordinary aqueous waste. Use approved protection and disposal procedures for gel cutting and UV imaging."),
    sourceLabel: "Addgene · Restriction Digest of Plasmid DNA",
    sourceUrl: "https://www.addgene.org/protocols/restriction-digest/",
  },
  {
    id: "dna-ligation",
    category: "cloning",
    title: t("DNA 连接", "DNA ligation"),
    summary: t("为限制性克隆建立插入片段与载体比例、连接体系和背景对照。", "Set insert-to-vector ratios, reaction conditions, and background controls for restriction-based cloning."),
    duration: t("约 30 分钟至过夜", "About 30 minutes to overnight"),
    difficulty: "routine",
    applicability: t("适用于兼容末端的载体与插入片段使用 T4 DNA ligase 进行常规连接。平末端、短寡核苷酸、多片段连接或快速连接试剂盒需使用相应产品条件。", "For routine T4 DNA ligase joining of vectors and inserts with compatible ends. Blunt ends, short oligonucleotides, multi-fragment assemblies, and quick-ligation kits require their applicable product conditions."),
    parameters: [
      { label: t("插入:载体", "Insert:vector"), value: t("摩尔比约 3:1 起始", "Start near 3:1 molar ratio"), note: t("必须按 bp 长度和质量换算分子数；可并行测试不同摩尔比。", "Convert molecule numbers from bp length and mass; parallel ratio testing may be appropriate.") },
      { label: t("总 DNA", "Total DNA"), value: t("常见约 100 ng", "Commonly about 100 ng"), note: t("Addgene 标准连接参考；低浓度样本可按比例扩大总体积。", "Addgene standard ligation reference; scale total volume proportionally for dilute samples.") },
      { label: t("标准总体积", "Standard total volume"), value: t("10 µL", "10 µL"), note: t("10× buffer 通常为 1 µL；T4 ligase 常为 0.5–1 µL，具体看产品。", "Typically 1 µL of 10× buffer and 0.5–1 µL T4 ligase; verify the product.") },
      { label: t("参考孵育", "Reference incubation"), value: t("室温 2 h 或 16°C 过夜", "2 h at room temperature or overnight at 16°C"), note: t("Addgene 标准示例；快速连接酶不得套用。", "Addgene standard example; do not apply to quick ligases.") },
    ],
    controls: [
      t("切开载体 + ligase（无插入）：估计载体自连和未切背景。", "Cut vector + ligase without insert: estimates recircularization and uncut background."),
      t("未切载体转化阳性对照：确认感受态细胞和抗生素选择有效。", "Uncut-vector positive transformation control: confirms competent cells and antibiotic selection."),
      t("必要时设置切开载体无 ligase 对照和仅插入/水对照，用于定位完整质粒污染。", "Where needed, include cut-vector/no-ligase and insert-only/water controls to localize intact-plasmid contamination."),
    ],
    materials: [
      t("纯化的载体与插入片段", "Purified vector and insert DNA"),
      t("T4 DNA ligase 与含 ATP 的配套缓冲液", "T4 DNA ligase and its ATP-containing buffer"),
      t("无核酸酶水、低吸附管与冰盒", "Nuclease-free water, low-bind tubes, and ice"),
      t("载体空白连接和转化阳性对照", "Vector-only ligation and positive transformation controls"),
    ],
    steps: [
      { title: t("检查 DNA 末端", "Confirm DNA ends"), body: t("确认载体与插入片段末端兼容、载体切割完整，并判断是否需要去磷酸化。核对两端是否能控制插入方向。", "Confirm compatible vector and insert ends, complete vector digestion, and whether dephosphorylation is needed. Check whether the two ends enforce insert orientation.") },
      { title: t("计算摩尔比例", "Calculate molar ratio"), body: t("按片段长度和质量计算分子数。Addgene 给出的常见起点是插入片段:载体约 3:1（摩尔比），而不是简单质量比。", "Calculate molecule numbers from fragment length and mass. Addgene gives an insert:vector molar ratio of about 3:1 as a common starting point—not a simple mass ratio."), checkpoint: t("比例按 bp 长度换算为摩尔比。", "The ratio is converted to molar terms using fragment lengths.") },
      { title: t("设置必要对照", "Set essential controls"), body: t("至少设置切开载体 + ligase 的空载体对照；排错时加入未切载体、无 ligase 或阳性转化对照，区分未切背景、自连与细胞问题。", "Include at least a cut-vector-plus-ligase background control. For troubleshooting, add uncut-vector, no-ligase, or positive transformation controls to distinguish uncut background, recircularization, and cell failure.") },
      { title: t("组装连接反应", "Assemble the ligation"), body: t("完全解冻并混匀含 ATP 的缓冲液，按说明书加入 DNA、缓冲液和 ligase，最后用水定容。轻柔混匀并短暂离心。", "Fully thaw and mix the ATP-containing buffer. Add DNA, buffer, and ligase according to the manual, bring to volume with water, mix gently, and briefly spin."), checkpoint: t("连接缓冲液没有经历不必要的反复冻融。", "Ligation buffer has not undergone unnecessary freeze-thaw cycles.") },
      { title: t("孵育", "Incubate"), body: t("Addgene 的标准示例为室温约 2 小时或 16°C 过夜；快速连接酶和特殊末端必须遵循对应产品条件。", "The Addgene standard example uses about 2 hours at room temperature or overnight at 16°C. Quick ligases and special end structures require their product-specific conditions.") },
      { title: t("进入转化并判读", "Transform and interpret"), body: t("使用适合连接产物的感受态细胞并保留对照。比较插入片段连接板与空载体板的菌落数，再挑取克隆做诊断酶切或测序。", "Use competent cells appropriate for ligation products and keep the controls. Compare colony counts for insert ligation versus vector-only background, then verify picked clones by diagnostic digest or sequencing.") },
    ],
    acceptance: [
      t("载体 + 插入板的菌落数显著高于空载体连接背景；阳性转化对照有效。", "Vector-plus-insert colonies substantially exceed vector-only background and the positive transformation control works."),
      t("挑取克隆经诊断酶切、菌落 PCR 或测序确认插入大小、方向和序列。", "Picked clones are verified for insert size, orientation, and sequence by diagnostic digest, colony PCR, or sequencing."),
      t("不能仅以“出现菌落”作为连接成功的验收依据。", "Colony presence alone is not an acceptance criterion for successful ligation."),
    ],
    records: [
      t("载体/插入 ID、长度、浓度、末端类型与摩尔比计算", "Vector/insert IDs, lengths, concentrations, end types, and molar-ratio calculation"),
      t("ligase 与 buffer 货号/批次、反应配方、孵育条件", "Ligase and buffer catalog/lots, reaction recipe, and incubation conditions"),
      t("各对照菌落数、挑取克隆编号与验证结果", "Control colony counts, picked-clone IDs, and verification results"),
    ],
    critical: t("连接缓冲液中的 ATP 会随冻融和保存条件失活；仅看到菌落不能证明插入方向或序列正确。", "ATP in ligation buffer loses activity with freeze-thaw and poor storage. Colonies alone do not prove insert orientation or sequence correctness."),
    safety: t("DNA 染料、切胶产物和抗生素培养物分别按化学与生物废物 SOP 处理；不要把连接产物或转化废物直接排入下水。", "Handle DNA stains, gel material, and antibiotic cultures under their chemical and biological waste SOPs. Do not drain-dispose ligation or transformation waste."),
    sourceLabel: "Addgene · DNA Ligation",
    sourceUrl: "https://www.addgene.org/protocols/dna-ligation/",
  },
  {
    id: "bacterial-transformation",
    category: "microbiology",
    title: t("化学感受态细菌热激转化", "Heat-shock transformation of competent bacteria"),
    summary: t("从感受态细胞解冻到恢复培养、涂板和对照判读的标准化流程。", "A standardized workflow from competent-cell thawing through recovery, plating, and control interpretation."),
    duration: t("约 1.5 小时 + 过夜培养", "About 1.5 hours + overnight growth"),
    difficulty: "routine",
    applicability: t("适用于经批准的实验室 E. coli 化学感受态细胞热激转化。电转感受态、非 E. coli 菌株、大型质粒/BAC、高效文库构建或特殊生物安全材料不适用本通用参数。", "For heat-shock transformation of approved laboratory E. coli chemical competent cells. These general parameters do not apply to electrocompetent cells, non-E. coli strains, large plasmids/BACs, high-efficiency libraries, or special biosafety materials."),
    parameters: [
      { label: t("细胞体积", "Cell volume"), value: t("常见 20–50 µL", "Commonly 20–50 µL"), note: t("Addgene 通用参考；以感受态细胞产品说明书为准。", "Addgene general reference; the competent-cell manual takes precedence.") },
      { label: t("DNA 加样", "DNA input"), value: t("通用参考 1–5 µL", "General reference 1–5 µL"), note: t("DNA 总量与盐/连接液体积会影响效率，必须遵守产品上限。", "Total DNA and salt/ligation-mixture volume affect efficiency; obey product limits.") },
      { label: t("冰浴 / 热激", "Ice / heat shock"), value: t("20–30 min；42°C 30–60 s；回冰 2 min", "20–30 min; 42°C 30–60 s; 2 min on ice"), note: t("Addgene 通用参考；不同细胞产品常有精确到秒的条件。", "Addgene general reference; individual cell products often specify exact timing.") },
      { label: t("恢复培养", "Recovery"), value: t("37°C 振荡约 45 min", "About 45 min shaking at 37°C"), note: t("Addgene 通用参考；氨苄以外的选择通常更依赖充分恢复。", "Addgene general reference; selections other than ampicillin often depend more on full recovery.") },
    ],
    controls: [
      t("无 DNA 阴性对照：监测细胞或培养基污染及选择平板失效。", "No-DNA negative control: monitors cell/medium contamination and failed selection plates."),
      t("已知完整质粒阳性对照：评估细胞活性、转化操作和抗生素选择。", "Known intact-plasmid positive control: evaluates cell viability, transformation handling, and antibiotic selection."),
      t("连接产物转化时保留空载体连接对照，用于估计背景。", "For ligation-product transformation, retain the vector-only ligation control to estimate background."),
    ],
    materials: [
      t("与质粒和用途匹配的化学感受态细胞", "Chemically competent cells matched to plasmid and purpose"),
      t("质粒或连接产物、SOC/LB 恢复培养基", "Plasmid or ligation product and SOC/LB recovery medium"),
      t("含正确抗生素的 LB 平板", "LB agar plates containing the correct antibiotic"),
      t("冰盒、42°C 热激设备和 37°C 振荡培养箱", "Ice, a 42°C heat-shock device, and a 37°C shaking incubator"),
    ],
    steps: [
      { title: t("建立对照与平板", "Set controls and plates"), body: t("确认细胞菌株、感受态类型、质粒抗性和培养要求。准备样本、阳性转化对照及无 DNA 阴性对照，并提前标记对应平板。", "Confirm strain, competency method, plasmid resistance, and growth requirements. Prepare sample, positive transformation, and no-DNA negative controls, and label matching plates in advance."), checkpoint: t("平板抗生素与质粒抗性完全匹配。", "Plate antibiotic exactly matches plasmid resistance.") },
      { title: t("在冰上解冻", "Thaw on ice"), body: t("按感受态细胞说明书在冰上完全解冻。避免反复冻融、涡旋和粗暴吹打；细胞型号差异会显著影响效率。", "Thaw fully on ice according to the competent-cell manual. Avoid repeat freeze-thaw, vortexing, and harsh pipetting; cell products differ substantially in efficiency.") },
      { title: t("加入 DNA", "Add DNA"), body: t("轻柔加入说明书允许范围内的 DNA。Addgene 通用参考使用 1–5 µL DNA 加入 20–50 µL 细胞，但高效细胞或连接产物应以厂家上限为准。", "Gently add DNA within the product's allowed range. The Addgene general reference uses 1–5 µL DNA with 20–50 µL cells, but high-efficiency cells and ligation products should follow manufacturer limits.") },
      { title: t("冰浴与热激", "Ice incubation and heat shock"), body: t("Addgene 通用参考在冰上放置 20–30 分钟，再于 42°C 热激 30–60 秒并立即回冰 2 分钟；具体时间由感受态细胞产品决定。", "The Addgene general reference incubates on ice for 20–30 minutes, heat shocks at 42°C for 30–60 seconds, and returns cells to ice for 2 minutes. Exact timing is competent-cell specific."), checkpoint: t("热激计时准确，所有管的浸入深度一致。", "Heat-shock timing is accurate and tube immersion is consistent.") },
      { title: t("恢复培养", "Recover"), body: t("加入无抗生素 SOC 或 LB，按细胞说明书振荡恢复。恢复步骤让抗性蛋白表达，对许多非氨苄抗性尤其重要。", "Add antibiotic-free SOC or LB and recover with shaking as directed. Recovery permits resistance-gene expression and is especially important for many non-ampicillin selections.") },
      { title: t("涂板与培养", "Plate and incubate"), body: t("可将不同体积分别涂到两块平板，提高获得单克隆的机会。培养温度和时间按菌株/质粒要求设置，第二天先判读对照。", "Plate different volumes on separate plates when useful to improve the chance of isolated colonies. Set incubation temperature and time for the strain/plasmid, and interpret controls first the next day."), checkpoint: t("阴性对照无菌落，阳性对照达到预期生长。", "The negative control has no colonies and the positive control grows as expected.") },
    ],
    acceptance: [
      t("无 DNA 阴性对照无菌落；阳性转化对照出现数量合理且形态正常的菌落。", "The no-DNA control has no colonies; the positive control produces a reasonable number of normal colonies."),
      t("样本平板获得空间分离的菌落，可供后续单克隆挑取。", "Sample plates provide spatially isolated colonies suitable for single-clone picking."),
      t("质粒身份必须经后续酶切、PCR 或测序确认。", "Plasmid identity is confirmed downstream by digest, PCR, or sequencing."),
    ],
    records: [
      t("感受态细胞菌株、产品/批次、标称效率与冻融记录", "Competent-cell strain, product/lot, stated efficiency, and freeze-thaw history"),
      t("DNA ID、类型、浓度、体积和转化反应编号", "DNA ID, type, concentration, volume, and transformation reaction ID"),
      t("冰浴/热激/恢复条件、平板抗生素、涂板体积和菌落数", "Ice/heat-shock/recovery conditions, plate antibiotic, plated volume, and colony counts"),
    ],
    critical: t("热激时间、DNA 体积和恢复条件必须服从感受态细胞说明书；不能把一个品牌/菌株的参数直接移植到另一个。", "Heat-shock time, DNA volume, and recovery conditions must follow the competent-cell manual and should not be transferred across products or strains."),
    safety: t("只在实验室批准的菌株和生物安全级别内操作。培养物、枪头和含抗生素平板须按机构生物废物流程灭活。", "Work only with institution-approved strains at the assigned biosafety level. Decontaminate cultures, tips, and antibiotic plates under institutional biological-waste procedures."),
    sourceLabel: "Addgene · Bacterial Transformation",
    sourceUrl: "https://www.addgene.org/protocols/bacterial-transformation/",
  },
  {
    id: "bacterial-liquid-culture",
    category: "microbiology",
    title: t("细菌单克隆液体培养", "Bacterial liquid culture from a single colony"),
    summary: t("从单菌落接种、抗生素选择到过夜培养和阴性对照的基础质粒扩增流程。", "A basic plasmid-amplification workflow from single-colony inoculation and antibiotic selection through overnight growth and negative controls."),
    duration: t("约 12–18 小时", "About 12–18 hours"),
    difficulty: "routine",
    applicability: t("适用于从单个 E. coli 菌落建立小体积选择性液体培养，用于常规质粒提取。不适用于病原菌、厌氧菌、发酵放大或需要生长曲线控制的表达培养。", "For small selective liquid cultures initiated from one E. coli colony for routine plasmid preparation. Not for pathogens, anaerobes, fermentation scale-up, or expression cultures requiring controlled growth curves."),
    parameters: [
      { label: t("培养体积", "Culture volume"), value: t("小量提取常见约 2 mL", "About 2 mL for a typical miniprep"), note: t("Addgene 示例；必须与提取柱容量和质粒拷贝数匹配。", "Addgene example; match extraction-column capacity and plasmid copy number.") },
      { label: t("选择压力", "Selection"), value: t("与质粒抗性匹配", "Match plasmid resistance"), note: t("抗生素终浓度遵守本实验室经验证配方或供应商说明。", "Use a laboratory-validated or supplier-specified final antibiotic concentration.") },
      { label: t("参考温度", "Reference temperature"), value: t("常规 E. coli 37°C", "37°C for routine E. coli"), note: t("不稳定构建、大质粒或特定菌株可能要求 30°C。", "Unstable constructs, large plasmids, or specific strains may require 30°C.") },
      { label: t("培养时间", "Culture duration"), value: t("常见 12–18 h", "Commonly 12–18 h"), note: t("高/低拷贝质粒和较低温度会改变时间；避免无依据过度培养。", "High/low-copy plasmids and lower temperatures change duration; avoid unjustified overgrowth.") },
    ],
    controls: [
      t("培养基 + 抗生素、未接菌阴性对照：监测培养基和操作污染。", "Uninoculated medium-plus-antibiotic negative control: monitors medium and handling contamination."),
      t("必要时从同一平板并行挑取多个独立单克隆，避免把单个异常克隆当作代表。", "Where needed, inoculate independent colonies in parallel rather than treating one anomalous clone as representative."),
      t("表达或稳定性敏感构建应设置已知稳定克隆/菌株对照。", "Expression or stability-sensitive constructs should include a known stable clone/strain control."),
    ],
    materials: [
      t("新鲜单菌落与匹配的液体培养基", "A fresh isolated colony and appropriate liquid medium"),
      t("匹配质粒抗性的抗生素储备液", "Antibiotic stock matching plasmid resistance"),
      t("无菌培养管/摇瓶与通气盖", "Sterile culture tube/flask with aerated closure"),
      t("适合菌株的振荡培养箱", "A shaking incubator suitable for the strain"),
    ],
    steps: [
      { title: t("确认培养条件", "Confirm culture conditions"), body: t("核对菌株、质粒拷贝数、抗生素抗性、推荐温度和培养时间。部分大质粒、不稳定构建或特殊菌株需要 30°C 或更长培养。", "Check strain, plasmid copy number, antibiotic resistance, recommended temperature, and growth time. Some large plasmids, unstable constructs, or special strains require 30°C or longer growth.") },
      { title: t("准备培养基和对照", "Prepare medium and control"), body: t("将正确抗生素加入已冷却的无菌培养基。另设一管培养基 + 抗生素但不接菌，作为污染阴性对照。", "Add the correct antibiotic to cooled sterile medium. Set a separate uninoculated medium-plus-antibiotic tube as a contamination control."), checkpoint: t("培养基标签包含菌株/质粒、抗生素、日期和操作者。", "Medium label includes strain/plasmid, antibiotic, date, and operator.") },
      { title: t("挑取单菌落", "Pick one colony"), body: t("用无菌枪头或接种工具挑取空间分离良好的单菌落，轻柔转入培养基。避免刮取周围菌落或琼脂。", "Use a sterile tip or inoculation tool to pick a well-isolated single colony and transfer it gently into medium, avoiding neighboring colonies and agar.") },
      { title: t("保证通气", "Provide aeration"), body: t("培养容器不应密闭，并保留足够气相空间。管盖、透气膜或摇瓶装液量按本实验室设备规范设置。", "Do not seal the culture vessel airtight, and leave adequate headspace. Set caps, breathable films, and fill volume under laboratory equipment guidance.") },
      { title: t("振荡培养", "Shake and incubate"), body: t("Addgene 的常规 LB 参考为 37°C、12–18 小时；实际条件须根据菌株和质粒调整。避免无依据延长培养导致选择压力下降或构建不稳定。", "The Addgene routine LB reference uses 37°C for 12–18 hours; adapt to the strain and plasmid. Avoid unjustified overgrowth that can reduce selection or destabilize constructs.") },
      { title: t("检查并进入下游", "Inspect and proceed"), body: t("比较样本与未接菌对照的浑浊度；阴性对照应保持澄清。按下游提取试剂盒允许的菌液体积收集细胞。", "Compare sample turbidity with the uninoculated control, which should remain clear. Harvest only the culture volume accepted by the downstream extraction kit."), checkpoint: t("阴性培养对照清澈且无可见生长。", "The negative culture control remains clear with no visible growth.") },
    ],
    acceptance: [
      t("阴性培养对照保持澄清，样本培养物呈均一生长且无明显异常沉淀、膜或颜色。", "The negative control remains clear and sample culture shows uniform growth without unexplained sediment, film, or color."),
      t("培养条件与菌株/质粒要求一致，未发生密闭培养或抗生素错配。", "Culture conditions match the strain/plasmid requirements, with no sealed incubation or antibiotic mismatch."),
      t("下游质粒身份通过酶切、PCR 或测序验证。", "Downstream plasmid identity is verified by digest, PCR, or sequencing."),
    ],
    records: [
      t("菌株、质粒/克隆编号、来源平板和菌落位置", "Strain, plasmid/clone ID, source plate, and colony position"),
      t("培养基/抗生素批次与终浓度、培养体积、温度、转速和起止时间", "Medium/antibiotic lots and final concentration, volume, temperature, rpm, and start/end times"),
      t("阴性对照结果、肉眼生长观察和下游样本编号", "Negative-control result, visual growth observations, and downstream sample ID"),
    ],
    critical: t("抗生素必须与质粒抗性一致，并在培养基冷却后加入；培养条件由菌株和构建决定。", "Antibiotic must match plasmid resistance and be added after the medium cools. Culture conditions are strain- and construct-dependent."),
    safety: t("培养物视为生物材料管理。含抗生素培养液和耗材不得直接排入下水或生活垃圾，须按机构流程灭活。", "Manage cultures as biological material. Antibiotic-containing liquid and consumables must not enter drains or general waste and require institutional decontamination."),
    sourceLabel: "Addgene · Inoculating a Liquid Bacterial Culture",
    sourceUrl: "https://www.addgene.org/protocols/inoculate-bacterial-culture/",
  },
  {
    id: "plasmid-miniprep",
    category: "nucleic-acid",
    title: t("质粒小量提取（柱式试剂盒）", "Plasmid miniprep (spin-column kit)"),
    summary: t("以厂家柱式试剂盒为执行标准，提供从菌液检查、碱裂解到洗脱与质控的防错框架。", "A mistake-resistant framework from culture checks and alkaline lysis through elution and QC, with the selected spin-column kit as the execution standard."),
    duration: t("约 30–50 分钟", "About 30–50 minutes"),
    difficulty: "routine",
    applicability: t("适用于商业硅胶膜柱式质粒小量提取的防错检查。具体培养输入量、缓冲液体积、离心力、时间和柱容量全部由所用试剂盒决定，不提供跨品牌通用配方。", "A mistake-prevention checklist for commercial silica spin-column plasmid minipreps. Culture input, buffer volumes, centrifugal force, timing, and column capacity are entirely kit-specific; no cross-brand recipe is implied."),
    parameters: [
      { label: t("培养物输入", "Culture input"), value: t("按试剂盒柱容量", "Per kit column capacity"), note: t("不得用增加菌液体积替代低拷贝质粒的专用优化。", "Do not substitute excess culture volume for validated low-copy-plasmid optimization.") },
      { label: t("裂解时间", "Lysis time"), value: t("按试剂盒精确计时", "Time exactly per kit"), note: t("过短导致裂解不足；过长和剧烈混匀会增加基因组 DNA 污染。", "Too short gives incomplete lysis; too long or harsh mixing increases genomic-DNA contamination.") },
      { label: t("离心条件", "Centrifugation"), value: t("以 ×g 为准", "Use ×g values"), note: t("若说明书只给 rpm，应按转子半径换算；不同离心机的 rpm 不可直接互换。", "If only rpm is supplied, account for rotor radius; rpm is not directly transferable across centrifuges.") },
      { label: t("洗脱条件", "Elution"), value: t("产品特异体积/缓冲液", "Product-specific volume/buffer"), note: t("较小体积可提高浓度但可能降低总回收量；下游酶反应还受盐和 pH 影响。", "Lower volume may increase concentration but reduce total recovery; downstream enzymes are also affected by salt and pH.") },
    ],
    controls: [
      t("未接菌培养阴性对照应在提取前确认无生长。", "Confirm the uninoculated culture control has no growth before extraction."),
      t("新试剂盒/新批次或排错时加入已知高质量质粒提取对照。", "For new kit lots or troubleshooting, include a known high-quality plasmid extraction control."),
      t("需要无 RNA 或高完整度 DNA 的下游用途应设置相应质控，而不只看浓度。", "Downstream applications requiring RNA-free or high-integrity DNA need applicable QC beyond concentration alone."),
    ],
    materials: [
      t("过夜单克隆培养物与对应柱式质粒提取试剂盒", "Overnight single-colony culture and the selected spin-column miniprep kit"),
      t("微量离心机、无核酸酶管和移液器", "Microcentrifuge, nuclease-free tubes, and pipettes"),
      t("按试剂盒要求准备的乙醇、洗脱液或水", "Ethanol and elution buffer/water prepared as required by the kit"),
      t("用于浓度/纯度检查的检测设备", "An instrument for concentration and purity checks"),
    ],
    steps: [
      { title: t("确认试剂盒状态", "Confirm kit readiness"), body: t("阅读当前试剂盒手册并确认洗液是否已按标记加入乙醇、RNase 是否已加入重悬液、所有缓冲液未过期或析出。", "Read the current kit manual and confirm wash buffer has received ethanol where marked, RNase has been added to resuspension buffer where required, and buffers are in date and free of unresolved precipitate."), checkpoint: t("洗液瓶上的乙醇添加记录已核对。", "The ethanol-addition mark on the wash bottle is confirmed.") },
      { title: t("检查培养物并收菌", "Inspect culture and pellet cells"), body: t("确认未接菌对照无生长，菌液来源于单克隆且抗生素匹配。只使用试剂盒柱容量允许的培养体积，完全收集并去除上清。", "Confirm the uninoculated control did not grow, culture came from one colony, and antibiotic matched. Use only the culture volume supported by the column, pellet cells completely, and remove supernatant.") },
      { title: t("充分重悬", "Resuspend completely"), body: t("按试剂盒规定体积加入重悬液，彻底分散细胞团块。残留团块会导致裂解不均和产量下降。", "Add the specified resuspension volume and fully disperse the pellet. Remaining clumps cause uneven lysis and lower yield."), checkpoint: t("管底和侧壁没有可见细胞团块。", "No visible cell clumps remain on the tube bottom or wall.") },
      { title: t("碱裂解与中和", "Lyse and neutralize"), body: t("加入裂解液后按手册轻柔颠倒混匀并严格控制时间，不要涡旋；随后加入中和液立即充分颠倒，形成均一絮状沉淀。", "After adding lysis buffer, invert gently and observe the manual's timing; do not vortex. Add neutralization buffer and immediately invert thoroughly to form an even flocculent precipitate."), checkpoint: t("裂解步骤没有涡旋或超时。", "The lysis step was not vortexed or overextended.") },
      { title: t("澄清、上柱和洗涤", "Clarify, bind, and wash"), body: t("按手册离心去除沉淀，将澄清上清转入柱中，避免吸入絮状物。完成规定洗涤和空转离心，减少盐和乙醇残留。", "Centrifuge as directed, transfer cleared supernatant without disturbing precipitate, complete all specified washes, and perform the dry spin to reduce salt and ethanol carryover.") },
      { title: t("洗脱与质控", "Elute and assess QC"), body: t("用试剂盒推荐体积和条件洗脱，记录样本 ID、体积和保存位置。测量浓度与纯度，并用酶切或测序确认构建身份。", "Elute using the kit's recommended volume and conditions. Record sample ID, volume, and storage location, measure concentration/purity, and verify construct identity by digest or sequencing.") },
    ],
    acceptance: [
      t("样本浓度和总回收量满足既定下游用途；纯度比值仅作辅助，不单独证明样本合格。", "Concentration and total yield meet the defined downstream use; purity ratios are supportive and do not alone establish fitness."),
      t("凝胶/酶切无明显基因组 DNA 高分子污染，RNA 污染在用途允许范围内。", "Gel/digest shows no substantial high-molecular-weight genomic DNA contamination, and RNA carryover is acceptable for the use."),
      t("构建身份通过诊断酶切、PCR 或测序确认。", "Construct identity is verified by diagnostic digest, PCR, or sequencing."),
    ],
    records: [
      t("培养物与克隆 ID、菌液体积、培养条件和收菌时间", "Culture and clone ID, input volume, culture conditions, and harvest time"),
      t("试剂盒名称/货号/批次、乙醇与 RNase 添加状态、任何步骤偏差", "Kit name/catalog/lot, ethanol and RNase addition status, and any procedural deviation"),
      t("洗脱体积、浓度、纯度、总回收量、保存位置与身份验证结果", "Elution volume, concentration, purity, total yield, storage location, and identity result"),
    ],
    critical: t("柱容量、培养体积、裂解时间、离心力和洗涤次数均为试剂盒特异参数，本卡不替代产品手册。", "Column capacity, culture volume, lysis time, centrifugal force, and wash count are kit-specific. This card does not replace the product manual."),
    safety: t("碱裂解液具有腐蚀性，部分结合/洗涤缓冲液含胍盐。不得与含次氯酸盐漂白剂或酸性废液直接混合，须查产品 SDS。", "Alkaline lysis buffer is corrosive, and some binding/wash buffers contain guanidinium salts. Never mix them directly with hypochlorite bleach or acidic waste; consult the product SDS."),
    sourceLabel: "Addgene · Purifying Plasmid DNA",
    sourceUrl: "https://www.addgene.org/protocols/purify-plasmid-dna/",
  },
  {
    id: "western-blot",
    category: "protein",
    title: t("Western blot 免疫印迹", "Western blot immunoblotting"),
    summary: t("从样本定量、SDS-PAGE、转膜到抗体孵育和成像的完整检查表，突出对照与可比性。", "A complete checklist from sample quantification and SDS-PAGE through transfer, antibody incubation, and imaging, with emphasis on controls and comparability."),
    duration: t("约 1–2 天", "About 1–2 days"),
    difficulty: "advanced",
    applicability: t("适用于细胞或组织裂解液中目标蛋白的常规 SDS-PAGE/膜转移/抗体检测。磷酸化蛋白、膜蛋白、超大/超小蛋白、定量比较和临床样本需要额外验证。", "For routine SDS-PAGE, membrane transfer, and antibody detection of targets in cell or tissue lysates. Phosphoproteins, membrane proteins, very large/small proteins, quantitative comparisons, and clinical samples require additional validation."),
    parameters: [
      { label: t("总蛋白上样", "Total protein load"), value: t("常见 10–50 µg/泳道", "Commonly 10–50 µg/lane"), note: t("依目标丰度、胶孔容量和抗体灵敏度优化；各比较组保持一致。", "Optimize for target abundance, well capacity, and antibody sensitivity; keep comparison groups consistent.") },
      { label: t("封闭", "Blocking"), value: t("室温 1 h（CST 通用参考）", "1 h at room temperature (CST general reference)"), note: t("封闭剂由抗体数据表和目标修饰状态决定；磷酸化抗体常需避开不合适封闭剂。", "Blocker depends on antibody datasheet and target modification; phospho-antibodies may require avoiding unsuitable blockers.") },
      { label: t("一抗", "Primary antibody"), value: t("4°C 轻摇过夜", "Overnight at 4°C with agitation"), note: t("CST 通用参考；稀释倍数、稀释液和温度以具体抗体产品页为准。", "CST general reference; dilution, diluent, and temperature follow the antibody product page.") },
      { label: t("洗膜 / 二抗", "Wash / secondary"), value: t("TBST 3 × 5 min；二抗室温 1 h", "TBST 3 × 5 min; secondary 1 h at room temperature"), note: t("CST 通用参考；荧光和化学发光体系条件不同。", "CST general reference; fluorescence and chemiluminescence systems differ.") },
    ],
    controls: [
      t("已知表达目标蛋白的阳性样本和缺失/未处理阴性样本。", "A known target-positive sample and a target-negative or untreated sample."),
      t("加载/总蛋白归一化控制必须在研究问题和线性范围内验证。", "Loading or total-protein normalization control must be validated for the question and linear range."),
      t("无一抗对照用于识别二抗或底物背景；需要时设置同型对照。", "A no-primary control identifies secondary/substrate background; include an isotype control where appropriate."),
    ],
    materials: [
      t("定量后的蛋白样本、上样缓冲液与分子量标准", "Quantified protein samples, loading buffer, and molecular-weight marker"),
      t("SDS-PAGE 胶、运行缓冲液与电泳设备", "SDS-PAGE gel, running buffer, and electrophoresis apparatus"),
      t("PVDF/NC 膜、转膜缓冲液与转膜设备", "PVDF/NC membrane, transfer buffer, and transfer apparatus"),
      t("封闭液、一抗、匹配二抗、TBST 与检测试剂", "Blocking buffer, primary antibody, matched secondary antibody, TBST, and detection reagent"),
    ],
    steps: [
      { title: t("设计样本与对照", "Design samples and controls"), body: t("确定目标蛋白预期分子量、样本归一化方式、阳性/阴性对照和加载对照。所有比较组使用一致的提取、定量和上样策略。", "Define expected target size, sample normalization, positive/negative controls, and loading control. Use consistent extraction, quantification, and loading strategies across comparison groups."), checkpoint: t("已记录抗体货号、批次、宿主和推荐稀释范围。", "Antibody catalog number, lot, host, and recommended dilution range are recorded.") },
      { title: t("制备并变性样本", "Prepare and denature samples"), body: t("按样本与目标蛋白特性配制还原或非还原上样体系，并使用统一的加热条件。膜蛋白、聚集蛋白或特殊抗体可能需要非标准条件。", "Prepare reducing or non-reducing samples according to target biology and keep heating conditions consistent. Membrane proteins, aggregation-prone proteins, or special antibodies may require nonstandard treatment.") },
      { title: t("SDS-PAGE 分离", "Run SDS-PAGE"), body: t("选择能覆盖目标分子量的胶浓度，加载适量总蛋白和预染 marker。记录电压、时间和异常泳道，不以单一固定电压替代设备说明。", "Choose a gel percentage that spans the target size, load an appropriate amount of total protein and a prestained marker, and record voltage, time, and lane anomalies rather than substituting one fixed voltage for equipment instructions.") },
      { title: t("转膜并确认", "Transfer and confirm"), body: t("根据目标大小选择膜类型和转膜体系，按设备说明完成湿转或半干转。标记膜方向，并用总蛋白染色或其他批准方法确认转移质量。", "Choose membrane and transfer format for target size, then run wet or semi-dry transfer under the equipment manual. Mark membrane orientation and confirm transfer quality using total-protein staining or another approved method."), checkpoint: t("marker 方向、膜正反面和泳道位置已记录。", "Marker orientation, membrane face, and lane positions are documented.") },
      { title: t("封闭与一抗孵育", "Block and incubate with primary antibody"), body: t("根据抗体数据表选择封闭液和稀释液。CST 通用参考为室温封闭 1 小时，一抗在 4°C 轻摇过夜；具体条件以抗体产品页为准。", "Select blocking and dilution buffers from the antibody datasheet. The CST general reference blocks for 1 hour at room temperature and incubates primary antibody overnight at 4°C with agitation; product-specific instructions take precedence.") },
      { title: t("洗膜与二抗孵育", "Wash and incubate with secondary antibody"), body: t("按体系用 TBST 完成规定次数和时长的洗涤，使用与一抗宿主和检测方式匹配的二抗。设置无一抗对照可帮助识别二抗背景。", "Wash with TBST for the specified number and duration, then use a secondary antibody matched to primary host and detection mode. A no-primary control can help identify secondary-antibody background.") },
      { title: t("显影与定量", "Detect and quantify"), body: t("在避免饱和的曝光范围内采集图像，保留原始未裁剪数据和曝光参数。定量时使用验证过的归一化策略，并对所有组采用一致处理。", "Capture images within the nonsaturated exposure range, preserving original uncropped data and exposure settings. Use a validated normalization strategy and identical processing across groups."), checkpoint: t("目标条带在预期分子量附近且曝光未饱和。", "The target band is near the expected molecular weight and exposure is not saturated.") },
    ],
    acceptance: [
      t("阳性对照在预期分子量附近出现目标条带，阴性和无一抗对照无不可接受特异信号。", "The positive control shows the target near its expected molecular weight; negative and no-primary controls show no unacceptable specific signal."),
      t("转膜和总蛋白/加载控制显示泳道间处理可比，目标曝光处于非饱和线性范围。", "Transfer and total-protein/loading controls support between-lane comparability, and target exposure is nonsaturated and linear."),
      t("定量使用原始图像、预先确定的背景扣除与一致的归一化方法。", "Quantification uses raw images, a predefined background method, and consistent normalization."),
    ],
    records: [
      t("样本来源、处理、裂解液、蛋白定量方法和每泳道上样量", "Sample source, treatment, lysis buffer, protein assay, and load per lane"),
      t("胶/膜类型、运行与转膜条件、膜方向、总蛋白或转膜质控图", "Gel/membrane type, run and transfer conditions, orientation, and total-protein/transfer QC image"),
      t("一抗/二抗货号与批次、稀释和孵育条件、曝光设置、原始图像与分析文件", "Primary/secondary catalog and lots, dilution/incubation, exposure settings, raw images, and analysis files"),
    ],
    critical: t("抗体稀释、封闭液、转膜条件与曝光范围都依赖目标和产品；定量前必须确认信号处于线性范围。", "Antibody dilution, blocker, transfer conditions, and exposure range are target- and product-dependent. Confirm signal linearity before quantification."),
    safety: t("丙烯酰胺、甲醇、还原剂和化学发光试剂按各自 SDS 操作；优先使用预制凝胶并在规定通风和废液体系下处理。", "Handle acrylamide, methanol, reducing agents, and chemiluminescent reagents under their SDS controls. Prefer precast gels and use required ventilation and waste streams."),
    sourceLabel: "Cell Signaling Technology · Western Blotting Protocol",
    sourceUrl: "https://www.cellsignal.com/learn-and-support/protocols/protocol-western",
  },
];
