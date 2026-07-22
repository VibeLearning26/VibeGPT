"use client";

import { useEffect, useState } from "react";
import { DEPARTMENTS, SEMESTER_OPTIONS, SUBJECTS, type Subject } from "@/lib/mockData";
import { readDemoSubjects, writeDemoSubjects } from "@/lib/demoAcademic";

const semLabel = (sem: string) => `Semester ${sem.replace("S", "")}`;

// Derive simple routing keywords from a subject name (lowercased words > 3 chars).
const keywordsFromName = (name: string) =>
  name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3);

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [semesters, setSemesters] = useState<ApiSemester[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newIcon, setNewIcon] = useState("📖");
  const [newSemester, setNewSemester] = useState(SEMESTER_OPTIONS[0]);
  const [newDepartment, setNewDepartment] = useState<string>(DEPARTMENTS[0].code);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSubjects(readDemoSubjects()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const save = () => {
    writeDemoSubjects(subjects);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1800);
  };

  const addSubject = () => {
    if (!newName.trim() || !newCode.trim()) return;
    const id = `sub-${Date.now()}`;
    setSubjects((prev) => {
      const next = [...prev, {
        id,
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        icon: newIcon,
        semester: newSemester,
        department: newDepartment,
        keywords: keywordsFromName(newName),
        materials: 0,
        modules: [{ id: `${id}-1`, name: "Module 1", materials: 0 }],
      }];
      writeDemoSubjects(next);
      return next;
    });
    setNewName("");
    setNewCode("");
    setNewIcon("📖");
    setNewSemester(SEMESTER_OPTIONS[0]);
    setNewDepartment(DEPARTMENTS[0].code);
    setShowNew(false);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1800);
  };

  const archiveSubject = async (subject: ApiSubject) => {
    if (!window.confirm(`Archive ${subject.code} - ${subject.name}?`)) return;
    try {
      await adminApi.archiveSubject(subject.id);
      setSubjects((current) => current.filter((item) => item.id !== subject.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive subject");
    }
  };

  const toggleModules = async (subjectId: string) => {
    if (editingId === subjectId) {
      setEditingId(null);
      return;
    }
    setEditingId(subjectId);
    try {
      setModules(await adminApi.listModules(subjectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load modules");
    }
  };

  const addModule = async (subjectId: string) => {
    const number = modules.length + 1;
    try {
      const created = await adminApi.createModule({
        name: `Module ${number}`,
        number,
        subject_id: subjectId,
      });
      setModules((current) => [...current, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add module");
    }
  };

  const updateSubject = (subjectId: string, field: "department" | "semester", value: string) => {
    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === subjectId ? { ...subject, [field]: value } : subject,
      ),
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manage subjects</h1>
          <p className="text-sm text-muted mt-1">Assign every subject to its department and semester.</p>
        </div>
        <button onClick={() => setShowNew((value) => !value)} className="btn-primary">
          + New subject
        </button>
      </div>

      {showNew && (
        <section className="panel p-5 mb-6 fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-4">
            Create new subject
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="field-label" htmlFor="subject-name">Name</label>
              <input id="subject-name" className="input" placeholder="Data Structures" value={newName} onChange={(event) => setNewName(event.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="subject-code">Code</label>
              <input id="subject-code" className="input uppercase" placeholder="PCCST303" value={newCode} onChange={(event) => setNewCode(event.target.value)} />
            </div>
            <div>
              <label className="field-label">Department</label>
              <select
                className="input cursor-pointer"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
              >
                {DEPARTMENTS.map((department) => (
                  <option key={department.code} value={department.code}>
                    {department.code} — {department.name}
                  </option>
                ))}
              </select>
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
              <label className="field-label" htmlFor="subject-semester">Semester</label>
              <select id="subject-semester" className="input cursor-pointer" value={newSemesterId} onChange={(event) => setNewSemesterId(event.target.value)}>
                <option value="">Select semester</option>
                {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
              </select>
            </div>
          </div>
          {departments.length === 0 && <p className="text-err text-xs mb-3">No departments are available. Open Departments and add one first.</p>}
          {semesters.length === 0 && <p className="text-err text-xs mb-3">No semesters are available.</p>}
          <div className="flex gap-2">
            <button onClick={addSubject} className="btn-primary" disabled={!canCreate}>Create</button>
            <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
          </div>
        </section>
      )}

      {error && <p className="panel p-3 text-err text-sm mb-4" role="alert">{error}</p>}

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
                  <span className="badge badge-neutral">{s.department}</span>
                  <span className="badge badge-red">{semLabel(s.semester)}</span>
                </div>
                <button onClick={() => toggleModules(subject.id)} className="btn-ghost">{editingId === subject.id ? "Close" : "Modules"}</button>
                <button onClick={() => archiveSubject(subject)} className="btn-ghost text-err hover:bg-err/10">Archive</button>
              </div>

            {/* Modules list / editor */}
            {editingId === s.id && (
              <div className="space-y-2 fade-in">
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="field-label">Department</label>
                    <select
                      className="input cursor-pointer"
                      value={s.department}
                      onChange={(e) => updateSubject(s.id, "department", e.target.value)}
                    >
                      {DEPARTMENTS.map((department) => (
                        <option key={department.code} value={department.code}>
                          {department.code} — {department.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Semester</label>
                    <select
                      className="input cursor-pointer"
                      value={s.semester}
                      onChange={(e) => updateSubject(s.id, "semester", e.target.value)}
                    >
                      {SEMESTER_OPTIONS.map((semester) => (
                        <option key={semester} value={semester}>{semLabel(semester)}</option>
                      ))}
                    </select>
                  </div>
                </div>
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
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
