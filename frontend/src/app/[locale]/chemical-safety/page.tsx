"use client";

import { useMemo, useState } from "react";
import {
  CHEMICAL_INTERACTION_ALERTS,
  CHEMICAL_SAFETY_RECORDS,
  OSHA_SDS_URL,
  PUBCHEM_GHS_URL,
  type ChemicalMaterialType,
  type ChemicalSafetyRecord,
  type ChemicalUse,
  type HazardCategory,
} from "@/lib/lab-reference-data";

type SafetyFilter = "all" | HazardCategory;
type UseFilter = "all" | ChemicalUse;

const COPY = {
  zh: {
    kicker: "Chemical safety · GHS / LCSS",
    title: "实验室试剂安全与毒性查询",
    intro: "按名称、CAS 或化学式快速找到常见试剂的危险摘要、关键控制和不相容性。每条记录链接到 PubChem 原始页面，并明确提醒核对当前产品 SDS。",
    heroMetric: "V3 生命科学试剂库",
    reagentUnit: "种常见试剂",
    heroBody: "覆盖缓冲剂、去污剂、溶剂、染料、筛选药物和高危固定剂，并把商品混合物、浓度相关溶液与纯物质分开。",
    emergencyTitle: "发生暴露或泄漏时",
    emergencyBody: "立即停止操作并启动本实验室应急流程。人员暴露使用洗眼器/安全淋浴并尽快联系现场急救、EHS 或医疗机构；不要依据网页摘要自行处理中毒或大型泄漏。具体措施见该产品 SDS 第 4 节和第 6 节。",
    searchLabel: "搜索试剂",
    searchPlaceholder: "名称、别名、CAS、化学式，例如：DMSO / OsO₄ / 58-58-2",
    useFilterLabel: "按实验用途",
    hazardFilterLabel: "按危险类别",
    allUses: "全部用途",
    "nucleic-acid": "核酸",
    protein: "蛋白",
    "cell-culture": "细胞培养",
    histology: "组织学",
    general: "通用试剂",
    cleaning: "清洁消毒",
    all: "全部",
    acute: "急性毒性",
    corrosive: "腐蚀",
    flammable: "易燃",
    oxidizer: "氧化剂",
    chronic: "长期危害",
    irritant: "刺激/致敏",
    results: "条结果",
    noResults: "没有匹配的记录。请核对 CAS，或直接查阅供应商 SDS / PubChem。",
    cas: "CAS",
    formula: "化学式",
    material: "类型",
    substance: "纯物质",
    solution: "溶液/浓度相关",
    mixture: "混合物",
    product: "商品试剂",
    signal: "信号词",
    critical: "极高关注",
    high: "高关注",
    moderate: "常规重点",
    hazardSummary: "危险摘要",
    ghsStatements: "代表性 GHS 危险说明",
    controls: "操作控制",
    incompatibilities: "关键不相容性",
    special: "容易误判的边界",
    source: "PubChem LCSS 原始记录",
    expand: "展开完整安全卡",
    noGhs: "该来源未给出适用于所有形态/浓度的统一 H 代码；请打开来源并核对当前产品 SDS。",
    interactionKicker: "Known incompatibilities · 非穷尽清单",
    interactionTitle: "高危组合提醒",
    interactionIntro: "这里只展示有权威来源支持、会直接改变废液或操作方式的组合。未列出不代表可以安全混合。",
    interactionResponse: "立即采取",
    sourceModelTitle: "这些信息如何使用",
    sourceModelItems: [
      "页面中的 H 代码和信号词来自 PubChem LCSS/GHS 记录中的代表性分类；不同法规来源可能并不完全一致。",
      "纯物质、不同浓度溶液和商品混合物可能具有不同标签。真正操作时，以瓶身标识、当前供应商 SDS 和机构风险评估为准。",
      "PPE 不是固定清单：手套材料和更换时间必须依据具体化学品、浓度、接触时间和 SDS 渗透数据选择。",
      "本目录不提供个体化医疗建议，也不替代职业卫生暴露限值、废弃物规定或实验室安全培训。",
    ],
    sdsSectionsTitle: "操作前至少查看这些 SDS 章节",
    sdsSections: [
      ["2", "危险识别：分类、图示、H/P 说明"],
      ["4", "急救措施：该产品的暴露处置"],
      ["6", "泄漏处置：隔离、清理与报告"],
      ["7", "操作与储存：柜体、温度和分区"],
      ["8", "暴露控制 / PPE：通风、手套和眼面部防护"],
      ["10", "稳定性与反应性：不相容物和危险分解"],
    ],
    openGhs: "PubChem GHS 代码表",
    openOsha: "SDS 16 节结构说明",
    reviewed: "资料复核日期：2026-08-30",
    disclaimer: "仅供研究与实验室风险识别参考，不构成医疗建议。紧急情况请联系当地急救、毒物咨询中心和机构 EHS。",
  },
  en: {
    kicker: "Chemical safety · GHS / LCSS",
    title: "Laboratory reagent safety & toxicity",
    intro: "Search common reagents by name, CAS, or formula for hazard summaries, critical controls, and incompatibilities. Every record links to the source PubChem page and requires checking the current product SDS.",
    heroMetric: "V3 life-science reagent library",
    reagentUnit: "common reagents",
    heroBody: "Covers buffers, detergents, solvents, stains, selection drugs, and high-hazard fixatives while separating mixtures, concentration-specific solutions, and pure substances.",
    emergencyTitle: "If exposure or a spill occurs",
    emergencyBody: "Stop work and activate the laboratory emergency procedure. For personal exposure, use the eyewash/safety shower and promptly contact onsite response, EHS, or medical services. Do not use a web summary to self-treat poisoning or manage a large spill. Follow Sections 4 and 6 of the actual product SDS.",
    searchLabel: "Search reagents",
    searchPlaceholder: "Name, alias, CAS, or formula — e.g. DMSO / OsO₄ / 58-58-2",
    useFilterLabel: "By laboratory use",
    hazardFilterLabel: "By hazard category",
    allUses: "All uses",
    "nucleic-acid": "Nucleic acid",
    protein: "Protein",
    "cell-culture": "Cell culture",
    histology: "Histology",
    general: "General",
    cleaning: "Cleaning",
    all: "All",
    acute: "Acute toxicity",
    corrosive: "Corrosive",
    flammable: "Flammable",
    oxidizer: "Oxidizer",
    chronic: "Chronic hazard",
    irritant: "Irritant / sensitizer",
    results: "results",
    noResults: "No record matches. Verify the CAS or search the supplier SDS / PubChem directly.",
    cas: "CAS",
    formula: "Formula",
    material: "Type",
    substance: "Pure substance",
    solution: "Solution / concentration-specific",
    mixture: "Mixture",
    product: "Commercial reagent",
    signal: "Signal word",
    critical: "Critical concern",
    high: "High concern",
    moderate: "Routine priority",
    hazardSummary: "Hazard summary",
    ghsStatements: "Representative GHS hazard statements",
    controls: "Handling controls",
    incompatibilities: "Critical incompatibilities",
    special: "Boundary commonly missed",
    source: "Open PubChem LCSS record",
    expand: "Expand full safety card",
    noGhs: "This source does not provide one set of H-codes that applies to every form or concentration. Open the source and check the current product SDS.",
    interactionKicker: "Known incompatibilities · not exhaustive",
    interactionTitle: "High-risk combination alerts",
    interactionIntro: "Only combinations supported by authoritative sources and capable of changing waste or handling practice are shown. Absence from this list does not imply compatibility.",
    interactionResponse: "Immediate action",
    sourceModelTitle: "How to use this information",
    sourceModelItems: [
      "H-codes and signal words are representative classifications from PubChem LCSS/GHS records; regulatory sources may not be fully identical.",
      "Pure substances, solution concentrations, and commercial mixtures can carry different labels. For real work, the container label, current supplier SDS, and institutional risk assessment take precedence.",
      "PPE is not a fixed checklist: glove material and change interval depend on chemical, concentration, contact time, and SDS permeation data.",
      "This catalog does not provide individualized medical advice or replace occupational limits, waste rules, or laboratory safety training.",
    ],
    sdsSectionsTitle: "At minimum, review these SDS sections",
    sdsSections: [
      ["2", "Hazard identification: classes, pictograms, H/P statements"],
      ["4", "First aid: response for this exact product"],
      ["6", "Accidental release: isolation, cleanup, and reporting"],
      ["7", "Handling and storage: cabinet, temperature, and segregation"],
      ["8", "Exposure controls / PPE: ventilation, gloves, and eye/face protection"],
      ["10", "Stability and reactivity: incompatibles and hazardous decomposition"],
    ],
    openGhs: "PubChem GHS code table",
    openOsha: "SDS 16-section structure",
    reviewed: "Content reviewed: 2026-08-30",
    disclaimer: "For research and laboratory hazard recognition only; not medical advice. In an emergency, contact local emergency services, poison control, and institutional EHS.",
  },
} as const;

function normalize(value: string) {
  return value.toLowerCase().replace(/[₀-₉]/g, (character) => String("₀₁₂₃₄₅₆₇₈₉".indexOf(character))).replace(/[\s_-]+/g, "");
}

function ChemicalCard({ record, zh }: { record: ChemicalSafetyRecord; zh: boolean }) {
  const copy = zh ? COPY.zh : COPY.en;
  const materialType: ChemicalMaterialType = record.materialType ?? "substance";
  const sourceUrl = record.sourceUrl ?? `https://pubchem.ncbi.nlm.nih.gov/compound/${record.cid}`;
  const sourceLabel = record.sourceLabel ? (zh ? record.sourceLabel.zh : record.sourceLabel.en) : copy.source;
  return (
    <details className="chem-card" id={record.id}>
      <summary>
        <div className="chem-card-summary-main">
          <div className="chem-title-row">
            <h2>{zh ? record.name.zh : record.name.en}</h2>
            <span className={`chem-level chem-level-${record.level}`}>{copy[record.level]}</span>
          </div>
          <div className="chem-identifiers">
            <span>{copy.cas} <b>{record.cas}</b></span>
            <span>{copy.formula} <b>{record.formula}</b></span>
            <span>{copy.material} <b>{copy[materialType]}</b></span>
            <span>{copy.signal} <b>{zh ? record.signal.zh : record.signal.en}</b></span>
          </div>
          <p>{zh ? record.summary.zh : record.summary.en}</p>
          <div className="chem-use-row">{(record.uses ?? ["general"]).map((use) => <span key={use}>{copy[use]}</span>)}</div>
          <div className="chem-category-row">{record.categories.map((category) => <span key={category}>{copy[category]}</span>)}</div>
        </div>
        <span className="chem-expand-label">{copy.expand}<b>＋</b></span>
      </summary>
      <div className="chem-card-detail">
        <section>
          <h3>{copy.ghsStatements}</h3>
          {record.ghs.length ? <div className="chem-ghs-list">
            {record.ghs.map((item) => <div key={item.code}><b>{item.code}</b><span>{zh ? item.statement.zh : item.statement.en}</span></div>)}
          </div> : <p className="chem-no-ghs">{copy.noGhs}</p>}
        </section>
        <section>
          <h3>{copy.controls}</h3>
          <ul>{record.controls.map((item, index) => <li key={index}>{zh ? item.zh : item.en}</li>)}</ul>
        </section>
        <section>
          <h3>{copy.incompatibilities}</h3>
          <p>{zh ? record.incompatibilities.zh : record.incompatibilities.en}</p>
        </section>
        <section className="chem-boundary">
          <h3>{copy.special}</h3>
          <p>{zh ? record.special.zh : record.special.en}</p>
        </section>
        <a className="chem-source-link" href={sourceUrl} target="_blank" rel="noreferrer">{sourceLabel}{record.cid ? ` · CID ${record.cid}` : ""} ↗</a>
      </div>
    </details>
  );
}

export default function ChemicalSafetyPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { q?: string };
}) {
  const zh = locale === "zh";
  const copy = zh ? COPY.zh : COPY.en;
  const [query, setQuery] = useState(searchParams?.q ?? "");
  const [filter, setFilter] = useState<SafetyFilter>("all");
  const [useFilter, setUseFilter] = useState<UseFilter>("all");

  const records = useMemo(() => {
    const needle = normalize(query);
    return CHEMICAL_SAFETY_RECORDS.filter((record) => {
      if (filter !== "all" && !record.categories.includes(filter)) return false;
      if (useFilter !== "all" && !(record.uses ?? ["general"]).includes(useFilter)) return false;
      if (!needle) return true;
      const fields = [
        record.name.zh,
        record.name.en,
        record.cas,
        record.formula,
        ...record.aliases,
      ].map(normalize);
      return needle.length <= 3 ? fields.includes(needle) : fields.some((field) => field.includes(needle));
    });
  }, [query, filter, useFilter]);

  const filters: SafetyFilter[] = ["all", "acute", "corrosive", "flammable", "oxidizer", "chronic", "irritant"];
  const useFilters: UseFilter[] = ["all", "nucleic-acid", "protein", "cell-culture", "histology", "general", "cleaning"];

  return (
    <div className="lab-page chemical-safety-page">
      <section className="lab-hero chem-hero">
        <div>
          <span className="lab-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
        <aside>
          <span>{copy.heroMetric}</span>
          <strong>{CHEMICAL_SAFETY_RECORDS.length} {copy.reagentUnit}</strong>
          <p>{copy.heroBody}</p>
        </aside>
      </section>

      <section className="chem-emergency-banner">
        <div aria-hidden="true">!</div>
        <p><strong>{copy.emergencyTitle}</strong><span>{copy.emergencyBody}</span></p>
      </section>

      <section className="chem-interaction-section">
        <header>
          <span className="lab-kicker">{copy.interactionKicker}</span>
          <h2>{copy.interactionTitle}</h2>
          <p>{copy.interactionIntro}</p>
        </header>
        <div className="chem-interaction-grid">
          {CHEMICAL_INTERACTION_ALERTS.map((alert) => <article key={alert.id}>
            <span>{zh ? alert.reagents.zh : alert.reagents.en}</span>
            <h3>{zh ? alert.title.zh : alert.title.en}</h3>
            <p>{zh ? alert.summary.zh : alert.summary.en}</p>
            <div><b>{copy.interactionResponse}</b><p>{zh ? alert.response.zh : alert.response.en}</p></div>
            <a href={alert.sourceUrl} target="_blank" rel="noreferrer">{alert.sourceLabel} ↗</a>
          </article>)}
        </div>
      </section>

      <section className="chem-browser">
        <div className="chem-search-block">
          <label htmlFor="chemical-search">{copy.searchLabel}</label>
          <div className="chem-search-input"><span aria-hidden="true">⌕</span><input id="chemical-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} autoComplete="off" /></div>
        </div>
        <div className="chem-filter-group">
          <span>{copy.useFilterLabel}</span>
          <div className="lab-filter-row chem-filters" aria-label={zh ? "实验用途筛选" : "Laboratory use filter"}>
            {useFilters.map((item) => <button key={item} type="button" data-active={useFilter === item} onClick={() => setUseFilter(item)}>{item === "all" ? copy.allUses : copy[item]}</button>)}
          </div>
        </div>
        <div className="chem-filter-group">
          <span>{copy.hazardFilterLabel}</span>
          <div className="lab-filter-row chem-filters" aria-label={zh ? "危险类别筛选" : "Hazard category filter"}>
            {filters.map((item) => <button key={item} type="button" data-active={filter === item} onClick={() => setFilter(item)}>{copy[item]}</button>)}
          </div>
        </div>
        <div className="chem-results-count"><strong>{records.length}</strong> {copy.results}</div>

        <div className="chem-record-list">
          {records.length ? records.map((record) => <ChemicalCard key={record.id} record={record} zh={zh} />) : <div className="chem-no-results">{copy.noResults}</div>}
        </div>
      </section>

      <section className="chem-source-model">
        <div className="chem-source-copy">
          <span className="lab-kicker">LCSS → SDS → local controls</span>
          <h2>{copy.sourceModelTitle}</h2>
          <ul>{copy.sourceModelItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="chem-reference-links">
            <a href={PUBCHEM_GHS_URL} target="_blank" rel="noreferrer">{copy.openGhs} ↗</a>
            <a href={OSHA_SDS_URL} target="_blank" rel="noreferrer">{copy.openOsha} ↗</a>
          </div>
        </div>
        <aside>
          <h3>{copy.sdsSectionsTitle}</h3>
          <div>{copy.sdsSections.map(([number, label]) => <p key={number}><b>{number}</b><span>{label}</span></p>)}</div>
        </aside>
      </section>

      <footer className="chem-page-footer"><span>{copy.reviewed}</span><p>{copy.disclaimer}</p></footer>
    </div>
  );
}
