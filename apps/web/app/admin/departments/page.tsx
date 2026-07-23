"use client";

import { useEffect, useState } from "react";
import { adminApi, type ApiDepartment } from "@/lib/api";

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [archivedDepartments, setArchivedDepartments] = useState<ApiDepartment[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [deleteInput, setDeleteInput] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listDepartments()
      .then(setDepartments)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load departments");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showArchived && archivedDepartments.length === 0) {
      adminApi.listArchivedDepartments()
        .then(setArchivedDepartments)
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Unable to load archived departments");
        });
    }
  }, [showArchived]);

  const addDepartment = async () => {
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await adminApi.createDepartment({
        name: name.trim(),
        code: code.trim().toUpperCase(),
      });
      setDepartments((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setName("");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create department");
    } finally {
      setSaving(false);
    }
  };

  const archiveDepartment = async (department: ApiDepartment) => {
    if (!window.confirm(`Archive ${department.code} - ${department.name}?`)) return;
    try {
      await adminApi.archiveDepartment(department.id);
      setDepartments((current) => current.filter((item) => item.id !== department.id));
      setArchivedDepartments((current) => [...current, department]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive department");
    }
  };

  const unarchiveDepartment = async (department: ApiDepartment) => {
    try {
      const updated = await adminApi.unarchiveDepartment(department.id);
      setArchivedDepartments((current) => current.filter((item) => item.id !== department.id));
      setDepartments((current) => [...current, updated]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unarchive department");
    }
  };

  const confirmDeleteDepartment = (department: ApiDepartment) => {
    setShowDeleteModal(department.id);
    setDeleteInput((current) => ({ ...current, [department.id]: "" }));
  };

  const deleteDepartment = async (department: ApiDepartment) => {
    const entered = deleteInput[department.id]?.trim() ?? "";
    if (entered !== department.code) {
      setError("Department code does not match");
      return;
    }
    try {
      await adminApi.deleteDepartment(department.id, department.code);
      setArchivedDepartments((current) => current.filter((item) => item.id !== department.id));
      setShowDeleteModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete department");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent mb-2">
          Academic structure
        </p>
        <h1 className="text-2xl font-bold">Manage departments</h1>
        <p className="text-sm text-muted mt-1">
          Departments connect students and subjects to the correct study materials.
        </p>
      </div>

      <section className="panel p-5 mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-4">
          Add a department
        </p>
        <div className="grid sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
          <div>
            <label className="field-label" htmlFor="department-name">Department name</label>
            <input
              id="department-name"
              className="input"
              placeholder="e.g. Computer Science and Engineering"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="department-code">Code</label>
            <input
              id="department-code"
              className="input uppercase"
              placeholder="e.g. CSE"
              maxLength={20}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <button
            className="btn-primary h-[42px]"
            onClick={addDepartment}
            disabled={saving || !name.trim() || !code.trim()}
          >
            {saving ? "Adding..." : "Add department"}
          </button>
        </div>
        {error && <p className="text-err text-xs mt-3" role="alert">{error}</p>}
      </section>

      {loading ? (
        <div className="panel p-8 text-center text-sm text-muted">Loading departments...</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {departments.map((department, index) => (
            <article
              key={department.id}
              className="card card-hover p-5 fade-up flex items-start gap-4"
              style={{ animationDelay: `${Math.min(index * 35, 240)}ms` }}
            >
              <div className="w-12 h-12 shrink-0 rounded-xl bg-panel-2 border border-line flex items-center justify-center font-bold text-brand-accent">
                {department.code.slice(0, 3)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold leading-tight">{department.name}</h2>
                  <span className="badge badge-red shrink-0">{department.code}</span>
                </div>
                <p className="text-xs text-faint">Available for subjects and student accounts</p>
              </div>
              <button
                className="btn-ghost text-err hover:bg-err/10"
                onClick={() => archiveDepartment(department)}
              >
                Archive
              </button>
            </article>
          ))}
        </div>
      )}

      <div className="mt-10">
        <button
          className="text-xs text-muted hover:text-brand-accent transition mb-4"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? "Hide archived departments" : "Show archived departments"}
        </button>

        {showArchived && (
          <div className="grid sm:grid-cols-2 gap-3">
            {archivedDepartments.map((department) => (
              <article
                key={department.id}
                className="card card-hover p-5 fade-up flex items-start gap-4 opacity-80"
              >
                <div className="w-12 h-12 shrink-0 rounded-xl bg-panel-2 border border-line flex items-center justify-center font-bold text-faint">
                  {department.code.slice(0, 3)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold leading-tight line-through decoration-faint">{department.name}</h2>
                    <span className="badge badge-neutral shrink-0">{department.code}</span>
                  </div>
                  <p className="text-xs text-faint">Archived</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost text-brand-accent hover:bg-brand-accent/10"
                    onClick={() => unarchiveDepartment(department)}
                  >
                    Unarchive
                  </button>
                  <button
                    className="btn-ghost text-err hover:bg-err/10"
                    onClick={() => confirmDeleteDepartment(department)}
                  >
                    Delete
                  </button>
                </div>
                {showDeleteModal === department.id && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="panel p-5 max-w-sm w-full">
                      <p className="text-sm font-semibold mb-2">Permanently delete department</p>
                      <p className="text-xs text-muted mb-2">
                        This action cannot be undone. To confirm, type the department code: <span className="font-mono font-bold">{department.code}</span>
                      </p>
                      <input
                        className="input mb-3"
                        placeholder="Enter department code"
                        value={deleteInput[department.id] ?? ""}
                        onChange={(e) => setDeleteInput((current) => ({ ...current, [department.id]: e.target.value }))}
                      />
                      <div className="flex gap-2 justify-end">
                        <button className="btn-secondary" onClick={() => setShowDeleteModal(null)}>Cancel</button>
                        <button
                          className="btn-primary bg-err hover:bg-err/80"
                          disabled={(deleteInput[department.id]?.trim() ?? "") !== department.code}
                          onClick={() => deleteDepartment(department)}
                        >
                          Delete forever
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            ))}
            {archivedDepartments.length === 0 && (
              <p className="text-xs text-muted">No archived departments.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
