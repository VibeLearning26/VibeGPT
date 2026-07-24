"use client";

import { useState } from "react";
import { Check } from "reicon-react";

interface Rule {
  marks: number;
  name: string;
  minWords: number;
  maxWords: number;
  points: number;
  requireExample: boolean;
  requireConclusion: boolean;
  requireCitations: boolean;
  style: string;
}

const DEFAULT_RULES: Rule[] = [
  {
    marks: 2,
    name: "Quick answer",
    minWords: 35,
    maxWords: 60,
    points: 2,
    requireExample: false,
    requireConclusion: false,
    requireCitations: true,
    style: "concise",
  },
  {
    marks: 3,
    name: "Short answer",
    minWords: 60,
    maxWords: 100,
    points: 3,
    requireExample: false,
    requireConclusion: false,
    requireCitations: true,
    style: "concise",
  },
  {
    marks: 5,
    name: "Standard answer",
    minWords: 120,
    maxWords: 180,
    points: 4,
    requireExample: false,
    requireConclusion: false,
    requireCitations: true,
    style: "academic",
  },
  {
    marks: 8,
    name: "Extended answer",
    minWords: 200,
    maxWords: 280,
    points: 5,
    requireExample: true,
    requireConclusion: true,
    requireCitations: true,
    style: "detailed_academic",
  },
  {
    marks: 10,
    name: "Detailed answer",
    minWords: 250,
    maxWords: 350,
    points: 6,
    requireExample: true,
    requireConclusion: true,
    requireCitations: true,
    style: "detailed_academic",
  },
];

const STYLES = ["concise", "academic", "detailed_academic"];

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-panel-2 border border-line-soft"
    >
      <span className="text-[13px] text-muted">{label}</span>
      <span
        className="relative w-9 h-5 rounded-full transition-colors"
        style={{ background: on ? "#e50914" : "#2a2a2a" }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: on ? "18px" : "2px" }}
        />
      </span>
    </button>
  );
}

export default function AnswerRulesPage() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [active, setActive] = useState(2);
  const [savedTick, setSavedTick] = useState(false);

  const rule = rules[active];
  const update = (patch: Partial<Rule>) =>
    setRules((prev) => prev.map((r, i) => (i === active ? { ...r, ...patch } : r)));

  const save = () => {
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1800);
  };

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Answer format settings</h1>
        <p className="text-sm text-muted mt-1">
          Configure how answers are structured for each mark weight.
        </p>
      </div>

      {/* Mark tabs */}
      <div className="flex gap-2 mb-6">
        {rules.map((r, i) => (
          <button
            key={r.marks}
            onClick={() => setActive(i)}
            className={`chip !px-5 !py-2.5 ${active === i ? "active" : ""}`}
          >
            {r.marks} marks
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Config */}
        <div className="panel p-5 space-y-4">
          <div>
            <label className="field-label">Rule name</label>
            <input
              className="input"
              value={rule.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Min words</label>
              <input
                type="number"
                className="input"
                value={rule.minWords}
                onChange={(e) => update({ minWords: +e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Max words</label>
              <input
                type="number"
                className="input"
                value={rule.maxWords}
                onChange={(e) => update({ maxWords: +e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Key points</label>
            <input
              type="number"
              className="input"
              value={rule.points}
              onChange={(e) => update({ points: +e.target.value })}
            />
          </div>

          <div>
            <label className="field-label">Writing style</label>
            <select
              className="input cursor-pointer"
              value={rule.style}
              onChange={(e) => update({ style: e.target.value })}
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-1">
            <Toggle label="Require worked example" on={rule.requireExample} onChange={(v) => update({ requireExample: v })} />
            <Toggle label="Require conclusion" on={rule.requireConclusion} onChange={(v) => update({ requireConclusion: v })} />
            <Toggle label="Require citations" on={rule.requireCitations} onChange={(v) => update({ requireCitations: v })} />
          </div>

          <button onClick={save} className="btn-primary w-full mt-2 inline-flex items-center justify-center gap-1.5">
            {savedTick ? (
              <>
                <Check size={15} /> Saved
              </>
            ) : (
              "Save rule"
            )}
          </button>
        </div>

        {/* Preview */}
        <div className="panel p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-3">
            Structure preview
          </p>
          <div className="answer-card !bg-panel-2">
            <h3>{rule.marks}-mark {rule.name}</h3>
            <p className="text-sm text-muted">
              Target {rule.minWords}–{rule.maxWords} words · {rule.points} key points · {rule.style.replace("_", " ")} style
            </p>
            <ul className="mt-3">
              <li>Definition / introduction</li>
              <li>Explanation of the mechanism</li>
              <li>{rule.points} key points</li>
              {rule.requireExample && <li>Worked example</li>}
              {rule.requireConclusion && <li>Conclusion</li>}
              {rule.requireCitations && <li>Source citations (S1, S2, …)</li>}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {rule.requireCitations && <span className="badge badge-red">Cited</span>}
            {rule.requireExample && <span className="badge badge-neutral">Example</span>}
            {rule.requireConclusion && <span className="badge badge-neutral">Conclusion</span>}
            <span className="badge badge-neutral">{rule.style.replace("_", " ")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
