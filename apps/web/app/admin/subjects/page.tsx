"use client";

import { useState } from "react";
import { SUBJECTS, SEMESTER_OPTIONS, type Subject } from "@/lib/mockData";

const semLabel = (sem: string) => `Semester ${sem.replace("S", "")}`;

// Derive simple routing keywords from a subject name (lowercased words > 3 chars).
const keywordsFromName = (name: string) =>
  name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3);

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>(SUBJECTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newIcon, setNewIcon] = useState("📖");
  const [newSemester, setNewSemester] = useState(SEMESTER_OPTIONS[0]);
  const [savedTick, setSavedTick] = useState(false);

  const save = () => {
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1800);
  };

  const addSubject = () => {
    if (!newName.trim() || !newCode.trim()) return;
    const id = `sub-${Date.now()}`;
    setSubjects((prev) => [
      ...prev,
      {
        id,
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        icon: newIcon,
        semester: newSemester,
        keywords: keywordsFromName(newName),
        materials: 0,
        modules: [{ id: `${id}-1`, name: "Module 1", materials: 0 }],
      },
    ]);
    setNewName("");
    setNewCode("");
    setNewIcon("📖");
    setNewSemester(SEMESTER_OPTIONS[0]);
    setShowNew(false);
    save();
  };

  const addModule = (subjectId: string) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== subjectId) return s;
        const n = s.modules.length + 1;
        return {
          ...s,
          modules: [
            ...s.modules,
            { id: `${s.id}-${n}`, name: `Module ${n}`, materials: 0 },
          ],
        };
      }),
    );
  };

  const updateModule = (subjectId: string, moduleId: string, name: string) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              modules: s.modules.map((m) =>
                m.id === moduleId ? { ...m, name } : m,
              ),
            }
          : s,
      ),
    );
  };

  const removeModule = (subjectId: string, moduleId: string) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, modules: s.modules.filter((m) => m.id !== moduleId) }
          : s,
      ),
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manage subjects</h1>
          <p className="text-sm text-muted mt-1">
            Add, edit or remove subjects and their modules.
          </p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="btn-primary"
        >
          <span>＋</span> New subject
        </button>
      </div>

      {/* New subject form */}
      {showNew && (
        <div className="panel p-5 mb-6 fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-4">
            Create new subject
          </p>
          <div className="grid sm:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="field-label">Name</label>
              <input
                className="input"
                placeholder="e.g. Data Structures"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Code</label>
              <input
                className="input"
                placeholder="e.g. CS201"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Semester</label>
              <select
                className="input cursor-pointer"
                value={newSemester}
                onChange={(e) => setNewSemester(e.target.value)}
              >
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {semLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Icon (emoji)</label>
              <input
                className="input"
                placeholder="📖"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addSubject} className="btn-primary">
              Create
            </button>
            <button onClick={() => setShowNew(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subject list */}
      <div className="space-y-4">
        {subjects.map((s) => (
          <div key={s.id} className="card card-hover p-5 fade-up">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-panel-2 border border-line flex items-center justify-center text-xl">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold truncate">{s.name}</h2>
                  <span className="badge badge-neutral">{s.code}</span>
                  <span className="badge badge-red">{semLabel(s.semester)}</span>
                </div>
                <p className="text-xs text-faint mt-0.5">
                  {s.modules.length} modules · {s.materials} materials
                </p>
              </div>
              <button
                onClick={() =>
                  setEditingId(editingId === s.id ? null : s.id)
                }
                className="btn-ghost"
              >
                {editingId === s.id ? "Close" : "Edit"}
              </button>
            </div>

            {/* Modules list / editor */}
            {editingId === s.id && (
              <div className="space-y-2 fade-in">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-2">
                  Modules
                </p>
                {s.modules.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel-2 border border-line-soft"
                  >
                    <input
                      className="flex-1 bg-transparent text-[13px] text-muted outline-none"
                      value={m.name}
                      onChange={(e) => updateModule(s.id, m.id, e.target.value)}
                    />
                    <span className="text-[11px] text-faint whitespace-nowrap">
                      {m.materials} files
                    </span>
                    <button
                      onClick={() => removeModule(s.id, m.id)}
                      className="text-[11px] text-faint hover:text-err transition"
                      title="Remove module"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => addModule(s.id)}
                    className="btn-ghost"
                  >
                    ＋ Add module
                  </button>
                  <button onClick={save} className="btn-primary ml-auto">
                    {savedTick ? "✓ Saved" : "Save changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
