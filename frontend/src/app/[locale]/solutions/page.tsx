"use client";

import { useMemo, useState } from "react";
import { Link } from "@/navigation";
import {
  CHEMICAL_SAFETY_RECORDS,
  SOLUTION_RECIPES,
  type ChemicalSafetyRecord,
  type SolutionRecipe,
} from "@/lib/lab-reference-data";

type CalculatorMode = "molar" | "dilution" | "percent";

const COPY = {
  zh: {
    kicker: "Lab bench · 配制与换算",
    title: "实验室溶液配制指南",
    intro: "先算清楚，再按可追溯配方操作。通用计算器负责摩尔浓度、稀释和百分浓度；标准配方卡负责组分、步骤、缩放和来源。",
    heroMetric: "V5 核酸与蛋白储备液包",
    heroValue: "3 类计算 · 29 个配方",
    heroBody: "配方原料直接关联毒性库，并明确显示加料顺序、不相容性和废液边界。",
    calculator: "通用计算器",
    calculatorIntro: "输入数值后即时计算。所有体积均指终体积（final volume），不是简单加入相同体积的水。",
    molar: "摩尔溶液",
    dilution: "储备液稀释",
    percent: "百分浓度",
    mw: "摩尔质量",
    concentration: "目标浓度",
    finalVolume: "终体积",
    stockConcentration: "储备液浓度 C₁",
    targetConcentration: "目标浓度 C₂",
    sameUnit: "同一单位",
    stockVolume: "需要储备液 V₁",
    bringTo: "再用溶剂定容至",
    massNeeded: "需要称取",
    equationMolar: "m = C × V × MW",
    equationDilution: "C₁V₁ = C₂V₂",
    concentrationType: "浓度定义",
    percentValue: "目标百分浓度",
    componentNeeded: "需要组分",
    wv: "w/v（g / 100 mL）",
    vv: "v/v（mL / 100 mL）",
    percentNoteWv: "先溶解称取的溶质，再用溶剂定容；不要把“加水量”直接写成终体积。",
    percentNoteVv: "量取液体组分后用溶剂定容。混合体积可能不完全相加，因此不直接给出“溶剂体积差值”。",
    invalid: "请输入大于 0 的有效数值。",
    dilutionInvalid: "储备液浓度必须高于或等于目标浓度。",
    mwHelper: "摩尔质量可从试剂标签、供应商 SDS 或本站分子量工具确认。",
    openMw: "打开分子量计算器",
    recipesKicker: "可缩放标准配方",
    recipesTitle: "常用配方",
    recipesIntro: "修改每张卡片的终体积，所有定量组分会同比缩放。pH 调节剂和定容用水仍按实测处理。",
    all: "全部",
    buffer: "缓冲液",
    electrophoresis: "电泳",
    stock: "储备液",
    finalVolumeLabel: "目标终体积",
    ingredient: "组分",
    amount: "用量",
    steps: "配制步骤",
    notes: "关键边界",
    source: "查看原始来源",
    safety: "查询试剂安全",
    linkedSafety: "配方安全联动",
    linkedRecords: "条试剂记录",
    strongest: "最高关注级别",
    openRecord: "查看安全卡",
    openRecipe: "展开配方",
    closeRecipe: "收起配方",
    recipesShown: "个配方",
    noLinkedRecords: "当前配方没有映射到毒性库中的高关注试剂；这不代表所有原料均无危险，仍须核对每个产品 SDS。",
    additionOrder: "关键加料顺序",
    incompatibility: "禁配与不相容",
    waste: "废液判断",
    critical: "极高关注",
    high: "高关注",
    moderate: "常规重点",
    acute: "急性毒性",
    corrosive: "腐蚀",
    flammable: "易燃",
    oxidizer: "氧化剂",
    chronic: "长期危害",
    irritant: "刺激/致敏",
    safetyTitle: "配制前的最低安全检查",
    safetyItems: [
      "核对瓶身化学名称、CAS、浓度/纯度及水合状态，不能只看简称。",
      "阅读当前供应商 SDS 的第 2、4、6、7、8、10 节，并遵循本机构 EHS/SOP。",
      "确认通风、护目、手套兼容性、废液容器和暴露应急设施均已就绪。",
      "配酸碱或大体积浓缩液时评估放热、飞溅与容器容量，先留定容空间。",
    ],
    disclaimer: "本页是研究用途的计算与配方参考，不代替供应商 SDS、实验室 SOP、风险评估或专业安全培训。",
  },
  en: {
    kicker: "Lab bench · preparation & conversion",
    title: "Laboratory solution preparation guide",
    intro: "Calculate first, then work from traceable formulations. General calculators cover molarity, dilution, and percentage solutions; recipe cards provide ingredients, steps, scaling, and sources.",
    heroMetric: "V5 nucleic-acid & protein stock pack",
    heroValue: "3 calculators · 29 recipes",
    heroBody: "Recipe ingredients link directly to the safety library, with addition order, incompatibilities, and waste boundaries surfaced in every card.",
    calculator: "General calculators",
    calculatorIntro: "Results update from your inputs. Every volume is a final volume, not an instruction to add that same volume of water.",
    molar: "Molar solution",
    dilution: "Stock dilution",
    percent: "Percentage solution",
    mw: "Molar mass",
    concentration: "Target concentration",
    finalVolume: "Final volume",
    stockConcentration: "Stock concentration C₁",
    targetConcentration: "Target concentration C₂",
    sameUnit: "same unit",
    stockVolume: "Stock volume V₁",
    bringTo: "Then bring to",
    massNeeded: "Mass required",
    equationMolar: "m = C × V × MW",
    equationDilution: "C₁V₁ = C₂V₂",
    concentrationType: "Concentration definition",
    percentValue: "Target percentage",
    componentNeeded: "Component required",
    wv: "w/v (g / 100 mL)",
    vv: "v/v (mL / 100 mL)",
    percentNoteWv: "Dissolve the weighed solute, then bring to final volume with solvent; do not treat final volume as the water-addition volume.",
    percentNoteVv: "Measure the liquid component, then bring to final volume. Mixed volumes may not be perfectly additive, so a solvent difference is not prescribed.",
    invalid: "Enter valid values greater than zero.",
    dilutionInvalid: "Stock concentration must be greater than or equal to target concentration.",
    mwHelper: "Confirm molar mass from the reagent label, supplier SDS, or the PrimerCat molecular-weight tool.",
    openMw: "Open MW calculator",
    recipesKicker: "Scalable reference formulations",
    recipesTitle: "Common recipes",
    recipesIntro: "Change the target final volume on any card to scale quantitative ingredients. pH adjusters and water-to-volume remain measurement-driven.",
    all: "All",
    buffer: "Buffers",
    electrophoresis: "Electrophoresis",
    stock: "Stocks",
    finalVolumeLabel: "Target final volume",
    ingredient: "Ingredient",
    amount: "Amount",
    steps: "Preparation",
    notes: "Critical boundaries",
    source: "Open original source",
    safety: "Check reagent safety",
    linkedSafety: "Recipe safety links",
    linkedRecords: "linked reagent records",
    strongest: "Highest concern",
    openRecord: "Open safety card",
    openRecipe: "Open recipe",
    closeRecipe: "Close recipe",
    recipesShown: "recipes",
    noLinkedRecords: "This recipe currently has no high-concern reagent mapped in the safety library. That does not establish every ingredient as hazard-free; check each product SDS.",
    additionOrder: "Critical addition order",
    incompatibility: "Do not mix / incompatibilities",
    waste: "Waste decision",
    critical: "Critical concern",
    high: "High concern",
    moderate: "Routine priority",
    acute: "Acute toxicity",
    corrosive: "Corrosive",
    flammable: "Flammable",
    oxidizer: "Oxidizer",
    chronic: "Chronic hazard",
    irritant: "Irritant / sensitizer",
    safetyTitle: "Minimum safety check before preparation",
    safetyItems: [
      "Confirm chemical name, CAS, concentration/purity, and hydration state from the container—not an abbreviation alone.",
      "Read Sections 2, 4, 6, 7, 8, and 10 of the current supplier SDS and follow institutional EHS/SOP controls.",
      "Confirm ventilation, eye protection, glove compatibility, waste container, and exposure-response facilities before starting.",
      "For acids, bases, or large concentrated stocks, assess heat release, splashing, and vessel capacity, leaving room for final volume adjustment.",
    ],
    disclaimer: "This research-use guide does not replace the supplier SDS, laboratory SOP, risk assessment, or professional safety training.",
  },
} as const;

const CONCENTRATION_FACTORS: Record<string, number> = { M: 1, mM: 1e-3, "µM": 1e-6 };
const VOLUME_FACTORS: Record<string, number> = { L: 1, mL: 1e-3, "µL": 1e-6 };
const CHEMICALS_BY_ID = new Map(CHEMICAL_SAFETY_RECORDS.map((record) => [record.id, record]));
const CONCERN_RANK: Record<ChemicalSafetyRecord["level"], number> = { moderate: 0, high: 1, critical: 2 };

function positiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function compactNumber(value: number, maximumFractionDigits = 4) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    useGrouping: true,
  }).format(value);
}

function formatMass(grams: number) {
  if (grams >= 1) return `${compactNumber(grams)} g`;
  if (grams >= 1e-3) return `${compactNumber(grams * 1e3)} mg`;
  return `${compactNumber(grams * 1e6)} µg`;
}

function formatVolume(liters: number, preferredUnit: string) {
  const factor = VOLUME_FACTORS[preferredUnit] ?? 1e-3;
  return `${compactNumber(liters / factor)} ${preferredUnit}`;
}

function NumericField({ label, value, setValue, unit, setUnit, units }: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  unit?: string;
  setUnit?: (value: string) => void;
  units?: string[];
}) {
  return (
    <label className="lab-field">
      <span>{label}</span>
      <div className="lab-input-row">
        <input type="number" min="0" step="any" value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" />
        {units && unit && setUnit ? (
          <select value={unit} onChange={(event) => setUnit(event.target.value)} aria-label={`${label} unit`}>
            {units.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        ) : unit ? <b>{unit}</b> : null}
      </div>
    </label>
  );
}

function RecipeCard({ recipe, zh, expanded, onToggle }: {
  recipe: SolutionRecipe;
  zh: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const copy = zh ? COPY.zh : COPY.en;
  const [volume, setVolume] = useState(String(recipe.defaultVolumeMl));
  const targetVolume = positiveNumber(volume);
  const scale = targetVolume ? targetVolume / recipe.defaultVolumeMl : null;
  const linkedRecords = Array.from(new Set([
    ...recipe.ingredients.flatMap((ingredient) => ingredient.chemicalId ? [ingredient.chemicalId] : []),
    ...(recipe.safety.additionalChemicalIds ?? []),
  ])).map((id) => CHEMICALS_BY_ID.get(id)).filter((record): record is ChemicalSafetyRecord => Boolean(record));
  const strongestRecord = linkedRecords.reduce<ChemicalSafetyRecord | null>((current, record) => (
    !current || CONCERN_RANK[record.level] > CONCERN_RANK[current.level] ? record : current
  ), null);
  const title = zh ? recipe.title.zh : recipe.title.en;
  const subtitle = zh ? recipe.subtitle.zh : recipe.subtitle.en;
  const detailId = `${recipe.id}-detail`;

  return (
    <article className={`lab-recipe-card${expanded ? " is-open" : ""}`} id={recipe.id}>
      <button className="lab-recipe-summary" type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={detailId}>
        <span className="lab-recipe-type-mark" aria-hidden="true" />
        <span className="lab-recipe-summary-copy">
          <span className="lab-recipe-category">{copy[recipe.category]}</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </span>
        <span className="lab-recipe-summary-meta">
          <span>{linkedRecords.length} {copy.linkedRecords}</span>
          {strongestRecord && <b className={`lab-concern-${strongestRecord.level}`}>{copy[strongestRecord.level]}</b>}
        </span>
        <span className="lab-recipe-toggle-label">{expanded ? copy.closeRecipe : copy.openRecipe}<b aria-hidden="true">⌄</b></span>
      </button>

      {expanded && <div className="lab-recipe-detail" id={detailId}>
      <div className="lab-recipe-head lab-recipe-detail-bar">
        <label className="lab-volume-control">
          <span>{copy.finalVolumeLabel}</span>
          <div><input type="number" min="0.001" step="any" value={volume} onChange={(event) => setVolume(event.target.value)} /><b>mL</b></div>
        </label>
      </div>

      <div className="lab-ingredient-table" role="table" aria-label={`${zh ? recipe.title.zh : recipe.title.en} ingredients`}>
        <div className="lab-ingredient-row lab-ingredient-header" role="row">
          <span role="columnheader">{copy.ingredient}</span><span role="columnheader">{copy.amount}</span>
        </div>
        {recipe.ingredients.map((ingredient) => {
          const linkedRecord = ingredient.chemicalId ? CHEMICALS_BY_ID.get(ingredient.chemicalId) : undefined;
          return <div className="lab-ingredient-row" role="row" key={`${ingredient.name.en}-${ingredient.unit}`}>
            <span className="lab-ingredient-name" role="cell">
              <span>{zh ? ingredient.name.zh : ingredient.name.en}</span>
              {linkedRecord && <Link href={`/chemical-safety?q=${encodeURIComponent(linkedRecord.cas)}`}>{copy.openRecord} →</Link>}
            </span>
            <strong role="cell">{scale ? `${compactNumber(ingredient.amount * scale)} ${ingredient.unit}` : "—"}</strong>
          </div>;
        })}
      </div>

      <section className="lab-recipe-safety-panel">
        <header>
          <div><span>Safety link</span><h4>{copy.linkedSafety}</h4></div>
          <div className="lab-recipe-safety-metrics">
            <span><b>{linkedRecords.length}</b>{copy.linkedRecords}</span>
            {strongestRecord && <span><small>{copy.strongest}</small><b className={`lab-concern-${strongestRecord.level}`}>{copy[strongestRecord.level]}</b></span>}
          </div>
        </header>
        {linkedRecords.length ? <div className="lab-linked-reagent-grid">
          {linkedRecords.map((record) => <Link key={record.id} href={`/chemical-safety?q=${encodeURIComponent(record.cas)}`} className={`lab-linked-reagent lab-linked-reagent-${record.level}`}>
            <span><b>{zh ? record.name.zh : record.name.en}</b><small>{copy[record.level]}</small></span>
            <em>{record.categories.slice(0, 3).map((category) => copy[category]).join(" · ") || (zh ? "核对产品 SDS" : "Check product SDS")}</em>
          </Link>)}
        </div> : <p className="lab-no-linked-records">{copy.noLinkedRecords}</p>}
        <div className="lab-recipe-safety-guidance">
          <article><span>01</span><div><h5>{copy.additionOrder}</h5><p>{zh ? recipe.safety.additionOrder.zh : recipe.safety.additionOrder.en}</p></div></article>
          <article><span>02</span><div><h5>{copy.incompatibility}</h5><p>{zh ? recipe.safety.incompatibilities.zh : recipe.safety.incompatibilities.en}</p></div></article>
          <article><span>03</span><div><h5>{copy.waste}</h5><p>{zh ? recipe.safety.waste.zh : recipe.safety.waste.en}</p></div></article>
        </div>
      </section>

      <div className="lab-recipe-sections">
        <section>
          <h4>{copy.steps}</h4>
          <ol>{recipe.steps.map((step, index) => <li key={index}>{zh ? step.zh : step.en}</li>)}</ol>
        </section>
        <section className="lab-recipe-notes">
          <h4>{copy.notes}</h4>
          <ul>{recipe.notes.map((note, index) => <li key={index}>{zh ? note.zh : note.en}</li>)}</ul>
        </section>
      </div>

      <div className="lab-recipe-actions">
        <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">{copy.source} ↗</a>
        <Link href={recipe.safetyQuery ? `/chemical-safety?q=${encodeURIComponent(recipe.safetyQuery)}` : "/chemical-safety"}>{copy.safety} →</Link>
      </div>
      </div>}
    </article>
  );
}

export default function SolutionsPage({ params: { locale } }: { params: { locale: string } }) {
  const zh = locale === "zh";
  const copy = zh ? COPY.zh : COPY.en;
  const [mode, setMode] = useState<CalculatorMode>("molar");
  const [mw, setMw] = useState("58.44");
  const [molarConcentration, setMolarConcentration] = useState("1");
  const [molarUnit, setMolarUnit] = useState("M");
  const [molarVolume, setMolarVolume] = useState("1");
  const [molarVolumeUnit, setMolarVolumeUnit] = useState("L");
  const [stockConcentration, setStockConcentration] = useState("10");
  const [targetConcentration, setTargetConcentration] = useState("1");
  const [dilutionVolume, setDilutionVolume] = useState("1");
  const [dilutionVolumeUnit, setDilutionVolumeUnit] = useState("L");
  const [percentType, setPercentType] = useState<"wv" | "vv">("wv");
  const [percent, setPercent] = useState("10");
  const [percentVolume, setPercentVolume] = useState("100");
  const [percentVolumeUnit, setPercentVolumeUnit] = useState("mL");
  const [category, setCategory] = useState<"all" | SolutionRecipe["category"]>("all");
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(SOLUTION_RECIPES[0]?.id ?? null);

  const molarResult = useMemo(() => {
    const molarMass = positiveNumber(mw);
    const concentration = positiveNumber(molarConcentration);
    const volume = positiveNumber(molarVolume);
    if (!molarMass || !concentration || !volume) return null;
    return molarMass * concentration * CONCENTRATION_FACTORS[molarUnit] * volume * VOLUME_FACTORS[molarVolumeUnit];
  }, [mw, molarConcentration, molarUnit, molarVolume, molarVolumeUnit]);

  const dilutionResult = useMemo(() => {
    const stock = positiveNumber(stockConcentration);
    const target = positiveNumber(targetConcentration);
    const finalVolume = positiveNumber(dilutionVolume);
    if (!stock || !target || !finalVolume || target > stock) return null;
    return {
      stockLiters: (target / stock) * finalVolume * VOLUME_FACTORS[dilutionVolumeUnit],
      finalLiters: finalVolume * VOLUME_FACTORS[dilutionVolumeUnit],
    };
  }, [stockConcentration, targetConcentration, dilutionVolume, dilutionVolumeUnit]);

  const percentResult = useMemo(() => {
    const pct = positiveNumber(percent);
    const volume = positiveNumber(percentVolume);
    if (!pct || !volume || (percentType === "vv" && pct > 100)) return null;
    const finalMl = volume * (VOLUME_FACTORS[percentVolumeUnit] / 1e-3);
    return (pct / 100) * finalMl;
  }, [percent, percentType, percentVolume, percentVolumeUnit]);

  const visibleRecipes = category === "all" ? SOLUTION_RECIPES : SOLUTION_RECIPES.filter((recipe) => recipe.category === category);
  const dilutionValuesValid = positiveNumber(stockConcentration) && positiveNumber(targetConcentration) && positiveNumber(dilutionVolume);

  return (
    <div className="lab-page solutions-page solutions-visual-pilot">
      <section className="solution-hero">
        <div>
          <span className="lab-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
        <aside className="solution-hero-meta">
          <span>{copy.heroMetric}</span>
          <strong>{copy.heroValue}</strong>
          <p>{copy.heroBody}</p>
        </aside>
      </section>

      <section className="lab-calculator-shell solution-section solution-calculator">
        <div className="lab-section-heading">
          <div><span>01</span><h2>{copy.calculator}</h2></div>
          <p>{copy.calculatorIntro}</p>
        </div>
        <div className="lab-tabs" role="tablist">
          {(["molar", "dilution", "percent"] as CalculatorMode[]).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => setMode(item)}>{copy[item]}</button>
          ))}
        </div>

        {mode === "molar" && (
          <div className="lab-calc-grid">
            <div className="lab-fields-grid">
              <NumericField label={copy.mw} value={mw} setValue={setMw} unit="g/mol" />
              <NumericField label={copy.concentration} value={molarConcentration} setValue={setMolarConcentration} unit={molarUnit} setUnit={setMolarUnit} units={["M", "mM", "µM"]} />
              <NumericField label={copy.finalVolume} value={molarVolume} setValue={setMolarVolume} unit={molarVolumeUnit} setUnit={setMolarVolumeUnit} units={["L", "mL", "µL"]} />
              <div className="lab-field-helper">{copy.mwHelper} <Link href="/mw-calc">{copy.openMw} →</Link></div>
            </div>
            <div className="lab-result-card" aria-live="polite">
              <span>{copy.equationMolar}</span>
              <p>{copy.massNeeded}</p>
              <strong>{molarResult === null ? "—" : formatMass(molarResult)}</strong>
              {molarResult === null && <small>{copy.invalid}</small>}
            </div>
          </div>
        )}

        {mode === "dilution" && (
          <div className="lab-calc-grid">
            <div className="lab-fields-grid">
              <NumericField label={copy.stockConcentration} value={stockConcentration} setValue={setStockConcentration} unit={copy.sameUnit} />
              <NumericField label={copy.targetConcentration} value={targetConcentration} setValue={setTargetConcentration} unit={copy.sameUnit} />
              <NumericField label={copy.finalVolume} value={dilutionVolume} setValue={setDilutionVolume} unit={dilutionVolumeUnit} setUnit={setDilutionVolumeUnit} units={["L", "mL", "µL"]} />
            </div>
            <div className="lab-result-card" aria-live="polite">
              <span>{copy.equationDilution}</span>
              <p>{copy.stockVolume}</p>
              <strong>{dilutionResult ? formatVolume(dilutionResult.stockLiters, dilutionVolumeUnit) : "—"}</strong>
              {dilutionResult && <small>{copy.bringTo} {formatVolume(dilutionResult.finalLiters, dilutionVolumeUnit)}</small>}
              {!dilutionResult && <small>{dilutionValuesValid ? copy.dilutionInvalid : copy.invalid}</small>}
            </div>
          </div>
        )}

        {mode === "percent" && (
          <div className="lab-calc-grid">
            <div className="lab-fields-grid">
              <label className="lab-field"><span>{copy.concentrationType}</span><select className="lab-wide-select" value={percentType} onChange={(event) => setPercentType(event.target.value as "wv" | "vv")}><option value="wv">{copy.wv}</option><option value="vv">{copy.vv}</option></select></label>
              <NumericField label={copy.percentValue} value={percent} setValue={setPercent} unit="%" />
              <NumericField label={copy.finalVolume} value={percentVolume} setValue={setPercentVolume} unit={percentVolumeUnit} setUnit={setPercentVolumeUnit} units={["L", "mL", "µL"]} />
            </div>
            <div className="lab-result-card" aria-live="polite">
              <span>{percentType === "wv" ? copy.wv : copy.vv}</span>
              <p>{copy.componentNeeded}</p>
              <strong>{percentResult === null ? "—" : `${compactNumber(percentResult)} ${percentType === "wv" ? "g" : "mL"}`}</strong>
              <small>{percentType === "wv" ? copy.percentNoteWv : copy.percentNoteVv}</small>
            </div>
          </div>
        )}
      </section>

      <section className="lab-recipes-section solution-section solution-library">
        <div className="lab-section-heading">
          <div><span>02</span><div><small>{copy.recipesKicker}</small><h2>{copy.recipesTitle}</h2></div></div>
          <p>{copy.recipesIntro}</p>
        </div>
        <div className="solution-library-toolbar">
          <div className="lab-filter-row">
            {(["all", "buffer", "electrophoresis", "stock"] as const).map((item) => <button key={item} type="button" data-active={category === item} onClick={() => { setCategory(item); setOpenRecipeId(null); }}>{copy[item]}</button>)}
          </div>
          <span><b>{visibleRecipes.length}</b> {copy.recipesShown}</span>
        </div>
        <div className="lab-recipe-grid">{visibleRecipes.map((recipe) => <RecipeCard
          key={recipe.id}
          recipe={recipe}
          zh={zh}
          expanded={openRecipeId === recipe.id}
          onToggle={() => setOpenRecipeId((current) => current === recipe.id ? null : recipe.id)}
        />)}</div>
      </section>

      <section className="lab-safety-check solution-safety-strip">
        <div><span>03</span><h2>{copy.safetyTitle}</h2></div>
        <ul>{copy.safetyItems.map((item) => <li key={item}>{item}</li>)}</ul>
        <div className="lab-safety-actions"><Link href="/chemical-safety">{copy.safety} →</Link><p>{copy.disclaimer}</p></div>
      </section>
    </div>
  );
}
