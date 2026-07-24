"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminApi,
  type ApiDepartment,
  type ApiModule,
  type ApiSemester,
  type ApiSubject,
} from "@/lib/api";

function semesterLabel(semester?: ApiSemester) {
  if (!semester) return "Semester";
  return semester.name || `Semester ${semester.number}`;
}

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [semesters, setSemesters] = useState<ApiSemester[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [modulesBySubject, setModulesBySubject] = useState<Record<string, ApiModule[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newSemesterId, setNewSemesterId] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState("");

  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );
  const semestersById = useMemo(
    () => new Map(semesters.map((semester) => [semester.id, semester])),
    [semesters],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [subjectList, semesterList, departmentList] = await Promise.all([
        adminApi.listSubjects(),
        adminApi.listSemesters(),
        adminApi.listDepartments(),
      ]);

      semesterList.sort((a, b) => a.number - b.number);
      departmentList.sort((a, b) => a.name.localeCompare(b.name));
      subjectList.sort((a, b) => a.name.localeCompare(b.name));

      setSubjects(subjectList);
      setSemesters(semesterList);
      setDepartments(departmentList);
      setNewSemesterId((current) => current || semesterList[0]?.id || "");
      setNewDepartmentId((current) => current || departmentList[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const canCreate =
    newName.trim().length > 1 &&
    newCode.trim().length > 0 &&
    Boolean(newSemesterId) &&
    Boolean(newDepartmentId) &&
    !saving;

  const addSubject = async () => {
    if (!canCreate) return;
    setSaving(true);
    setError("");
    try {
      const created = await adminApi.createSubject({
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        semester_id: newSemesterId,
        department_id: newDepartmentId,
      });
      setSubjects((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewName("");
      setNewCode("");
      setShowNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create subject");
    } finally {
      setSaving(false);
    }
  };

  const toggleModules = async (subjectId: string) => {
    if (editingId === subjectId) {
      setEditingId(null);
      return;
    }
    setEditingId(subjectId);
    if (modulesBySubject[subjectId]) return;

    try {
      const modules = await adminApi.listModules(subjectId);
      modules.sort((a, b) => a.number - b.number);
      setModulesBySubject((current) => ({ ...current, [subjectId]: modules }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load modules");
    }
  };

  const addModule = async (subjectId: string) => {
    const existing = modulesBySubject[subjectId] ?? [];
    const number = existing.length + 1;
    try {
      const created = await adminApi.createModule({
        name: `Module ${number}`,
        number,
        subject_id: subjectId,
      });
      setModulesBySubject((current) => ({
        ...current,
        [subjectId]: [...existing, created],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add module");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manage subjects</h1>
          <p className="text-sm text-muted mt-1">
            Add subjects under the correct department and semester.
          </p>
        </div>
        <button onClick={() => setShowNew((value) => !value)} className="btn-primary">
          + New subject
        </button>
      </div>

      {error && (
        <div className="panel p-4 mb-5 text-sm text-err" role="alert">
          {error}
          <button onClick={loadData} className="btn-ghost ml-3">
            Retry
          </button>
        </div>
      )}

      {showNew && (
        <section className="panel p-5 mb-6 fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-4">
            Create new subject
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="field-label" htmlFor="subject-name">
                Name
              </label>
              <input
                id="subject-name"
                className="input"
                placeholder="Data Structures"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="subject-code">
                Code
              </label>
              <input
                id="subject-code"
                className="input uppercase"
                placeholder="PCCST303"
                value={newCode}
                onChange={(event) => setNewCode(event.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="subject-department">
                Department
              </label>
              <select
                id="subject-department"
                className="input cursor-pointer"
                value={newDepartmentId}
                onChange={(event) => setNewDepartmentId(event.target.value)}
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
              <label className="field-label" htmlFor="subject-semester">
                Semester
              </label>
              <select
                id="subject-semester"
                className="input cursor-pointer"
                value={newSemesterId}
                onChange={(event) => setNewSemesterId(event.target.value)}
              >
                <option value="">Select semester</option>
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semesterLabel(semester)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {departments.length === 0 && (
            <p className="text-err text-xs mb-3">
              No departments are available. Open Departments and add one first.
            </p>
          )}
          {semesters.length === 0 && (
            <p className="text-err text-xs mb-3">
              No semesters are available. Run the seed setup so S1 to S8 exist.
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={addSubject} className="btn-primary" disabled={!canCreate}>
              {saving ? "Creating..." : "Create"}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="panel p-8 text-center text-sm text-muted">Loading subjects...</div>
      ) : (
        <div className="space-y-4">
          {subjects.length === 0 && (
            <div className="panel p-8 text-center text-sm text-muted">
              No subjects yet. Create your first subject above.
            </div>
          )}
          {subjects.map((subject) => {
            const department = departmentsById.get(subject.department_id);
            const semester = semestersById.get(subject.semester_id);
            const modules = modulesBySubject[subject.id] ?? [];

            return (
              <article key={subject.id} className="card card-hover p-5 fade-up">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-panel-2 border border-line flex items-center justify-center text-xl">
                    Book
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold truncate">{subject.name}</h2>
                      <span className="badge badge-neutral">{subject.code}</span>
                      {department && (
                        <span className="badge badge-neutral">{department.code}</span>
                      )}
                      {semester && (
                        <span className="badge badge-red">{semesterLabel(semester)}</span>
                      )}
                    </div>
                    <p className="text-xs text-faint mt-1">
                      {department?.name ?? "Department not linked"}
                    </p>
                  </div>
                  <button onClick={() => toggleModules(subject.id)} className="btn-ghost">
                    {editingId === subject.id ? "Close" : "Modules"}
                  </button>
                </div>

                {editingId === subject.id && (
                  <div className="space-y-2 fade-in">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                        Modules
                      </p>
                      <button onClick={() => addModule(subject.id)} className="btn-ghost">
                        + Add module
                      </button>
                    </div>
                    {modules.length === 0 ? (
                      <p className="text-xs text-muted">No modules yet.</p>
                    ) : (
                      modules.map((module) => (
                        <div
                          key={module.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel-2 border border-line-soft"
                        >
                          <span className="badge badge-neutral">M{module.number}</span>
                          <span className="text-[13px] text-muted">{module.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
