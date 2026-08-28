export type LocalizedText = {
  zh: string;
  en: string;
};

export type RecipeIngredient = {
  name: LocalizedText;
  amount: number;
  unit: "g" | "mL";
  chemicalId?: string;
};

export type SolutionRecipe = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  category: "buffer" | "electrophoresis" | "stock";
  defaultVolumeMl: number;
  ingredients: RecipeIngredient[];
  steps: LocalizedText[];
  notes: LocalizedText[];
  sourceLabel: string;
  sourceUrl: string;
  safetyQuery?: string;
};

export const SOLUTION_RECIPES: SolutionRecipe[] = [
  {
    id: "pbs-1x",
    title: { zh: "1× PBS（pH 7.4）", en: "1× PBS (pH 7.4)" },
    subtitle: {
      zh: "无钙、无镁的磷酸盐缓冲盐水",
      en: "Phosphate-buffered saline without calcium or magnesium",
    },
    category: "buffer",
    defaultVolumeMl: 1000,
    ingredients: [
      { name: { zh: "氯化钠（NaCl）", en: "Sodium chloride (NaCl)" }, amount: 8, unit: "g" },
      { name: { zh: "氯化钾（KCl）", en: "Potassium chloride (KCl)" }, amount: 0.2, unit: "g" },
      { name: { zh: "无水磷酸氢二钠（Na₂HPO₄）", en: "Anhydrous disodium phosphate (Na₂HPO₄)" }, amount: 1.44, unit: "g" },
      { name: { zh: "磷酸二氢钾（KH₂PO₄）", en: "Potassium phosphate monobasic (KH₂PO₄)" }, amount: 0.24, unit: "g" },
    ],
    steps: [
      { zh: "先将各组分溶于约 80% 终体积的去离子水。", en: "Dissolve the components in about 80% of the final volume of deionized water." },
      { zh: "测量并将 pH 调至 7.4，再用水定容。", en: "Measure and adjust to pH 7.4, then bring to final volume with water." },
      { zh: "根据实验用途选择过滤除菌或高压灭菌，并按实验室规定标注。", en: "Filter-sterilize or autoclave when appropriate for the application, then label under local laboratory rules." },
    ],
    notes: [
      { zh: "此配方按无水 Na₂HPO₄ 计算；若使用水合物，质量不能直接照抄。", en: "This formulation uses anhydrous Na₂HPO₄; do not reuse the listed mass for a hydrate." },
      { zh: "细胞培养等用途应核对具体体系对无菌、内毒素和离子组成的要求。", en: "For cell culture, verify sterility, endotoxin, and ionic-composition requirements for the specific application." },
    ],
    sourceLabel: "Thermo Fisher Scientific · PBS recipe",
    sourceUrl: "https://tools.thermofisher.com/content/sfs/manuals/293ebna_man.pdf",
  },
  {
    id: "tae-50x",
    title: { zh: "50× TAE", en: "50× TAE" },
    subtitle: {
      zh: "琼脂糖凝胶电泳浓缩液",
      en: "Concentrated buffer for agarose gel electrophoresis",
    },
    category: "electrophoresis",
    defaultVolumeMl: 1000,
    ingredients: [
      { name: { zh: "Tris 碱", en: "Tris base" }, amount: 242, unit: "g" },
      { name: { zh: "冰醋酸", en: "Glacial acetic acid" }, amount: 57.1, unit: "mL" },
      { name: { zh: "0.5 M EDTA（pH 8.0）", en: "0.5 M EDTA (pH 8.0)" }, amount: 100, unit: "mL" },
    ],
    steps: [
      { zh: "将 Tris 碱溶于约 60% 终体积的去离子水。", en: "Dissolve Tris base in about 60% of the final volume of deionized water." },
      { zh: "在合适的通风和防护条件下加入冰醋酸与 EDTA。", en: "Add glacial acetic acid and EDTA with appropriate ventilation and protective controls." },
      { zh: "混匀后用水定容；配制 1× 工作液时按 1:49 稀释。", en: "Mix and bring to final volume; dilute 1:49 to prepare a 1× working solution." },
    ],
    notes: [
      { zh: "大量 Tris 溶解和加酸可能放热；先留足定容空间并控制温度。", en: "Dissolving a large Tris mass and adding acid can release heat; leave headroom and control temperature." },
      { zh: "冰醋酸具有腐蚀性和挥发性，必须核对当前产品 SDS。", en: "Glacial acetic acid is corrosive and volatile; check the current product SDS." },
    ],
    sourceLabel: "Bio-Rad · Bulletin 6205",
    sourceUrl: "https://www.bio-rad.com/webroot/web/pdf/lsr/literature/Bulletin_6205.pdf",
    safetyQuery: "glacial acetic acid",
  },
  {
    id: "tbe-10x",
    title: { zh: "10× TBE", en: "10× TBE" },
    subtitle: {
      zh: "高缓冲容量的核酸电泳浓缩液",
      en: "High-capacity concentrated buffer for nucleic-acid electrophoresis",
    },
    category: "electrophoresis",
    defaultVolumeMl: 1000,
    ingredients: [
      { name: { zh: "Tris 碱", en: "Tris base" }, amount: 108, unit: "g" },
      { name: { zh: "硼酸", en: "Boric acid" }, amount: 55, unit: "g" },
      { name: { zh: "0.5 M EDTA（pH 8.0）", en: "0.5 M EDTA (pH 8.0)" }, amount: 40, unit: "mL" },
    ],
    steps: [
      { zh: "将 Tris 碱和硼酸溶于约 60% 终体积的去离子水。", en: "Dissolve Tris base and boric acid in about 60% of the final volume of deionized water." },
      { zh: "加入 0.5 M EDTA（pH 8.0），充分混匀。", en: "Add 0.5 M EDTA (pH 8.0) and mix thoroughly." },
      { zh: "用水定容；配制 1× 工作液时按 1:9 稀释。", en: "Bring to final volume; dilute 1:9 to prepare a 1× working solution." },
    ],
    notes: [
      { zh: "TBE 缓冲容量较强，适合较长或较高电压的电泳；具体条件仍以实验体系为准。", en: "TBE has greater buffering capacity for longer or higher-voltage runs; confirm conditions for the specific system." },
      { zh: "含硼酸废液的处置遵循机构规定，不直接套用普通水溶液废弃流程。", en: "Dispose of borate-containing waste under institutional rules rather than treating it as ordinary aqueous waste." },
    ],
    sourceLabel: "Bio-Rad · Bulletin 6205",
    sourceUrl: "https://www.bio-rad.com/webroot/web/pdf/lsr/literature/Bulletin_6205.pdf",
    safetyQuery: "boric acid",
  },
  {
    id: "tris-hcl-1m-ph8",
    title: { zh: "1 M Tris-HCl（pH 8.0）", en: "1 M Tris-HCl (pH 8.0)" },
    subtitle: { zh: "常用分子生物学缓冲储备液", en: "Common molecular-biology buffer stock" },
    category: "stock",
    defaultVolumeMl: 1000,
    ingredients: [
      { name: { zh: "Tris 碱", en: "Tris base" }, amount: 121.14, unit: "g" },
    ],
    steps: [
      { zh: "将 Tris 碱溶于约 80% 终体积的去离子水。", en: "Dissolve Tris base in about 80% of the final volume of deionized water." },
      { zh: "在搅拌、通风和适当防护下，用 HCl 缓慢调至 pH 8.0。", en: "With stirring, ventilation, and appropriate protection, slowly adjust to pH 8.0 with HCl." },
      { zh: "溶液回到目标温度后复核 pH，再用水定容。", en: "After the solution returns to the target temperature, recheck pH and bring to final volume." },
    ],
    notes: [
      { zh: "Tris 的 pH 对温度敏感；记录校准温度，不要先定容再大量加酸。", en: "Tris pH is temperature-sensitive; record the calibration temperature and do not make to volume before substantial acid addition." },
      { zh: "所需 HCl 体积取决于浓度和实际滴定，不能由本页面给出固定值。", en: "The HCl volume depends on its concentration and the actual titration; this page intentionally does not prescribe a fixed amount." },
    ],
    sourceLabel: "Thermo Fisher Scientific · 1 M Tris buffers",
    sourceUrl: "https://documents.thermofisher.com/TFS-Assets/LSG/manuals/sp_9851.pdf",
    safetyQuery: "HCl",
  },
  {
    id: "sds-10-percent",
    title: { zh: "10% SDS（w/v）", en: "10% SDS (w/v)" },
    subtitle: { zh: "十二烷基硫酸钠储备液", en: "Sodium dodecyl sulfate stock solution" },
    category: "stock",
    defaultVolumeMl: 100,
    ingredients: [
      { name: { zh: "SDS", en: "SDS" }, amount: 10, unit: "g" },
    ],
    steps: [
      { zh: "避免扬尘，将 SDS 缓慢加入约 80% 终体积的水中。", en: "Avoid generating dust and slowly add SDS to about 80% of the final volume of water." },
      { zh: "轻柔搅拌至溶解，尽量避免大量泡沫。", en: "Stir gently until dissolved while minimizing foam." },
      { zh: "用水定容并按实验室规定标注。", en: "Bring to final volume with water and label under local laboratory rules." },
    ],
    notes: [
      { zh: "SDS 粉尘可刺激呼吸道和眼睛；配制前核对供应商 SDS。", en: "SDS dust can irritate the respiratory tract and eyes; check the supplier SDS before preparation." },
      { zh: "10% w/v 表示每 100 mL 终体积含 10 g SDS，不是加入 100 mL 水。", en: "10% w/v means 10 g SDS per 100 mL final volume, not 10 g added to 100 mL water." },
    ],
    sourceLabel: "Thermo Fisher Scientific · standalone reagent recipes",
    sourceUrl: "https://www.thermofisher.com/us/en/home/life-science/protein-biology/protein-gel-electrophoresis/protein-gels/protein-gel-casting-cassettes.html",
    safetyQuery: "SDS",
  },
];

export type HazardCategory = "acute" | "corrosive" | "flammable" | "chronic" | "irritant";

export type ChemicalSafetyRecord = {
  id: string;
  name: LocalizedText;
  aliases: string[];
  cas: string;
  formula: string;
  cid: number;
  level: "critical" | "high" | "moderate";
  signal: LocalizedText;
  categories: HazardCategory[];
  ghs: Array<{ code: string; statement: LocalizedText }>;
  summary: LocalizedText;
  controls: LocalizedText[];
  incompatibilities: LocalizedText;
  special: LocalizedText;
};

export const CHEMICAL_SAFETY_RECORDS: ChemicalSafetyRecord[] = [
  {
    id: "acrylamide",
    name: { zh: "丙烯酰胺", en: "Acrylamide" },
    aliases: ["79-06-1", "2-propenamide", "丙烯酰胺"],
    cas: "79-06-1",
    formula: "C₃H₅NO",
    cid: 6579,
    level: "critical",
    signal: { zh: "危险", en: "Danger" },
    categories: ["acute", "chronic", "irritant"],
    ghs: [
      { code: "H301", statement: { zh: "吞咽中毒", en: "Toxic if swallowed" } },
      { code: "H340", statement: { zh: "可能导致遗传性缺陷", en: "May cause genetic defects" } },
      { code: "H350", statement: { zh: "可能致癌", en: "May cause cancer" } },
      { code: "H372", statement: { zh: "长期或反复接触会损害器官", en: "Causes organ damage through prolonged or repeated exposure" } },
    ],
    summary: {
      zh: "未聚合的丙烯酰胺单体可经吞咽、吸入粉尘或皮肤接触造成危害，并具有遗传毒性和致癌性分类。",
      en: "Unpolymerized acrylamide monomer is hazardous by ingestion, dust inhalation, and skin contact, with mutagenicity and carcinogenicity classifications.",
    },
    controls: [
      { zh: "优先使用预制溶液或预制凝胶，减少称量单体粉末。", en: "Prefer premade solutions or gels to reduce handling of monomer powder." },
      { zh: "称量和转移粉末应使用经风险评估的局部排风，并避免任何皮肤接触。", en: "Weigh and transfer powder under risk-assessed local exhaust controls and prevent skin contact." },
    ],
    incompatibilities: { zh: "强氧化剂；受热或不当条件下可能发生聚合。", en: "Strong oxidizers; heat or unsuitable conditions can initiate polymerization." },
    special: { zh: "聚丙烯酰胺凝胶与未聚合单体的风险不同；不要将两者混为一谈。", en: "Polyacrylamide gel and unpolymerized monomer do not have the same hazard profile; do not treat them as equivalent." },
  },
  {
    id: "formaldehyde",
    name: { zh: "甲醛 / 福尔马林", en: "Formaldehyde / formalin" },
    aliases: ["50-00-0", "formalin", "methanal", "甲醛", "福尔马林"],
    cas: "50-00-0",
    formula: "CH₂O",
    cid: 712,
    level: "critical",
    signal: { zh: "危险", en: "Danger" },
    categories: ["acute", "corrosive", "chronic", "irritant"],
    ghs: [
      { code: "H314", statement: { zh: "造成严重皮肤灼伤和眼损伤", en: "Causes severe skin burns and eye damage" } },
      { code: "H317", statement: { zh: "可能导致皮肤过敏反应", en: "May cause an allergic skin reaction" } },
      { code: "H331", statement: { zh: "吸入中毒", en: "Toxic if inhaled" } },
      { code: "H350", statement: { zh: "可能致癌", en: "May cause cancer" } },
    ],
    summary: {
      zh: "甲醛蒸气可刺激并损伤眼、皮肤和呼吸道；其致癌与致敏风险要求在受控通风下操作。",
      en: "Formaldehyde vapor can irritate and damage the eyes, skin, and respiratory tract; its carcinogenic and sensitizing hazards require controlled ventilation.",
    },
    controls: [
      { zh: "开盖、分装和固定操作应在合格通风柜或机构批准的局部排风中进行。", en: "Open-container transfer and fixation work should be performed in a certified hood or institution-approved local exhaust." },
      { zh: "福尔马林常含甲醇；可燃性和毒性必须以当前配方 SDS 为准。", en: "Formalin often contains methanol; use the current formulation SDS for flammability and toxicity." },
    ],
    incompatibilities: { zh: "强氧化剂、强酸、强碱；具体配方可能含其他稳定剂。", en: "Strong oxidizers, strong acids, and strong bases; formulations may contain additional stabilizers." },
    special: { zh: "“甲醛气体”“甲醛水溶液”和不同浓度福尔马林并非同一个危险标签。", en: "Formaldehyde gas, aqueous formaldehyde, and formalin concentrations do not share one identical hazard label." },
  },
  {
    id: "phenol",
    name: { zh: "苯酚", en: "Phenol" },
    aliases: ["108-95-2", "carbolic acid", "hydroxybenzene", "苯酚"],
    cas: "108-95-2",
    formula: "C₆H₆O",
    cid: 996,
    level: "critical",
    signal: { zh: "危险", en: "Danger" },
    categories: ["acute", "corrosive", "chronic"],
    ghs: [
      { code: "H301", statement: { zh: "吞咽中毒", en: "Toxic if swallowed" } },
      { code: "H311", statement: { zh: "皮肤接触中毒", en: "Toxic in contact with skin" } },
      { code: "H314", statement: { zh: "造成严重皮肤灼伤和眼损伤", en: "Causes severe skin burns and eye damage" } },
      { code: "H341", statement: { zh: "怀疑导致遗传性缺陷", en: "Suspected of causing genetic defects" } },
    ],
    summary: {
      zh: "苯酚具有腐蚀性，并可迅速经皮肤吸收产生全身毒性；局部麻醉感可能掩盖组织损伤。",
      en: "Phenol is corrosive and can be rapidly absorbed through skin with systemic toxicity; local numbing can mask tissue injury.",
    },
    controls: [
      { zh: "在通风柜中操作，并依据供应商 SDS 的渗透数据选择手套，不默认普通一次性手套足够。", en: "Work in a fume hood and select gloves using permeation data in the supplier SDS; do not assume ordinary disposable gloves are sufficient." },
      { zh: "操作前确认洗眼器、安全淋浴与实验室苯酚暴露应急流程可用。", en: "Before work, confirm access to eyewash, safety shower, and the laboratory phenol-exposure procedure." },
    ],
    incompatibilities: { zh: "强氧化剂；避免与不相容金属和材料接触，详见产品 SDS 第 10 节。", en: "Strong oxidizers; avoid incompatible metals and materials listed in Section 10 of the product SDS." },
    special: { zh: "苯酚/氯仿混合液必须按混合物 SDS 管理，不能只看单一成分。", en: "Phenol/chloroform mixtures must be managed using the mixture SDS, not a single-ingredient record." },
  },
  {
    id: "chloroform",
    name: { zh: "氯仿", en: "Chloroform" },
    aliases: ["67-66-3", "trichloromethane", "CHCl3", "氯仿", "三氯甲烷"],
    cas: "67-66-3",
    formula: "CHCl₃",
    cid: 6212,
    level: "critical",
    signal: { zh: "危险", en: "Danger" },
    categories: ["acute", "chronic", "irritant"],
    ghs: [
      { code: "H302", statement: { zh: "吞咽有害", en: "Harmful if swallowed" } },
      { code: "H331", statement: { zh: "吸入中毒", en: "Toxic if inhaled" } },
      { code: "H351", statement: { zh: "怀疑致癌", en: "Suspected of causing cancer" } },
      { code: "H372", statement: { zh: "长期或反复接触会损害器官", en: "Causes organ damage through prolonged or repeated exposure" } },
    ],
    summary: {
      zh: "氯仿蒸气有急性吸入毒性，长期暴露可损害器官，并具有疑似致癌分类。",
      en: "Chloroform vapor presents acute inhalation toxicity, can damage organs after repeated exposure, and carries a suspected-carcinogen classification.",
    },
    controls: [
      { zh: "所有开口操作均在通风柜中进行，容器及时密闭。", en: "Perform all open-container work in a fume hood and close containers promptly." },
      { zh: "多种常见手套对氯仿的突破时间很短；必须按 SDS/兼容性表选材并制定更换频率。", en: "Many common gloves have short breakthrough times for chloroform; select materials and change intervals from SDS/compatibility data." },
    ],
    incompatibilities: { zh: "强碱、强氧化剂、部分活泼金属；光和空气可促进危险分解，稳定剂类型会影响管理。", en: "Strong bases, strong oxidizers, and some reactive metals; light and air can promote hazardous decomposition, and stabilizer choice affects handling." },
    special: { zh: "不要用气味判断暴露是否安全，也不要在普通台面长时间敞口操作。", en: "Do not use odor to judge safe exposure and do not leave chloroform open on the bench." },
  },
  {
    id: "methanol",
    name: { zh: "甲醇", en: "Methanol" },
    aliases: ["67-56-1", "methyl alcohol", "MeOH", "甲醇"],
    cas: "67-56-1",
    formula: "CH₄O",
    cid: 887,
    level: "critical",
    signal: { zh: "危险", en: "Danger" },
    categories: ["acute", "flammable", "chronic"],
    ghs: [
      { code: "H225", statement: { zh: "高度易燃液体和蒸气", en: "Highly flammable liquid and vapor" } },
      { code: "H301", statement: { zh: "吞咽中毒", en: "Toxic if swallowed" } },
      { code: "H311", statement: { zh: "皮肤接触中毒", en: "Toxic in contact with skin" } },
      { code: "H370", statement: { zh: "会损害器官", en: "Causes damage to organs" } },
    ],
    summary: {
      zh: "甲醇高度易燃，可经吞咽、吸入和皮肤接触导致严重中毒，典型靶器官包括视觉系统和中枢神经系统。",
      en: "Methanol is highly flammable and can cause severe poisoning through ingestion, inhalation, or skin contact, with the visual and central nervous systems among key targets.",
    },
    controls: [
      { zh: "远离火花、热源和明火；大量或易产生蒸气的操作在通风柜中完成。", en: "Keep away from sparks, heat, and flames; perform large-volume or vapor-generating work in a hood." },
      { zh: "废液置于合规的易燃有机废液容器，不倒入下水道。", en: "Collect waste in an approved flammable-organic waste container; do not drain-dispose." },
    ],
    incompatibilities: { zh: "强氧化剂与点火源。", en: "Strong oxidizers and ignition sources." },
    special: { zh: "中毒症状可能延迟；任何疑似暴露都应立即启动急救和医学评估。", en: "Poisoning symptoms can be delayed; any suspected exposure warrants immediate first-aid response and medical evaluation." },
  },
  {
    id: "ethanol",
    name: { zh: "乙醇", en: "Ethanol" },
    aliases: ["64-17-5", "ethyl alcohol", "EtOH", "乙醇", "酒精"],
    cas: "64-17-5",
    formula: "C₂H₆O",
    cid: 702,
    level: "moderate",
    signal: { zh: "危险", en: "Danger" },
    categories: ["flammable", "irritant"],
    ghs: [
      { code: "H225", statement: { zh: "高度易燃液体和蒸气", en: "Highly flammable liquid and vapor" } },
      { code: "H319", statement: { zh: "造成严重眼刺激", en: "Causes serious eye irritation" } },
    ],
    summary: {
      zh: "实验室浓乙醇的首要危险是高度易燃，蒸气可被远处点火源引燃；高浓度也可造成明显眼刺激。",
      en: "The primary laboratory hazard of concentrated ethanol is high flammability; vapor can ignite at a remote source, and concentrated product can seriously irritate eyes.",
    },
    controls: [
      { zh: "控制台面用量，远离热源、电火花和明火，按易燃液体要求储存。", en: "Limit bench quantities, keep away from heat, sparks, and flames, and store as a flammable liquid." },
      { zh: "70% 等水溶液仍可能易燃；不能因稀释就省略标签和储存评估。", en: "Aqueous formulations such as 70% can remain flammable; dilution does not remove labeling or storage assessment." },
    ],
    incompatibilities: { zh: "强氧化剂与点火源。", en: "Strong oxidizers and ignition sources." },
    special: { zh: "变性乙醇含有其他成分，毒性必须看该产品的 SDS，不能套用纯乙醇条目。", en: "Denatured ethanol contains additional chemicals; use that product's SDS rather than this pure-ethanol record." },
  },
  {
    id: "acetic-acid",
    name: { zh: "乙酸 / 冰醋酸", en: "Acetic acid / glacial acetic acid" },
    aliases: ["64-19-7", "acetic acid", "glacial acetic acid", "ethanoic acid", "乙酸", "醋酸", "冰醋酸"],
    cas: "64-19-7",
    formula: "C₂H₄O₂",
    cid: 176,
    level: "high",
    signal: { zh: "危险", en: "Danger" },
    categories: ["corrosive", "flammable"],
    ghs: [
      { code: "H226", statement: { zh: "易燃液体和蒸气", en: "Flammable liquid and vapor" } },
      { code: "H314", statement: { zh: "造成严重皮肤灼伤和眼损伤", en: "Causes severe skin burns and eye damage" } },
    ],
    summary: {
      zh: "冰醋酸具有腐蚀性和可燃性，挥发性蒸气可造成严重刺激；稀释放热并可能飞溅。",
      en: "Glacial acetic acid is corrosive and flammable, with strongly irritating vapor; dilution releases heat and can splash.",
    },
    controls: [
      { zh: "开盖、转移和浓液配制在通风柜中进行，并按飞溅风险使用眼面部防护。", en: "Open, transfer, and prepare concentrated material in a fume hood with eye/face protection matched to splash risk." },
      { zh: "稀释时将酸缓慢加入水中并搅拌冷却，远离点火源。", en: "For dilution, slowly add acid to water with stirring and cooling, away from ignition sources." },
    ],
    incompatibilities: { zh: "强氧化剂、强碱和多种活泼金属；按产品 SDS 第 10 节分区储存。", en: "Strong oxidizers, strong bases, and many reactive metals; segregate using Section 10 of the product SDS." },
    special: { zh: "冰醋酸与低浓度乙酸溶液的危险标签不同；配方中的体积必须对应正确纯度。", en: "Glacial acetic acid and dilute solutions do not carry identical labels; recipe volumes must match the specified purity." },
  },
  {
    id: "boric-acid",
    name: { zh: "硼酸", en: "Boric acid" },
    aliases: ["10043-35-3", "orthoboric acid", "boracic acid", "硼酸"],
    cas: "10043-35-3",
    formula: "H₃BO₃",
    cid: 7628,
    level: "high",
    signal: { zh: "危险", en: "Danger" },
    categories: ["chronic"],
    ghs: [
      { code: "H360FD", statement: { zh: "可能损害生育能力；可能对胎儿造成伤害", en: "May damage fertility; may damage the unborn child" } },
    ],
    summary: {
      zh: "硼酸具有生殖毒性分类。称量粉末和配制高浓度储备液时应尽量减少粉尘与人员暴露。",
      en: "Boric acid carries a reproductive-toxicity classification. Minimize dust and personal exposure when weighing powder or preparing concentrated stocks.",
    },
    controls: [
      { zh: "避免产生粉尘，在经风险评估的局部排风下称量并及时清洁残留。", en: "Avoid dust generation, weigh under risk-assessed local exhaust, and clean residues promptly." },
      { zh: "涉及孕期、生育计划或职业暴露关注时，遵循机构 EHS 的专项评估与替代要求。", en: "For pregnancy, fertility planning, or occupational-exposure concerns, follow institution-specific EHS assessment and substitution requirements." },
    ],
    incompatibilities: { zh: "不在无验证方案下与其他试剂混合；按当前产品 SDS 第 10 节确认不相容物。", en: "Do not combine outside a validated procedure; use Section 10 of the current product SDS for incompatibilities." },
    special: { zh: "“毒性较低”的经验印象不能替代其生殖毒性分类和本机构的暴露控制。", en: "A reputation for low acute toxicity does not override its reproductive classification or institutional exposure controls." },
  },
  {
    id: "sodium-dodecyl-sulfate",
    name: { zh: "十二烷基硫酸钠（SDS）", en: "Sodium dodecyl sulfate (SDS)" },
    aliases: ["151-21-3", "sodium lauryl sulfate", "SDS", "SLS", "十二烷基硫酸钠"],
    cas: "151-21-3",
    formula: "C₁₂H₂₅NaO₄S",
    cid: 3423265,
    level: "high",
    signal: { zh: "危险", en: "Danger" },
    categories: ["acute", "irritant"],
    ghs: [
      { code: "H302", statement: { zh: "吞咽有害", en: "Harmful if swallowed" } },
      { code: "H315", statement: { zh: "造成皮肤刺激", en: "Causes skin irritation" } },
      { code: "H318", statement: { zh: "造成严重眼损伤", en: "Causes serious eye damage" } },
      { code: "H335", statement: { zh: "可能引起呼吸道刺激", en: "May cause respiratory irritation" } },
    ],
    summary: {
      zh: "SDS 粉末可刺激呼吸道，且对眼睛具有严重损伤风险；配液时的主要控制点是避免扬尘和飞溅。",
      en: "SDS powder can irritate the respiratory tract and presents a serious eye-damage hazard; dust and splash prevention are the key controls during solution preparation.",
    },
    controls: [
      { zh: "缓慢加粉、轻柔搅拌，使用经风险评估的局部排风并佩戴合适眼部防护。", en: "Add powder slowly, stir gently, and use risk-assessed local exhaust with appropriate eye protection." },
      { zh: "及时清理粉末残留，避免用会再次扬尘的方式干扫。", en: "Clean powder residues promptly without dry-sweeping methods that re-aerosolize dust." },
    ],
    incompatibilities: { zh: "强氧化剂；按当前产品 SDS 第 10 节确认储存分区。", en: "Strong oxidizers; confirm storage segregation in Section 10 of the current product SDS." },
    special: { zh: "配成溶液会降低粉尘风险，但不会自动消除眼刺激、皮肤刺激或废液管理要求。", en: "Preparing a solution reduces dust risk but does not automatically remove eye, skin, or waste-management hazards." },
  },
  {
    id: "hydrochloric-acid",
    name: { zh: "盐酸", en: "Hydrochloric acid" },
    aliases: ["7647-01-0", "HCl", "muriatic acid", "盐酸", "氯化氢"],
    cas: "7647-01-0",
    formula: "HCl",
    cid: 313,
    level: "high",
    signal: { zh: "危险", en: "Danger" },
    categories: ["corrosive", "irritant"],
    ghs: [
      { code: "H290", statement: { zh: "可能腐蚀金属", en: "May be corrosive to metals" } },
      { code: "H314", statement: { zh: "造成严重皮肤灼伤和眼损伤", en: "Causes severe skin burns and eye damage" } },
      { code: "H335", statement: { zh: "可能引起呼吸道刺激", en: "May cause respiratory irritation" } },
    ],
    summary: {
      zh: "浓盐酸具有强腐蚀性并释放刺激性氯化氢蒸气；危险分类会随浓度变化。",
      en: "Concentrated hydrochloric acid is strongly corrosive and releases irritating hydrogen chloride vapor; classification changes with concentration.",
    },
    controls: [
      { zh: "浓酸开盖、转移和调 pH 在通风柜中进行，并根据飞溅风险配置眼面部防护。", en: "Open, transfer, and use concentrated acid for pH adjustment in a fume hood, with eye/face protection matched to splash risk." },
      { zh: "稀释时把酸缓慢加入水中并搅拌冷却，切勿把水倒入浓酸。", en: "For dilution, slowly add acid to water with stirring and cooling; never add water to concentrated acid." },
    ],
    incompatibilities: { zh: "碱、活泼金属、氧化剂；与氰化物或硫化物接触可释放高毒气体。", en: "Bases, reactive metals, and oxidizers; contact with cyanides or sulfides can release highly toxic gases." },
    special: { zh: "本条目的 H290/H314/H335 更接近常见浓盐酸溶液；氯化氢气体有不同分类。", en: "The H290/H314/H335 summary is representative of common concentrated solutions; hydrogen chloride gas has a different classification." },
  },
  {
    id: "sodium-hydroxide",
    name: { zh: "氢氧化钠", en: "Sodium hydroxide" },
    aliases: ["1310-73-2", "NaOH", "caustic soda", "氢氧化钠", "烧碱"],
    cas: "1310-73-2",
    formula: "NaOH",
    cid: 14798,
    level: "high",
    signal: { zh: "危险", en: "Danger" },
    categories: ["corrosive"],
    ghs: [
      { code: "H290", statement: { zh: "可能腐蚀金属", en: "May be corrosive to metals" } },
      { code: "H314", statement: { zh: "造成严重皮肤灼伤和眼损伤", en: "Causes severe skin burns and eye damage" } },
    ],
    summary: {
      zh: "氢氧化钠固体和浓溶液具有强腐蚀性；溶解和稀释时大量放热，可造成沸腾与飞溅。",
      en: "Solid and concentrated sodium hydroxide are strongly corrosive; dissolution and dilution release substantial heat and can cause boiling or splashing.",
    },
    controls: [
      { zh: "将 NaOH 少量、缓慢加入水中并持续搅拌冷却；不要把水直接倒在大量固体上。", en: "Add NaOH to water slowly in small portions with continuous stirring and cooling; do not pour water directly onto a large mass of solid." },
      { zh: "根据浓度、规模和飞溅风险使用护目镜、面屏及耐化学腐蚀防护。", en: "Use goggles, face protection, and chemically resistant PPE appropriate to concentration, scale, and splash risk." },
    ],
    incompatibilities: { zh: "酸；铝、锌等金属可能释放可燃氢气；与部分有机物反应。", en: "Acids; metals such as aluminum and zinc can release flammable hydrogen; reacts with some organic materials." },
    special: { zh: "低浓度溶液与固体/浓碱的标签不同，仍应按实际产品和浓度查 SDS。", en: "Dilute solutions do not share the same label as solid or concentrated base; always use the actual product and concentration SDS." },
  },
];

export const PUBCHEM_GHS_URL = "https://pubchem.ncbi.nlm.nih.gov/ghs/ghs_10.html";
export const OSHA_SDS_URL = "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200";
