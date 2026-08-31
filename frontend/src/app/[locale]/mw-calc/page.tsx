"use client";

import { useState, useCallback, useRef } from "react";

// ── Periodic table (common elements) ──────────────────────────────
const ELEMENTS: Record<string, number> = {
  H:1.008,He:4.003,Li:6.941,Be:9.012,B:10.811,C:12.011,N:14.007,O:15.999,
  F:18.998,Ne:20.180,Na:22.990,Mg:24.305,Al:26.982,Si:28.086,P:30.974,S:32.065,
  Cl:35.453,Ar:39.948,K:39.098,Ca:40.078,Sc:44.956,Ti:47.867,V:50.942,Cr:51.996,
  Mn:54.938,Fe:55.845,Co:58.933,Ni:58.693,Cu:63.546,Zn:65.38,Ga:69.723,Ge:72.63,
  As:74.922,Se:78.96,Br:79.904,Kr:83.798,Rb:85.468,Sr:87.62,Y:88.906,Zr:91.224,
  Nb:92.906,Mo:95.96,Tc:98,Ru:101.07,Rh:102.906,Pd:106.42,Ag:107.868,Cd:112.411,
  In:114.818,Sn:118.71,Sb:121.760,Te:127.60,I:126.904,Xe:131.293,Cs:132.905,
  Ba:137.327,La:138.905,Ce:140.116,Pr:140.908,Nd:144.242,Pm:145,Sm:150.36,
  Eu:151.964,Gd:157.25,Tb:158.925,Dy:162.500,Ho:164.930,Er:167.259,Tm:168.934,
  Yb:173.054,Lu:174.967,Hf:178.49,Ta:180.948,W:183.84,Re:186.207,Os:190.23,
  Ir:192.217,Pt:195.084,Au:196.967,Hg:200.59,Tl:204.383,Pb:207.2,Bi:208.980,
  Po:209,At:210,Rn:222,Fr:223,Ra:226,Ac:227,Th:232.038,Pa:231.036,U:238.029,
};

// ── Formula parser ─────────────────────────────────────────────────
type ParseResult = { mw: number; composition: Record<string, number> } | { error: string };

function parseFormula(formula: string): ParseResult {
  const composition: Record<string, number> = {};

  function parse(s: string, multiplier: number): string | null {
    let i = 0;
    while (i < s.length) {
      if (s[i] === "(") {
        // find matching closing paren
        let depth = 1, j = i + 1;
        while (j < s.length && depth > 0) {
          if (s[j] === "(") depth++;
          else if (s[j] === ")") depth--;
          j++;
        }
        if (depth !== 0) return "Unmatched parenthesis";
        const inner = s.slice(i + 1, j - 1);
        // read trailing number
        let numStr = "";
        while (j < s.length && /\d/.test(s[j])) { numStr += s[j]; j++; }
        const n = numStr ? parseInt(numStr) : 1;
        const err = parse(inner, multiplier * n);
        if (err) return err;
        i = j;
      } else if (/[A-Z]/.test(s[i])) {
        // read element symbol
        let sym = s[i]; i++;
        while (i < s.length && /[a-z]/.test(s[i])) { sym += s[i]; i++; }
        if (!(sym in ELEMENTS)) return `Unknown element: ${sym}`;
        // read count
        let numStr = "";
        while (i < s.length && /\d/.test(s[i])) { numStr += s[i]; i++; }
        const count = numStr ? parseInt(numStr) : 1;
        composition[sym] = (composition[sym] || 0) + count * multiplier;
      } else if (/\d/.test(s[i])) {
        return `Unexpected number at position ${i}`;
      } else {
        return `Unexpected character: '${s[i]}'`;
      }
    }
    return null;
  }

  // strip spaces, handle · (hydrate dot) as +
  const normalized = formula.trim().replace(/\s/g, "").replace(/·/g, "+");
  // split by + for hydrates
  const parts = normalized.split("+");
  for (const part of parts) {
    // leading number coefficient e.g. 3H2O
    const m = part.match(/^(\d+)([A-Z(].*)$/);
    const coeff = m ? parseInt(m[1]) : 1;
    const sub = m ? m[2] : part;
    const err = parse(sub, coeff);
    if (err) return { error: err };
  }

  const mw = Object.entries(composition).reduce(
    (sum, [el, cnt]) => sum + ELEMENTS[el] * cnt, 0
  );
  return { mw: Math.round(mw * 1000) / 1000, composition };
}

// ── Preset compounds ───────────────────────────────────────────────
const PRESETS = [
  { label: "Glucose", formula: "C6H12O6" },
  { label: "NaCl", formula: "NaCl" },
  { label: "PBS", formula: "NaCl+KCl+Na2HPO4+KH2PO4" },
  { label: "DMSO", formula: "C2H6OS" },
  { label: "Ethanol", formula: "C2H5OH" },
  { label: "H₂O", formula: "H2O" },
  { label: "ATP", formula: "C10H16N5O13P3" },
  { label: "EDTA", formula: "C10H16N2O8" },
  { label: "Tris", formula: "C4H11NO3" },
  { label: "HEPES", formula: "C8H18N2O4S" },
];

// ── Styles ─────────────────────────────────────────────────────────
const S = {
  wrap: {
    maxWidth: 860,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "24px 28px",
    boxShadow: "var(--shadow-sm)",
  },
  label: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase" as const, color: "var(--text-3)", marginBottom: 6,
  },
  input: {
    width: "100%", padding: "10px 14px", fontSize: 15,
    fontFamily: "var(--font-mono)",
    background: "var(--bg-card)", border: "1px solid var(--border-mid)",
    borderRadius: 8, color: "var(--text-1)",
    outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
  },
  row: { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" as const },
  numInput: {
    flex: 1, minWidth: 100, padding: "10px 12px", fontSize: 14,
    background: "var(--bg-card)", border: "1px solid var(--border-mid)",
    borderRadius: 8, color: "var(--text-1)", outline: "none",
    fontFamily: "var(--font-mono)",
  },
  select: {
    padding: "10px 12px", fontSize: 14, borderRadius: 8,
    background: "var(--bg-card)", border: "1px solid var(--border-mid)",
    color: "var(--text-1)", cursor: "pointer", outline: "none",
  },
  result: {
    fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em",
    color: "var(--accent)", lineHeight: 1,
  },
  resultSub: { fontSize: 13, color: "var(--text-3)", marginTop: 4 },
  pill: {
    padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
    background: "var(--bg-inset)", border: "1px solid var(--border)",
    color: "var(--text-2)", cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 16,
  },
  divider: { height: 1, background: "var(--border)", margin: "16px 0" },
  error: { fontSize: 13, color: "var(--red)", marginTop: 6 },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
    background: "var(--accent-soft)", color: "var(--accent)",
  },
};

type Tab = "mw" | "solution" | "dilution";

export default function MwCalcPage({ params: { locale } }: { params: { locale: string } }) {
  const zh = locale === "zh";
  const [tab, setTab] = useState<Tab>("mw");

  // ── MW tab ──
  const [formula, setFormula] = useState("");
  const [mwResult, setMwResult] = useState<ParseResult | null>(null);
  const [history, setHistory] = useState<Array<{ formula: string; mw: number }>>([]);
  const formulaRef = useRef<HTMLInputElement>(null);

  const calculate = useCallback(() => {
    if (!formula.trim()) return;
    const r = parseFormula(formula);
    setMwResult(r);
    if ("mw" in r) {
      setHistory((h) => [{ formula, mw: r.mw }, ...h.slice(0, 9)]);
    }
  }, [formula]);

  // ── Solution tab ──
  const [solMw, setSolMw] = useState("");
  const [solMass, setSolMass] = useState("");
  const [solMassUnit, setSolMassUnit] = useState("mg");
  const [solVol, setSolVol] = useState("");
  const [solVolUnit, setSolVolUnit] = useState("mL");
  const [solConc, setSolConc] = useState("");
  const [solConcUnit, setSolConcUnit] = useState("mM");
  const [solMode, setSolMode] = useState<"conc"|"mass"|"vol">("conc");

  function calcSolution() {
    const mw = parseFloat(solMw);
    const massG = parseFloat(solMass) * ({ mg: 1e-3, g: 1, µg: 1e-6 }[solMassUnit] ?? 1);
    const volL = parseFloat(solVol) * ({ mL: 1e-3, L: 1, µL: 1e-6 }[solVolUnit] ?? 1);
    const concMol = parseFloat(solConc) * ({ mM: 1e-3, M: 1, µM: 1e-6, nM: 1e-9 }[solConcUnit] ?? 1);

    if (solMode === "conc" && !isNaN(mw) && !isNaN(massG) && !isNaN(volL) && volL > 0) {
      const mol = massG / mw;
      const concM = mol / volL;
      setSolConc(formatSI(concM, solConcUnit));
    } else if (solMode === "mass" && !isNaN(mw) && !isNaN(concMol) && !isNaN(volL)) {
      const g = concMol * volL * mw;
      setSolMass(formatSI(g, solMassUnit));
    } else if (solMode === "vol" && !isNaN(mw) && !isNaN(concMol) && !isNaN(massG)) {
      const l = massG / (concMol * mw);
      setSolVol(formatSI(l, solVolUnit));
    }
  }

  // ── Dilution tab ──
  const [dilC1, setDilC1] = useState("");
  const [dilV1, setDilV1] = useState("");
  const [dilC2, setDilC2] = useState("");
  const [dilV2, setDilV2] = useState("");
  const [dilUnit, setDilUnit] = useState("mM");
  const [dilVolUnit, setDilVolUnit] = useState("mL");
  const [dilMode, setDilMode] = useState<"v1"|"v2"|"c1"|"c2">("v2");

  function calcDilution() {
    const c1 = parseFloat(dilC1), v1 = parseFloat(dilV1);
    const c2 = parseFloat(dilC2), v2 = parseFloat(dilV2);
    if (dilMode === "v2" && !isNaN(c1) && !isNaN(v1) && !isNaN(c2) && c2 > 0)
      setDilV2(fmt4(c1 * v1 / c2));
    else if (dilMode === "v1" && !isNaN(c1) && !isNaN(c2) && !isNaN(v2) && c1 > 0)
      setDilV1(fmt4(c2 * v2 / c1));
    else if (dilMode === "c2" && !isNaN(c1) && !isNaN(v1) && !isNaN(v2) && v2 > 0)
      setDilC2(fmt4(c1 * v1 / v2));
    else if (dilMode === "c1" && !isNaN(c2) && !isNaN(v1) && !isNaN(v2) && v1 > 0)
      setDilC1(fmt4(c2 * v2 / v1));
  }

  // Fill MW from result
  function fillMwToSolution() {
    if (mwResult && "mw" in mwResult) setSolMw(String(mwResult.mw));
    setTab("solution");
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "mw",       label: zh ? "分子量" : "Molecular Weight" },
    { id: "solution", label: zh ? "溶液配制" : "Solution Prep" },
    { id: "dilution", label: zh ? "稀释计算" : "Dilution" },
  ];

  return (
    <div className="mw-workbench-v6" style={S.wrap}>
      {/* Header */}
      <header className="mw-hero-v6">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={S.badge}>{zh ? "实验室计算" : "Laboratory calculation"}</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-1)", margin: "0 0 6px" }}>
          {zh ? "分子量计算器" : "Molecular Weight Calculator"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", margin: 0 }}>
          {zh
            ? "解析化学式并计算摩尔质量、溶液浓度与稀释参数。"
            : "Parse chemical formulas and calculate molar mass, solution concentration, and dilution parameters."}
        </p>
      </header>

      {/* Tab bar */}
      <div className="mw-tabs-v6" style={{ display: "flex", gap: 4, background: "var(--bg-inset)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "7px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer",
              background: tab === t.id ? "var(--bg-card)" : "transparent",
              color: tab === t.id ? "var(--text-1)" : "var(--text-2)",
              boxShadow: tab === t.id ? "var(--shadow-xs)" : "none",
              transition: "all 0.15s",
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Tab: MW ── */}
      {tab === "mw" && (
        <>
          <section className="mw-work-surface mw-formula-surface" style={S.card}>
            <div style={S.sectionTitle}>
              {zh ? "输入化学式" : "Enter Chemical Formula"}
            </div>

            {/* Presets */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {PRESETS.map((p) => (
                <button key={p.label} style={S.pill}
                  onClick={() => { setFormula(p.formula); setMwResult(parseFormula(p.formula)); }}>
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input
                ref={formulaRef}
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && calculate()}
                placeholder={zh ? "如 C6H12O6、NaCl、Ca(OH)2·2H2O" : "e.g. C6H12O6, NaCl, Ca(OH)2·2H2O"}
                style={{ ...S.input, flex: 1 }}
              />
              <button
                onClick={calculate}
                style={{
                  padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 700,
                  background: "linear-gradient(135deg,#A31F34,#7c1128)", color: "#fff",
                  border: "none", cursor: "pointer", whiteSpace: "nowrap",
                  boxShadow: "0 4px 14px rgba(163,31,52,0.3)",
                }}
              >{zh ? "计算" : "Calculate"}</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>
              {zh
                ? "支持括号 (Ca(OH)2)、水合物 (CuSO4·5H2O)、前置系数 (3H2O)"
                : "Supports parentheses (Ca(OH)2), hydrates (CuSO4·5H2O), coefficients (3H2O)"}
            </p>

            {mwResult && "error" in mwResult && (
              <p style={S.error}>⚠ {mwResult.error}</p>
            )}
          </section>

          {/* Result */}
          {mwResult && "mw" in mwResult && (
            <section className="mw-work-surface mw-result-surface" style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={S.label}>{zh ? "摩尔质量" : "Molar Mass"}</div>
                  <div style={S.result}>{mwResult.mw.toFixed(3)}</div>
                  <div style={S.resultSub}>g/mol</div>
                </div>
                <button
                  onClick={fillMwToSolution}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: "var(--accent-soft)", color: "var(--accent)",
                    border: "1px solid var(--accent)", cursor: "pointer",
                  }}
                >
                  {zh ? "用于溶液计算 →" : "Use in Solution Prep →"}
                </button>
              </div>

              <div style={S.divider} />

              {/* Elemental composition */}
              <div style={S.label}>{zh ? "元素组成" : "Elemental Composition"}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {Object.entries(mwResult.composition).map(([el, cnt]) => {
                  const mass = ELEMENTS[el] * cnt;
                  const pct = ((mass / mwResult.mw) * 100).toFixed(1);
                  return (
                    <div key={el} style={{
                      padding: "8px 14px", borderRadius: 10,
                      background: "var(--bg-inset)", border: "1px solid var(--border)",
                      minWidth: 80, textAlign: "center",
                    }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)" }}>{el}</div>
                      <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>×{cnt}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>

              <div style={S.divider} />

              {/* Conversions */}
              <div style={S.label}>{zh ? "常用换算" : "Quick Conversions"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginTop: 8 }}>
                {[
                  { label: zh ? "1 g 对应摩尔数" : "Moles in 1 g",          value: `${(1 / mwResult.mw).toExponential(3)} mol` },
                  { label: zh ? "1 mol 质量" : "Mass of 1 mol",              value: `${mwResult.mw.toFixed(3)} g` },
                  { label: zh ? "1 mg/mL 浓度" : "Conc. at 1 mg/mL",        value: `${((1 / mwResult.mw) * 1000).toFixed(3)} mM` },
                  { label: zh ? "1 mM 溶于 1 mL 需质量" : "Mass for 1 mM/mL", value: `${(mwResult.mw / 1000).toFixed(4)} mg` },
                ].map((item) => (
                  <div key={item.label} style={{
                    padding: "10px 14px", borderRadius: 10,
                    background: "var(--bg-inset)", border: "1px solid var(--border)",
                  }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* History */}
          {history.length > 0 && (
            <section className="mw-work-surface mw-history-surface" style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={S.sectionTitle}>{zh ? "计算历史" : "History"}</div>
                <button onClick={() => setHistory([])} style={{ fontSize: 12, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer" }}>
                  {zh ? "清除" : "Clear"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {history.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => { setFormula(h.formula); setMwResult({ mw: h.mw, composition: {} }); }}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                      background: i === 0 ? "var(--accent-soft)" : "var(--bg-inset)",
                      border: `1px solid ${i === 0 ? "var(--accent)" : "var(--border)"}`,
                      transition: "background 0.15s",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-1)" }}>{h.formula}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)" }}>{h.mw} g/mol</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Tab: Solution ── */}
      {tab === "solution" && (
        <section className="mw-work-surface mw-solution-surface" style={S.card}>
          <div style={S.sectionTitle}>{zh ? "溶液配制计算 (C = n/V = m / (MW·V))" : "Solution Preparation (C = m / (MW · V))"}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* MW input */}
            <div>
              <div style={S.label}>{zh ? "分子量 (g/mol)" : "Molecular Weight (g/mol)"}</div>
              <input value={solMw} onChange={(e) => setSolMw(e.target.value)}
                placeholder="e.g. 180.156" style={{ ...S.numInput, width: "100%", boxSizing: "border-box" }} />
            </div>

            {/* Solve for selector */}
            <div>
              <div style={S.label}>{zh ? "求解目标" : "Solve for"}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {([["conc", zh ? "浓度" : "Conc."], ["mass", zh ? "质量" : "Mass"], ["vol", zh ? "体积" : "Volume"]] as [typeof solMode, string][]).map(([id, lbl]) => (
                  <button key={id} onClick={() => setSolMode(id)} style={{
                    padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: "1px solid", cursor: "pointer",
                    background: solMode === id ? "var(--accent)" : "var(--bg-inset)",
                    color: solMode === id ? "#fff" : "var(--text-2)",
                    borderColor: solMode === id ? "var(--accent)" : "var(--border)",
                  }}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* Mass */}
            <div>
              <div style={S.label}>{zh ? "质量" : "Mass"} {solMode === "mass" && <span style={{ color: "var(--accent)" }}>← {zh ? "计算结果" : "result"}</span>}</div>
              <div style={S.row}>
                <input value={solMass} onChange={(e) => setSolMass(e.target.value)}
                  readOnly={solMode === "mass"}
                  placeholder={solMode === "mass" ? (zh ? "自动计算" : "auto") : "e.g. 36"}
                  style={{ ...S.numInput, background: solMode === "mass" ? "var(--bg-inset)" : undefined }} />
                <select value={solMassUnit} onChange={(e) => setSolMassUnit(e.target.value)} style={S.select}>
                  <option>µg</option><option>mg</option><option>g</option>
                </select>
              </div>
            </div>

            {/* Volume */}
            <div>
              <div style={S.label}>{zh ? "体积" : "Volume"} {solMode === "vol" && <span style={{ color: "var(--accent)" }}>← {zh ? "计算结果" : "result"}</span>}</div>
              <div style={S.row}>
                <input value={solVol} onChange={(e) => setSolVol(e.target.value)}
                  readOnly={solMode === "vol"}
                  placeholder={solMode === "vol" ? (zh ? "自动计算" : "auto") : "e.g. 10"}
                  style={{ ...S.numInput, background: solMode === "vol" ? "var(--bg-inset)" : undefined }} />
                <select value={solVolUnit} onChange={(e) => setSolVolUnit(e.target.value)} style={S.select}>
                  <option>µL</option><option>mL</option><option>L</option>
                </select>
              </div>
            </div>

            {/* Concentration */}
            <div>
              <div style={S.label}>{zh ? "浓度" : "Concentration"} {solMode === "conc" && <span style={{ color: "var(--accent)" }}>← {zh ? "计算结果" : "result"}</span>}</div>
              <div style={S.row}>
                <input value={solConc} onChange={(e) => setSolConc(e.target.value)}
                  readOnly={solMode === "conc"}
                  placeholder={solMode === "conc" ? (zh ? "自动计算" : "auto") : "e.g. 10"}
                  style={{ ...S.numInput, background: solMode === "conc" ? "var(--bg-inset)" : undefined }} />
                <select value={solConcUnit} onChange={(e) => setSolConcUnit(e.target.value)} style={S.select}>
                  <option>nM</option><option>µM</option><option>mM</option><option>M</option>
                </select>
              </div>
            </div>

            <button onClick={calcSolution} style={{
              padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: "linear-gradient(135deg,#A31F34,#7c1128)", color: "#fff",
              border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(163,31,52,0.3)",
            }}>{zh ? "计算" : "Calculate"}</button>
          </div>
        </section>
      )}

      {/* ── Tab: Dilution ── */}
      {tab === "dilution" && (
        <section className="mw-work-surface mw-dilution-surface" style={S.card}>
          <div style={S.sectionTitle}>{zh ? "稀释计算 (C₁V₁ = C₂V₂)" : "Dilution Calculator (C₁V₁ = C₂V₂)"}</div>

          <div style={{ marginBottom: 14 }}>
            <div style={S.label}>{zh ? "求解目标" : "Solve for"}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([["c1","C₁"],["v1","V₁"],["c2","C₂"],["v2","V₂"]] as [typeof dilMode, string][]).map(([id, lbl]) => (
                <button key={id} onClick={() => setDilMode(id)} style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: "1px solid", cursor: "pointer",
                  background: dilMode === id ? "var(--accent)" : "var(--bg-inset)",
                  color: dilMode === id ? "#fff" : "var(--text-2)",
                  borderColor: dilMode === id ? "var(--accent)" : "var(--border)",
                }}>{lbl}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { id: "c1" as const, label: zh ? "原始浓度 C₁" : "Stock Conc. C₁", val: dilC1, set: setDilC1 },
              { id: "v1" as const, label: zh ? "取用体积 V₁" : "Transfer Vol. V₁", val: dilV1, set: setDilV1 },
              { id: "c2" as const, label: zh ? "目标浓度 C₂" : "Final Conc. C₂",  val: dilC2, set: setDilC2 },
              { id: "v2" as const, label: zh ? "最终体积 V₂" : "Final Volume V₂", val: dilV2, set: setDilV2 },
            ].map((f) => (
              <div key={f.id}>
                <div style={S.label}>
                  {f.label} {dilMode === f.id && <span style={{ color: "var(--accent)" }}>← {zh ? "结果" : "result"}</span>}
                </div>
                <div style={S.row}>
                  <input value={f.val} onChange={(e) => f.set(e.target.value)}
                    readOnly={dilMode === f.id}
                    placeholder={dilMode === f.id ? (zh ? "自动计算" : "auto") : ""}
                    style={{ ...S.numInput, background: dilMode === f.id ? "var(--bg-inset)" : undefined }} />
                  <select
                    value={f.id.startsWith("c") ? dilUnit : dilVolUnit}
                    onChange={(e) => f.id.startsWith("c") ? setDilUnit(e.target.value) : setDilVolUnit(e.target.value)}
                    style={S.select}
                  >
                    {f.id.startsWith("c")
                      ? <><option>nM</option><option>µM</option><option>mM</option><option>M</option></>
                      : <><option>µL</option><option>mL</option><option>L</option></>}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button onClick={calcDilution} style={{
            marginTop: 20, width: "100%", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: "linear-gradient(135deg,#A31F34,#7c1128)", color: "#fff",
            border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(163,31,52,0.3)",
          }}>{zh ? "计算" : "Calculate"}</button>

          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 12 }}>
            {zh
              ? "稀释剂体积 = V₂ − V₁"
              : "Volume of diluent to add = V₂ − V₁"}
            {dilV1 && dilV2 && !isNaN(parseFloat(dilV1)) && !isNaN(parseFloat(dilV2)) && (
              <strong style={{ color: "var(--text-1)", marginLeft: 8 }}>
                = {fmt4(parseFloat(dilV2) - parseFloat(dilV1))} {dilVolUnit}
              </strong>
            )}
          </p>
        </section>
      )}

      {/* Reference table */}
      <section className="mw-work-surface mw-reference-surface" style={S.card}>
        <div style={S.sectionTitle}>{zh ? "常用元素原子量参考" : "Common Atomic Weights Reference"}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["H","C","N","O","P","S","Na","K","Ca","Mg","Cl","F","Fe","Zn","Cu","I","Br"].map((el) => (
            <div key={el} style={{
              padding: "5px 10px", borderRadius: 8, fontSize: 12,
              background: "var(--bg-inset)", border: "1px solid var(--border)",
              display: "flex", gap: 6, alignItems: "center",
            }}>
              <span style={{ fontWeight: 800, color: "var(--text-1)" }}>{el}</span>
              <span style={{ color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{ELEMENTS[el]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────
function fmt4(n: number): string {
  return parseFloat(n.toPrecision(4)).toString();
}

function formatSI(value: number, unit: string): string {
  // convert to the displayed unit
  const factors: Record<string, number> = {
    µg: 1e6, mg: 1e3, g: 1,
    µL: 1e6, mL: 1e3, L: 1,
    nM: 1e9, µM: 1e6, mM: 1e3, M: 1,
  };
  return fmt4(value * (factors[unit] ?? 1));
}
