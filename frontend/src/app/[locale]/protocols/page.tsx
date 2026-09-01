"use client";

import { useMemo, useState } from "react";
import { Link } from "@/navigation";
import {
  PROTOCOLS,
  type ProtocolCategory,
  type ProtocolRecord,
} from "@/lib/protocol-data";

type CategoryFilter = "all" | ProtocolCategory;

const COPY = {
  zh: {
    kicker: "PRIMERCAT · BENCH PROTOCOLS",
    title: "实验流程库",
    intro: "面向研究实验室的结构化参考流程。每份文件明确适用范围、关键参数、必要对照、验收标准和原始来源。",
    libraryCount: "8 份参考流程",
    categoryCount: "4 个专业方向",
    sourced: "来源与边界可追溯",
    searchLabel: "搜索实验流程",
    searchPlaceholder: "搜索 PCR、连接、转化、Western blot…",
    all: "全部",
    categories: {
      "nucleic-acid": "核酸",
      cloning: "分子克隆",
      microbiology: "微生物",
      protein: "蛋白",
    },
    results: "个流程",
    routine: "常规",
    advanced: "进阶",
    documentId: "文件编号",
    revision: "版本",
    reviewed: "内容复核",
    documentType: "文件属性",
    referenceWorkflow: "研究参考流程",
    applicability: "适用范围与排除项",
    parameters: "关键参数与适用条件",
    parameter: "参数",
    referenceValue: "参考值",
    parameterBoundary: "适用说明",
    controls: "必要对照",
    materials: "试剂、耗材与设备",
    steps: "操作程序",
    acceptance: "验收标准",
    records: "必须记录",
    complete: "完成",
    reset: "重置本流程",
    checkpoint: "检查点",
    critical: "关键边界",
    safety: "安全提醒",
    source: "查看原始方法来源",
    related: "相关工具",
    solutionLink: "溶液配制",
    safetyLink: "试剂安全",
    noResults: "没有找到匹配流程，请尝试更短的关键词。",
    disclaimer: "文件属性：研究参考流程，不是经机构批准的受控 SOP。使用前必须由实验负责人依据具体试剂、设备、样本和风险评估完成本地验证；产品说明书和机构制度优先。",
  },
  en: {
    kicker: "PRIMERCAT · BENCH PROTOCOLS",
    title: "Protocol library",
    intro: "Structured reference workflows for research laboratories. Every document defines scope, critical parameters, required controls, acceptance criteria, and original sources.",
    libraryCount: "8 reference workflows",
    categoryCount: "4 technical areas",
    sourced: "Traceable sources & limits",
    searchLabel: "Search protocols",
    searchPlaceholder: "Search PCR, ligation, transformation, western blot…",
    all: "All",
    categories: {
      "nucleic-acid": "Nucleic acid",
      cloning: "Molecular cloning",
      microbiology: "Microbiology",
      protein: "Protein",
    },
    results: "workflows",
    routine: "Routine",
    advanced: "Advanced",
    documentId: "Document ID",
    revision: "Revision",
    reviewed: "Content review",
    documentType: "Document type",
    referenceWorkflow: "Research reference workflow",
    applicability: "Scope and exclusions",
    parameters: "Critical parameters and conditions",
    parameter: "Parameter",
    referenceValue: "Reference value",
    parameterBoundary: "Applicability note",
    controls: "Required controls",
    materials: "Reagents, consumables, and equipment",
    steps: "Procedure",
    acceptance: "Acceptance criteria",
    records: "Required records",
    complete: "complete",
    reset: "Reset this workflow",
    checkpoint: "Checkpoint",
    critical: "Critical boundary",
    safety: "Safety note",
    source: "Open original protocol source",
    related: "Related tools",
    solutionLink: "Solution preparation",
    safetyLink: "Reagent safety",
    noResults: "No protocol matches. Try a shorter search term.",
    disclaimer: "Document type: research reference workflow, not an institution-approved controlled SOP. The laboratory owner must validate it locally against the actual reagents, equipment, samples, and risk assessment; product instructions and institutional rules take precedence.",
  },
} as const;

function normalized(value: string) {
  return value.toLocaleLowerCase().replace(/[\s_\-/]+/g, "");
}

function text(protocol: ProtocolRecord, zh: boolean) {
  return {
    title: zh ? protocol.title.zh : protocol.title.en,
    summary: zh ? protocol.summary.zh : protocol.summary.en,
    duration: zh ? protocol.duration.zh : protocol.duration.en,
  };
}

export default function ProtocolsPage({ params: { locale } }: { params: { locale: string } }) {
  const zh = locale === "zh";
  const copy = zh ? COPY.zh : COPY.en;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [selectedId, setSelectedId] = useState(PROTOCOLS[0].id);
  const [completed, setCompleted] = useState<Record<string, string[]>>({});

  const filtered = useMemo(() => {
    const needle = normalized(query);
    return PROTOCOLS.filter((protocol) => {
      if (category !== "all" && protocol.category !== category) return false;
      if (!needle) return true;
      const searchable = [
        protocol.id,
        protocol.title.zh,
        protocol.title.en,
        protocol.summary.zh,
        protocol.summary.en,
        protocol.sourceLabel,
      ].join(" ");
      return normalized(searchable).includes(needle);
    });
  }, [category, query]);

  const selected = filtered.find((protocol) => protocol.id === selectedId) ?? filtered[0] ?? null;
  const completedSteps = selected ? completed[selected.id] ?? [] : [];
  const progress = selected ? Math.round((completedSteps.length / selected.steps.length) * 100) : 0;
  const documentNumber = selected ? PROTOCOLS.findIndex((protocol) => protocol.id === selected.id) + 1 : 0;
  const documentId = `PC-PRO-${String(documentNumber).padStart(3, "0")}`;

  function chooseProtocol(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.setTimeout(() => document.getElementById("protocol-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  }

  function toggleStep(index: number) {
    if (!selected) return;
    const stepId = `${selected.id}-${index}`;
    setCompleted((current) => {
      const currentSteps = current[selected.id] ?? [];
      const nextSteps = currentSteps.includes(stepId)
        ? currentSteps.filter((item) => item !== stepId)
        : [...currentSteps, stepId];
      return { ...current, [selected.id]: nextSteps };
    });
  }

  const categories: CategoryFilter[] = ["all", "nucleic-acid", "cloning", "microbiology", "protein"];

  return (
    <div className="protocol-page">
      <section className="protocol-hero">
        <div>
          <span className="protocol-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
      </section>

      <section className="protocol-controls" aria-label={zh ? "搜索与筛选" : "Search and filters"}>
        <label>
          <span>{copy.searchLabel}</span>
          <span className="protocol-search-field">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" /><path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label={zh ? "清空搜索" : "Clear search"}>×</button> : null}
          </span>
        </label>
        <div className="protocol-filter-row">
          {categories.map((item) => (
            <button key={item} type="button" data-active={category === item} onClick={() => setCategory(item)}>
              {item === "all" ? copy.all : copy.categories[item]}
              <span>{item === "all" ? PROTOCOLS.length : PROTOCOLS.filter((protocol) => protocol.category === item).length}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="protocol-workspace">
        <aside className="protocol-library" aria-label={zh ? "流程列表" : "Protocol list"}>
          <div className="protocol-library-head"><span>{filtered.length} {copy.results}</span></div>
          {filtered.length ? (
            <div className="protocol-list">
              {filtered.map((protocol) => {
                const localized = text(protocol, zh);
                const done = completed[protocol.id]?.length ?? 0;
                return (
                  <button
                    type="button"
                    key={protocol.id}
                    className="protocol-list-item"
                    data-active={selected?.id === protocol.id}
                    onClick={() => chooseProtocol(protocol.id)}
                    aria-pressed={selected?.id === protocol.id}
                  >
                    <span className="protocol-list-copy">
                      <strong>{localized.title}</strong>
                      <small>{copy.categories[protocol.category]} · {localized.duration}</small>
                    </span>
                    <span className="protocol-list-progress" aria-label={`${done}/${protocol.steps.length}`}>{done ? `${done}/${protocol.steps.length}` : "→"}</span>
                  </button>
                );
              })}
            </div>
          ) : <p className="protocol-empty">{copy.noResults}</p>}
        </aside>

        {selected ? (
          <article className="protocol-detail" id="protocol-detail">
            <header className="protocol-detail-head">
              <div>
                <div className="protocol-detail-meta">
                  <span>{copy.categories[selected.category]}</span>
                  <span>{zh ? selected.duration.zh : selected.duration.en}</span>
                  <span>{selected.difficulty === "routine" ? copy.routine : copy.advanced}</span>
                </div>
                <h2>{zh ? selected.title.zh : selected.title.en}</h2>
                <p>{zh ? selected.summary.zh : selected.summary.en}</p>
              </div>
            </header>

            <dl className="protocol-document-control">
              <div><dt>{copy.documentId}</dt><dd>{documentId}</dd></div>
              <div><dt>{copy.revision}</dt><dd>1.0</dd></div>
              <div><dt>{copy.reviewed}</dt><dd>2026-08-31</dd></div>
              <div><dt>{copy.documentType}</dt><dd>{copy.referenceWorkflow}</dd></div>
            </dl>

            <section className="protocol-progress" aria-label={zh ? "本次完成进度" : "Session progress"}>
              <div>
                <span>{copy.steps}</span>
                <strong>{progress}% {copy.complete}</strong>
              </div>
              <div className="protocol-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>
              {completedSteps.length ? <button type="button" onClick={() => setCompleted((current) => ({ ...current, [selected.id]: [] }))}>{copy.reset}</button> : null}
            </section>

            <section className="protocol-scope protocol-document-section">
              <h3><span>01</span>{copy.applicability}</h3>
              <p>{zh ? selected.applicability.zh : selected.applicability.en}</p>
            </section>

            <section className="protocol-parameters protocol-document-section">
              <h3><span>02</span>{copy.parameters}</h3>
              <div className="protocol-parameter-table-wrap">
                <table>
                  <thead><tr><th>{copy.parameter}</th><th>{copy.referenceValue}</th><th>{copy.parameterBoundary}</th></tr></thead>
                  <tbody>{selected.parameters.map((parameter, index) => (
                    <tr key={index}>
                      <th>{zh ? parameter.label.zh : parameter.label.en}</th>
                      <td>{zh ? parameter.value.zh : parameter.value.en}</td>
                      <td>{zh ? parameter.note.zh : parameter.note.en}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>

            <section className="protocol-controls-list protocol-document-section">
              <h3><span>03</span>{copy.controls}</h3>
              <ol>{selected.controls.map((item, index) => <li key={index}><strong>{String(index + 1).padStart(2, "0")}</strong><span>{zh ? item.zh : item.en}</span></li>)}</ol>
            </section>

            <section className="protocol-materials">
              <h3><span>04</span>{copy.materials}</h3>
              <ul>{selected.materials.map((item, index) => <li key={index}>{zh ? item.zh : item.en}</li>)}</ul>
            </section>

            <section className="protocol-steps">
              <h3><span>05</span>{copy.steps}</h3>
              <div>
                {selected.steps.map((step, index) => {
                  const stepId = `${selected.id}-${index}`;
                  const isDone = completedSteps.includes(stepId);
                  return (
                    <article key={stepId} className="protocol-step" data-complete={isDone}>
                      <button type="button" className="protocol-step-check" onClick={() => toggleStep(index)} aria-label={zh ? `${isDone ? "取消完成" : "完成"}步骤 ${index + 1}` : `${isDone ? "Mark incomplete" : "Complete"} step ${index + 1}`} aria-pressed={isDone}>
                        <span>{isDone ? "✓" : String(index + 1).padStart(2, "0")}</span>
                      </button>
                      <div>
                        <h4>{zh ? step.title.zh : step.title.en}</h4>
                        <p>{zh ? step.body.zh : step.body.en}</p>
                        {step.checkpoint ? <aside><strong>{copy.checkpoint}</strong><span>{zh ? step.checkpoint.zh : step.checkpoint.en}</span></aside> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="protocol-outcomes">
              <article>
                <h3><span>06</span>{copy.acceptance}</h3>
                <ul>{selected.acceptance.map((item, index) => <li key={index}>{zh ? item.zh : item.en}</li>)}</ul>
              </article>
              <article>
                <h3><span>07</span>{copy.records}</h3>
                <ul>{selected.records.map((item, index) => <li key={index}>{zh ? item.zh : item.en}</li>)}</ul>
              </article>
            </section>

            <section className="protocol-boundaries">
              <article className="is-critical"><span>!</span><div><h3>{copy.critical}</h3><p>{zh ? selected.critical.zh : selected.critical.en}</p></div></article>
              <article className="is-safety"><span>◆</span><div><h3>{copy.safety}</h3><p>{zh ? selected.safety.zh : selected.safety.en}</p></div></article>
            </section>

            <footer className="protocol-detail-footer">
              <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">{copy.source}<span>↗</span><small>{selected.sourceLabel}</small></a>
              <div><span>{copy.related}</span><Link href="/solutions">{copy.solutionLink}</Link><Link href="/chemical-safety">{copy.safetyLink}</Link></div>
            </footer>
          </article>
        ) : null}
      </div>

      <p className="protocol-disclaimer">{copy.disclaimer}</p>
    </div>
  );
}
