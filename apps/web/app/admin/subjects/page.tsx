"use client";

import { useEffect, useState } from "react";
import {
  adminApi,
  type ApiDepartment,
  type ApiModule,
  type ApiSemester,
  type ApiSubject,
} from "@/lib/api";

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [semesters, setSemesters] = useState<ApiSemester[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newSemesterId, setNewSemesterId] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modules, setModules] = useState<ApiModule[]>([]);

  useEffect(() => {
    Promise.all([
        adminApi.listSubjects(),
        adminApi.listSemesters(),
        adminApi.listDepartments(),
      ])
      .then(([loadedSubjects, loadedSemesters, loadedDepartments]) => {
        setSubjects(loadedSubjects);
        setSemesters(loadedSemesters);
        setDepartments(loadedDepartments);
        setNewSemesterId(loadedSemesters[0]?.id || "");
        setNewDepartmentId(loadedDepartments[0]?.id || "");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load subjects");
      })
      .finally(() => setLoading(false));
  }, []);

  const addSubject = async () => {
    if (!newName.trim() || !newCode.trim() || !newSemesterId || !newDepartmentId) return;
    try {
      setError("");
      const created = await adminApi.createSubject({
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        semester_id: newSemesterId,
        department_id: newDepartmentId,
      });
      setSubjects((current) => [...current, created]);
      setNewName("");
      setNewCode("");
      setShowNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create subject");
    }
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

  const saveModules = async () => {
    try {
      await Promise.all(modules.map((module) => adminApi.updateModule(module.id, { name: module.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save modules");
    }
  };

  if (loading) return <div className="p-8 text-sm text-muted">Loading subjects...</div>;

  const canCreate = Boolean(
    newName.trim() && newCode.trim() && newSemesterId && newDepartmentId,
  );

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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="field-label" htmlFor="subject-name">Name</label>
              <input id="subject-name" className="input" placeholder="Data Structures" value={newName} onChange={(event) => setNewName(event.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="subject-code">Code</label>
              <input id="subject-code" className="input uppercase" placeholder="PCCST303" value={newCode} onChange={(event) => setNewCode(event.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="subject-department">Department</label>
              <select id="subject-department" className="input cursor-pointer" value={newDepartmentId} onChange={(event) => setNewDepartmentId(event.target.value)}>
                <option value="">Select department</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.code} - {department.name}</option>)}
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
        {subjects.map((subject) => {
          const semester = semesters.find((item) => item.id === subject.semester_id);
          const department = departments.find((item) => item.id === subject.department_id);
          return (
            <article key={subject.id} className="card card-hover p-5 fade-up">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-panel-2 border border-line flex items-center justify-center font-bold text-brand-accent">{department?.code.slice(0, 2) || "S"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{subject.name}</h2>
                    <span className="badge badge-neutral">{subject.code}</span>
                    {department && <span className="badge badge-red">{department.code}</span>}
                    {semester && <span className="badge badge-neutral">{semester.name}</span>}
                  </div>
                </div>
                <button onClick={() => toggleModules(subject.id)} className="btn-ghost">{editingId === subject.id ? "Close" : "Modules"}</button>
                <button onClick={() => archiveSubject(subject)} className="btn-ghost text-err hover:bg-err/10">Archive</button>
              </div>

              {editingId === subject.id && (
                <div className="mt-4 pt-4 border-t border-line-soft space-y-2 fade-in">
                  {modules.length === 0 && <p className="text-xs text-muted">No modules yet.</p>}
                  {modules.map((module) => (
                    <input key={module.id} className="input" value={module.name} onChange={(event) => setModules((current) => current.map((item) => item.id === module.id ? { ...item, name: event.target.value } : item))} />
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => addModule(subject.id)} className="btn-ghost">+ Add module</button>
                    {modules.length > 0 && <button onClick={saveModules} className="btn-primary ml-auto">Save modules</button>}
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
