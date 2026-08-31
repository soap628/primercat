"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/lib/useToast";

type Ratios = Record<string, number>;
type SavedPlan = {
  id: string;
  savedAt: number;
  preset: string;
  projectName: string;
  total: number;
  duration: number;
  indirectShare: number;
  ratios: Ratios;
  yearShares: number[];
};

const PRESETS = {
  nsfc: { total: 30, duration: 3, indirectShare: 20 },
  provincial: { total: 20, duration: 3, indirectShare: 20 },
  postdoc: { total: 8, duration: 2, indirectShare: 15 },
  university: { total: 5, duration: 2, indirectShare: 10 },
  horizontal: { total: 50, duration: 3, indirectShare: 15 },
  custom: { total: 30, duration: 3, indirectShare: 20 },
} as const;

const DEFAULT_RATIOS: Ratios = {
  equipment: 15,
  materials: 30,
  testing: 18,
  travel: 12,
  publication: 8,
  labor: 12,
  consulting: 3,
  other: 2,
};

const OFFICIAL_POLICY_URL = "https://www.nsfc.gov.cn/publish/portal0/tab475/info81899.htm";

function equalShares(length: number) {
  const base = 100 / length;
  return Array.from({ length }, (_, index) => index === length - 1 ? 100 - base * (length - 1) : base);
}

function rebalance(values: Ratios, key: string, requested: number) {
  const next = Math.max(0, Math.min(70, requested));
  const otherKeys = Object.keys(values).filter((item) => item !== key);
  const otherTotal = otherKeys.reduce((sum, item) => sum + values[item], 0);
  const remaining = 100 - next;
  const result: Ratios = { ...values, [key]: next };
  if (otherTotal <= 0) {
    otherKeys.forEach((item) => { result[item] = remaining / otherKeys.length; });
  } else {
    otherKeys.forEach((item) => { result[item] = values[item] / otherTotal * remaining; });
  }
  return result;
}

function rebalanceYears(values: number[], index: number, requested: number) {
  const next = Math.max(0, Math.min(100, requested));
  const otherTotal = values.reduce((sum, value, itemIndex) => itemIndex === index ? sum : sum + value, 0);
  const remaining = 100 - next;
  return values.map((value, itemIndex) => {
    if (itemIndex === index) return next;
    return otherTotal <= 0 ? remaining / Math.max(1, values.length - 1) : value / otherTotal * remaining;
  });
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function encodePlan(plan: object) {
  return btoa(encodeURIComponent(JSON.stringify(plan)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodePlan(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").replaceAll(" ", "+");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(decodeURIComponent(atob(padded))) as Partial<SavedPlan>;
}

export default function FundCalculatorPage({ params: { locale } }: { params: { locale: string } }) {
  const zh = locale === "zh";
  const { toast } = useToast();
  const [preset, setPreset] = useState<keyof typeof PRESETS>("nsfc");
  const [projectName, setProjectName] = useState("");
  const [total, setTotal] = useState(30);
  const [duration, setDuration] = useState(3);
  const [indirectShare, setIndirectShare] = useState(20);
  const [ratios, setRatios] = useState<Ratios>(DEFAULT_RATIOS);
  const [yearShares, setYearShares] = useState<number[]>(equalShares(3));
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);

  const presetLabels: Record<keyof typeof PRESETS, string> = {
    nsfc: zh ? "国家自然科学基金（参考草案）" : "NSFC reference draft",
    provincial: zh ? "省部级项目（参考草案）" : "Provincial programme draft",
    postdoc: zh ? "博士后项目（参考草案）" : "Postdoctoral programme draft",
    university: zh ? "校级项目（参考草案）" : "University project draft",
    horizontal: zh ? "横向课题（参考草案）" : "Industry-sponsored draft",
    custom: zh ? "自定义项目" : "Custom project",
  };

  const categories = useMemo(() => [
    { key: "equipment", label: zh ? "设备费" : "Equipment", short: zh ? "设备" : "Equipment", color: "#6677c8" },
    { key: "materials", label: zh ? "材料费" : "Materials", short: zh ? "材料" : "Materials", color: "#9a64b2" },
    { key: "testing", label: zh ? "测试化验加工费" : "Testing & processing", short: zh ? "测试" : "Testing", color: "#c4548d" },
    { key: "travel", label: zh ? "差旅／会议／国际合作" : "Travel, meetings & collaboration", short: zh ? "差旅" : "Travel", color: "#bb762c" },
    { key: "publication", label: zh ? "出版／文献／知识产权" : "Publishing, literature & IP", short: zh ? "出版" : "Publishing", color: "#398b70" },
    { key: "labor", label: zh ? "劳务费" : "Labour", short: zh ? "劳务" : "Labour", color: "#397db2" },
    { key: "consulting", label: zh ? "专家咨询费" : "Expert consultation", short: zh ? "咨询" : "Consulting", color: "#4f948e" },
    { key: "other", label: zh ? "其他支出" : "Other", short: zh ? "其他" : "Other", color: "#7b7f88" },
  ], [zh]);

  const indirect = total * indirectShare / 100;
  const direct = Math.max(0, total - indirect);
  const categoryAmounts = categories.map((category) => ({
    ...category,
    ratio: ratios[category.key] ?? 0,
    amount: direct * (ratios[category.key] ?? 0) / 100,
  }));
  const yearAmounts = yearShares.map((share) => direct * share / 100);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("primercat-fund-plans") || "[]") as SavedPlan[];
      setSavedPlans(stored.slice(0, 8));
      const encoded = new URLSearchParams(window.location.search).get("plan");
      if (encoded) {
        const shared = decodePlan(encoded);
        if (shared.preset && shared.preset in PRESETS) setPreset(shared.preset as keyof typeof PRESETS);
        if (typeof shared.projectName === "string") setProjectName(shared.projectName);
        if (typeof shared.total === "number") setTotal(shared.total);
        if (typeof shared.duration === "number") setDuration(shared.duration);
        if (typeof shared.indirectShare === "number") setIndirectShare(shared.indirectShare);
        if (shared.ratios) setRatios(shared.ratios);
        if (shared.yearShares?.length) setYearShares(shared.yearShares);
      }
    } catch {
      toast(zh ? "分享方案无法读取，已载入默认草案" : "Could not read the shared plan; loaded defaults", "info");
    }
  }, [toast, zh]);

  function selectPreset(value: keyof typeof PRESETS) {
    const config = PRESETS[value];
    setPreset(value);
    setTotal(config.total);
    setDuration(config.duration);
    setIndirectShare(config.indirectShare);
    setRatios(DEFAULT_RATIOS);
    setYearShares(equalShares(config.duration));
  }

  function updateDuration(value: number) {
    const next = Math.max(1, Math.min(8, value));
    setDuration(next);
    setYearShares(equalShares(next));
  }

  function currentPlan(): SavedPlan {
    return {
      id: `${Date.now()}`,
      savedAt: Date.now(),
      preset,
      projectName,
      total,
      duration,
      indirectShare,
      ratios,
      yearShares,
    };
  }

  function savePlan() {
    const next = [currentPlan(), ...savedPlans].slice(0, 8);
    setSavedPlans(next);
    localStorage.setItem("primercat-fund-plans", JSON.stringify(next));
    toast(zh ? "预算草案已保存在当前浏览器" : "Budget draft saved in this browser");
  }

  function loadPlan(plan: SavedPlan) {
    setPreset(plan.preset as keyof typeof PRESETS);
    setProjectName(plan.projectName);
    setTotal(plan.total);
    setDuration(plan.duration);
    setIndirectShare(plan.indirectShare);
    setRatios(plan.ratios);
    setYearShares(plan.yearShares);
    toast(zh ? "已载入预算草案" : "Budget draft loaded");
  }

  function deletePlan(id: string) {
    const next = savedPlans.filter((plan) => plan.id !== id);
    setSavedPlans(next);
    localStorage.setItem("primercat-fund-plans", JSON.stringify(next));
  }

  function exportCsv() {
    const rows = [
      [zh ? "科研经费预算草案" : "Research budget draft"],
      [zh ? "项目名称" : "Project", projectName || presetLabels[preset]],
      [zh ? "总经费（万元）" : "Total (CNY 10k)", total.toFixed(2)],
      [zh ? "直接费用（万元）" : "Direct cost (CNY 10k)", direct.toFixed(2)],
      [zh ? "间接费用（万元）" : "Indirect cost (CNY 10k)", indirect.toFixed(2)],
      [],
      [zh ? "直接费用明细" : "Direct-cost detail", zh ? "比例" : "Share", zh ? "金额（万元）" : "Amount (CNY 10k)"],
      ...categoryAmounts.map((item) => [item.label, `${item.ratio.toFixed(1)}%`, item.amount.toFixed(2)]),
      [],
      [zh ? "年度计划" : "Annual schedule", zh ? "比例" : "Share", zh ? "直接费用（万元）" : "Direct cost (CNY 10k)"],
      ...yearAmounts.map((amount, index) => [zh ? `第 ${index + 1} 年` : `Year ${index + 1}`, `${yearShares[index].toFixed(1)}%`, amount.toFixed(2)]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")}`;
    downloadText(csv, `${zh ? "科研经费预算" : "research-budget"}_${projectName || preset}.csv`, "text/csv;charset=utf-8");
    toast(zh ? "CSV 已导出" : "CSV exported");
  }

  function exportWord() {
    const title = projectName || presetLabels[preset];
    const yearHeaders = yearShares.map((_, index) => `<th>${zh ? `第 ${index + 1} 年` : `Year ${index + 1}`}</th>`).join("");
    const detailRows = categoryAmounts.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${item.ratio.toFixed(1)}%</td><td>${item.amount.toFixed(2)}</td></tr>`).join("");
    const annualRows = categoryAmounts.map((item) => `<tr><td>${escapeHtml(item.label)}</td>${yearShares.map((share) => `<td>${(item.amount * share / 100).toFixed(2)}</td>`).join("")}<td>${item.amount.toFixed(2)}</td></tr>`).join("");
    const document = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;color:#222;line-height:1.5}h1{font-size:24px}h2{margin-top:28px;font-size:17px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{padding:7px 9px;border:1px solid #bbb;text-align:right;font-size:11px}th:first-child,td:first-child{text-align:left}.note{margin-top:24px;color:#666;font-size:10px}</style></head><body><h1>${zh ? "科研经费预算草案" : "Research budget draft"}</h1><p><strong>${zh ? "项目" : "Project"}：</strong>${escapeHtml(title)}</p><p><strong>${zh ? "总经费" : "Total"}：</strong>${total.toFixed(2)} ${zh ? "万元" : "CNY 10k"}　<strong>${zh ? "执行年限" : "Duration"}：</strong>${duration} ${zh ? "年" : duration === 1 ? "year" : "years"}</p><p><strong>${zh ? "直接费用" : "Direct"}：</strong>${direct.toFixed(2)}　<strong>${zh ? "间接费用" : "Indirect"}：</strong>${indirect.toFixed(2)}</p><h2>${zh ? "直接费用明细" : "Direct-cost detail"}</h2><table><thead><tr><th>${zh ? "科目" : "Item"}</th><th>${zh ? "比例" : "Share"}</th><th>${zh ? "金额（万元）" : "Amount (CNY 10k)"}</th></tr></thead><tbody>${detailRows}</tbody></table><h2>${zh ? "年度直接费用计划" : "Annual direct-cost schedule"}</h2><table><thead><tr><th>${zh ? "科目" : "Item"}</th>${yearHeaders}<th>${zh ? "合计" : "Total"}</th></tr></thead><tbody>${annualRows}</tbody><tfoot><tr><th>${zh ? "直接费用" : "Direct"}</th>${yearAmounts.map((amount) => `<th>${amount.toFixed(2)}</th>`).join("")}<th>${direct.toFixed(2)}</th></tr></tfoot></table><p class="note">${zh ? "本文件仅为预算草案，请以当年项目指南和依托单位财务规定为准。" : "This file is a budget draft. Follow the current call and host-institution finance rules."}</p></body></html>`;
    downloadText(`\uFEFF${document}`, `${zh ? "科研经费预算" : "research-budget"}_${projectName || preset}.doc`, "application/msword;charset=utf-8");
    toast(zh ? "Word 已导出" : "Word exported");
  }

  async function copySummary() {
    const lines = [
      `${zh ? "科研经费预算草案" : "Research budget draft"} · ${projectName || presetLabels[preset]}`,
      `${zh ? "总经费" : "Total"}: ${total.toFixed(2)} ${zh ? "万元" : "CNY 10k"}`,
      `${zh ? "直接费用" : "Direct"}: ${direct.toFixed(2)} · ${zh ? "间接费用" : "Indirect"}: ${indirect.toFixed(2)}`,
      ...categoryAmounts.map((item) => `${item.label}: ${item.amount.toFixed(2)} (${item.ratio.toFixed(1)}%)`),
      zh ? "仅供预算草案参考，请以当年指南和依托单位财务规定为准。" : "Draft only. Follow the current call and host-institution rules.",
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    toast(zh ? "预算摘要已复制" : "Budget summary copied");
  }

  async function copyShareLink() {
    const payload = { ...currentPlan(), id: undefined, savedAt: undefined };
    const encoded = encodePlan(payload);
    const url = `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
    await navigator.clipboard.writeText(url);
    toast(zh ? "分享链接已复制" : "Share link copied");
  }

  return (
    <div className="fund-calc-v1">
      <section className="fund-calc-hero">
        <div>
          <span className="fund-calc-kicker">PRIMERCAT · FUND PLANNER</span>
          <h1>{zh ? "科研经费分配助手" : "Research fund planner"}</h1>
          <p>{zh ? "把经费草案拆成直接费用、间接费用、内部明细和年度计划。所有计算仅在浏览器中完成。" : "Turn a funding draft into direct costs, indirect costs, internal line items, and an annual schedule. Calculations stay in your browser."}</p>
        </div>
        <aside>
          <span>{zh ? "当前草案" : "Current draft"}</span>
          <strong>{total.toFixed(1)}<small>{zh ? " 万元" : " × CNY 10k"}</small></strong>
          <p>{duration} {zh ? "年" : duration === 1 ? "year" : "years"} · {zh ? "直接费用" : "direct"} {direct.toFixed(1)} · {zh ? "间接费用" : "indirect"} {indirect.toFixed(1)}</p>
        </aside>
      </section>

      <div className="fund-calc-workspace">
        <aside className="fund-calc-controls">
          <header><span>01</span><div><h2>{zh ? "项目参数" : "Project setup"}</h2><p>{zh ? "预设只用于初始化草案" : "Presets only initialise a draft"}</p></div></header>
          <label>
            <span>{zh ? "项目模板" : "Project template"}</span>
            <select value={preset} onChange={(event) => selectPreset(event.target.value as keyof typeof PRESETS)}>
              {Object.entries(presetLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>{zh ? "项目名称（选填）" : "Project name (optional)"}</span>
            <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder={zh ? "例如：代谢重编程机制研究" : "e.g. Metabolic reprogramming study"} />
          </label>
          <div className="fund-calc-control-grid">
            <label><span>{zh ? "总经费（万元）" : "Total (CNY 10k)"}</span><input type="number" min="0.1" step="0.1" value={total} onChange={(event) => setTotal(Math.max(.1, Number(event.target.value) || 0))} /></label>
            <label><span>{zh ? "执行年限" : "Duration"}</span><input type="number" min="1" max="8" value={duration} onChange={(event) => updateDuration(Number(event.target.value))} /></label>
          </div>
          <label>
            <span>{zh ? "间接费用占总经费（草案）" : "Indirect share of total (draft)"}<b>{indirectShare.toFixed(0)}%</b></span>
            <input type="range" min="0" max="40" step="1" value={indirectShare} onChange={(event) => setIndirectShare(Number(event.target.value))} />
          </label>
          <div className="fund-calc-control-note">
            <strong>{zh ? "口径提示" : "Basis note"}</strong>
            <p>{zh ? "这里按“总经费中的预计占比”做内部草案，不等同于政策规定的间接费用核定公式。" : "This is an internal share-of-total draft, not the regulatory formula for indirect-cost approval."}</p>
          </div>
        </aside>

        <div className="fund-calc-results">
          <section className="fund-calc-summary" aria-label={zh ? "预算摘要" : "Budget summary"}>
            <div><span>{zh ? "总经费" : "Total"}</span><strong>{total.toFixed(2)}</strong><small>{zh ? "万元" : "CNY 10k"}</small></div>
            <div className="is-accent"><span>{zh ? "直接费用" : "Direct"}</span><strong>{direct.toFixed(2)}</strong><small>{(100 - indirectShare).toFixed(0)}%</small></div>
            <div><span>{zh ? "间接费用" : "Indirect"}</span><strong>{indirect.toFixed(2)}</strong><small>{indirectShare.toFixed(0)}%</small></div>
            <div><span>{zh ? "年均直接费用" : "Direct / year"}</span><strong>{(direct / duration).toFixed(2)}</strong><small>{zh ? "万元" : "CNY 10k"}</small></div>
          </section>

          <section className="fund-calc-section">
            <header className="fund-calc-section-head"><div><span>02</span><h2>{zh ? "直接费用内部明细" : "Direct-cost detail"}</h2></div><button type="button" onClick={() => setRatios(DEFAULT_RATIOS)}>{zh ? "恢复参考比例" : "Reset shares"}</button></header>
            <div className="fund-calc-segments" aria-hidden="true">
              {categoryAmounts.map((item) => <i key={item.key} style={{ width: `${item.ratio}%`, background: item.color }} />)}
            </div>
            <div className="fund-calc-allocation-list">
              {categoryAmounts.map((item) => (
                <div className="fund-calc-allocation" key={item.key}>
                  <span className="fund-calc-allocation-label"><i style={{ background: item.color }} />{item.label}</span>
                  <input aria-label={`${item.label} ${zh ? "比例" : "share"}`} type="range" min="0" max="70" step="1" value={item.ratio} onChange={(event) => setRatios((current) => rebalance(current, item.key, Number(event.target.value)))} />
                  <strong>{item.amount.toFixed(2)}</strong>
                  <small>{item.ratio.toFixed(1)}%</small>
                </div>
              ))}
            </div>
          </section>

          <section className="fund-calc-section">
            <header className="fund-calc-section-head"><div><span>03</span><h2>{zh ? "年度直接费用计划" : "Annual direct-cost schedule"}</h2></div><button type="button" onClick={() => setYearShares(equalShares(duration))}>{zh ? "平均分配" : "Distribute evenly"}</button></header>
            <div className="fund-calc-year-list">
              {yearShares.map((share, index) => (
                <div key={index}>
                  <span>{zh ? `第 ${index + 1} 年` : `Year ${index + 1}`}</span>
                  <input aria-label={zh ? `第 ${index + 1} 年比例` : `Year ${index + 1} share`} type="range" min="0" max="100" step="1" value={share} onChange={(event) => setYearShares((current) => rebalanceYears(current, index, Number(event.target.value)))} />
                  <strong>{yearAmounts[index].toFixed(2)}</strong><small>{share.toFixed(1)}%</small>
                </div>
              ))}
            </div>
            <div className="fund-calc-year-table-wrap">
              <table>
                <thead><tr><th>{zh ? "科目" : "Item"}</th>{yearShares.map((_, index) => <th key={index}>{zh ? `第${index + 1}年` : `Y${index + 1}`}</th>)}<th>{zh ? "合计" : "Total"}</th></tr></thead>
                <tbody>{categoryAmounts.map((item) => <tr key={item.key}><th>{item.short}</th>{yearShares.map((share, index) => <td key={index}>{(item.amount * share / 100).toFixed(2)}</td>)}<td>{item.amount.toFixed(2)}</td></tr>)}</tbody>
                <tfoot><tr><th>{zh ? "直接费用" : "Direct"}</th>{yearAmounts.map((amount, index) => <td key={index}>{amount.toFixed(2)}</td>)}<td>{direct.toFixed(2)}</td></tr></tfoot>
              </table>
            </div>
          </section>

          <section className="fund-calc-policy">
            <div><span>04</span><h2>{zh ? "使用边界" : "Usage boundary"}</h2></div>
            <ul>
              <li>{zh ? "项目模板、比例和额度均为预算草案起点，不代表当年度官方资助标准。" : "Templates, shares, and amounts are draft starting points, not current official award standards."}</li>
              <li>{zh ? "预算制与包干制项目的编制要求不同，间接费用还受设备购置费和依托单位制度影响。" : "Budget-based and lump-sum projects follow different rules; equipment purchases and host-institution policies also affect indirect costs."}</li>
              <li>{zh ? "提交前请核对当年项目指南，并交由依托单位科研或财务部门复核。" : "Before submission, check the current call and ask your research or finance office to review the draft."}</li>
            </ul>
            <a href={OFFICIAL_POLICY_URL} target="_blank" rel="noopener noreferrer">{zh ? "查看国家自然科学基金项目资金管理办法" : "View the NSFC project-fund management rules"}<span aria-hidden="true">↗</span></a>
          </section>

          <section className="fund-calc-actions" aria-label={zh ? "预算操作" : "Budget actions"}>
            <button type="button" className="is-primary" onClick={savePlan}>{zh ? "保存草案" : "Save draft"}</button>
            <button type="button" onClick={exportCsv}>{zh ? "导出 CSV" : "Export CSV"}</button>
            <button type="button" onClick={exportWord}>{zh ? "导出 Word" : "Export Word"}</button>
            <button type="button" onClick={copySummary}>{zh ? "复制摘要" : "Copy summary"}</button>
            <button type="button" onClick={copyShareLink}>{zh ? "复制分享链接" : "Copy share link"}</button>
          </section>

          {savedPlans.length > 0 && (
            <section className="fund-calc-saved">
              <header><span>05</span><h2>{zh ? "当前浏览器中的草案" : "Drafts in this browser"}</h2></header>
              <div>{savedPlans.map((plan) => <article key={plan.id}><div><strong>{plan.projectName || presetLabels[plan.preset as keyof typeof PRESETS]}</strong><span>{plan.total.toFixed(1)} {zh ? "万元" : "× CNY 10k"} · {new Date(plan.savedAt).toLocaleDateString(locale)}</span></div><button type="button" onClick={() => loadPlan(plan)}>{zh ? "载入" : "Load"}</button><button type="button" onClick={() => deletePlan(plan.id)}>{zh ? "删除" : "Delete"}</button></article>)}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
