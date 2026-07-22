"use client";

import { useEffect, useState } from "react";
import { adminApi, type ApiSubject, type ApiSemester, type ApiDepartment, type ApiModule } from "@/lib/api";

const semLabel = (sem: ApiSemester) => `${sem.name}`;

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [semesters, setSemesters] = useState<ApiSemester[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingModules, setEditingModules] = useState<ApiModule[]>([]);

  // New subject state
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newSemesterId, setNewSemesterId] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    Promise.all([
      adminApi.listSubjects(),
      adminApi.listSemesters(),
      adminApi.listDepartments(),
    ]).then(([subjs, sems, depts]) => {
      setSubjects(subjs);
      setSemesters(sems);
      setDepartments(depts);
      if (sems.length > 0) setNewSemesterId(sems[0].id);
      if (depts.length > 0) setNewDepartmentId(depts[0].id);
      setIsLoading(false);
    }).catch(console.error);
  }, []);

  const saveTick = () => {
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1800);
  };

  const addSubject = async () => {
    if (!newName.trim() || !newCode.trim() || !newSemesterId || !newDepartmentId) return;
    try {
      const newSubj = await adminApi.createSubject({
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        semester_id: newSemesterId,
        department_id: newDepartmentId,
      });
      setSubjects((prev) => [...prev, newSubj]);
      setNewName("");
      setNewCode("");
      setShowNew(false);
      saveTick();
    } catch (err) {
      console.error(err);
      alert("Failed to create subject");
    }
  };

  const removeSubject = async (id: string) => {
    if (!confirm("Are you sure you want to archive this subject?")) return;
    try {
      await adminApi.archiveSubject(id);
      setSubjects((prev) => prev.filter(s => s.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to archive subject");
    }
  };

  const openEditor = async (id: string) => {
    if (editingId === id) {
      setEditingId(null);
      return;
    }
    setEditingId(id);
    try {
      const mods = await adminApi.listModules(id);
      setEditingModules(mods);
    } catch (err) {
      console.error(err);
    }
  };

  const addModule = async (subjectId: string) => {
    const n = editingModules.length + 1;
    try {
      const newMod = await adminApi.createModule({
        name: `Module ${n}`,
        number: n,
        subject_id: subjectId,
      });
      setEditingModules((prev) => [...prev, newMod]);
    } catch (err) {
      console.error(err);
    }
  };

  const updateModule = async (moduleId: string, name: string) => {
    // Optimistic update in UI
    setEditingModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, name } : m))
    );
  };

  const saveModules = async () => {
    // Send all updates to backend
    try {
      await Promise.all(
        editingModules.map(m => adminApi.updateModule(m.id, { name: m.name }))
      );
      saveTick();
    } catch (err) {
      console.error(err);
      alert("Failed to save modules");
    }
  };

  const removeModule = async (moduleId: string) => {
    if (!confirm("Archive this module?")) return;
    try {
      await adminApi.archiveModule(moduleId);
      setEditingModules((prev) => prev.filter(m => m.id !== moduleId));
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="p-8">Loading subjects...</div>;

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

      {showNew && (
        <div className="panel p-5 mb-6 fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-4">
            Create new subject
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
              <label className="field-label">Department</label>
              <select
                className="input cursor-pointer"
                value={newDepartmentId}
                onChange={(e) => setNewDepartmentId(e.target.value)}
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code} - {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Semester</label>
              <select
                className="input cursor-pointer"
                value={newSemesterId}
                onChange={(e) => setNewSemesterId(e.target.value)}
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {semLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {departments.length === 0 && (
            <p className="text-err text-xs mb-3">No departments found. Please create one in DB first.</p>
          )}
          <div className="flex gap-2">
            <button onClick={addSubject} className="btn-primary" disabled={!newDepartmentId || !newSemesterId}>
              Create
            </button>
            <button onClick={() => setShowNew(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {subjects.map((s) => {
          const sem = semesters.find(sem => sem.id === s.semester_id);
          return (
            <div key={s.id} className="card card-hover p-5 fade-up">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-panel-2 border border-line flex items-center justify-center text-xl">
                  📖
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold truncate">{s.name}</h2>
                    <span className="badge badge-neutral">{s.code}</span>
                    {sem && <span className="badge badge-red">{semLabel(sem)}</span>}
                  </div>
                </div>
                <button
                  onClick={() => openEditor(s.id)}
                  className="btn-ghost"
                >
                  {editingId === s.id ? "Close" : "Edit"}
                </button>
                <button
                  onClick={() => removeSubject(s.id)}
                  className="btn-ghost text-err hover:bg-err/10"
                >
                  Archive
                </button>
              </div>

              {editingId === s.id && (
                <div className="space-y-2 fade-in">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-2">
                    Modules
                  </p>
                  {editingModules.length === 0 && (
                    <p className="text-xs text-muted mb-2">No modules yet.</p>
                  )}
                  {editingModules.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel-2 border border-line-soft"
                    >
                      <input
                        className="flex-1 bg-transparent text-[13px] text-muted outline-none"
                        value={m.name}
                        onChange={(e) => updateModule(m.id, e.target.value)}
                      />
                      <button
                        onClick={() => removeModule(m.id)}
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
                    <button onClick={saveModules} className="btn-primary ml-auto">
                      {savedTick ? "✓ Saved" : "Save changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
