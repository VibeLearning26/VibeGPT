"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminApi,
  inferSourceType,
  type ApiDocument,
  type ApiModule,
  type ApiSemester,
  type ApiSubject,
  type SourceTypeValue,
} from "@/lib/api";

interface Upload {
  id: string;
  name: string;
  size: string;
  moduleName: string;
  status: "uploading" | "processing" | "done" | "failed";
  error?: string;
  documentId?: string;
}

const EXT_ICON: Record<string, string> = {
  pdf: "📕",
  pptx: "📙",
  docx: "📘",
  xlsx: "📗",
};

const CATEGORY_OPTIONS: { value: SourceTypeValue | "auto"; label: string }[] = [
  { value: "auto", label: "Auto (by file type)" },
  { value: "pdf_notes", label: "Notes (PDF)" },
  { value: "pptx_presentation", label: "Presentation" },
  { value: "docx_notes", label: "Notes (DOCX)" },
  { value: "xlsx_question_bank", label: "Question bank" },
  { value: "previous_year_paper", label: "Previous year paper" },
  { value: "teacher_answer", label: "Teacher answer" },
  { value: "teacher_example", label: "Teacher example" },
  { value: "other", label: "Other" },
];

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  uploaded: { cls: "badge-neutral", label: "Uploaded" },
  processing: { cls: "badge-warning", label: "Processing" },
  needs_review: { cls: "badge-warning", label: "Needs review" },
  ready: { cls: "badge-success", label: "✓ Ready" },
  published: { cls: "badge-red", label: "● Published" },
  failed: { cls: "badge-error", label: "Failed" },
  archived: { cls: "badge-neutral", label: "Archived" },
};

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

let counter = 0;

export default function DocumentsPage() {
  const [semesters, setSemesters] = useState<ApiSemester[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [semesterId, setSemesterId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [sems, subs] = await Promise.all([
        adminApi.listSemesters(),
        adminApi.listSubjects(),
      ]);
      sems.sort((a, b) => a.number - b.number);
      setSemesters(sems);
      setSubjects(subs);
      setSemesterId((prev) => prev || (sems[0]?.id ?? ""));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial state is already loading=true, so the effect only starts the fetch.
  // Deferred via setTimeout to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    const t = setTimeout(fetchData, 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchData();
  }, [fetchData]);

  const visibleSubjects = subjects.filter(
    (s) => s.is_active && (!semesterId || s.semester_id === semesterId),
  );

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Upload study material</h1>
        <p className="text-sm text-muted mt-1">
          Pick a semester, then add PDF, PPTX, DOCX or XLSX files under each subject.
          Files are extracted, chunked and embedded so VibeGPT can answer from them.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="panel p-5 mb-6 text-center">
          <p className="text-sm text-muted mb-3">
            <span className="badge badge-error mr-2">Error</span>
            {error}
          </p>
          <p className="text-xs text-faint mb-3">
            Is the backend running? Log in with a real admin account — demo mode
            has no live subjects.
          </p>
          <button onClick={load} className="btn-ghost">
            ↻ Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="skeleton h-4 w-24 mb-2" />
            <div className="skeleton h-9 w-full" />
          </div>
          <div className="card p-5">
            <div className="skeleton h-5 w-2/5 mb-3" />
            <div className="skeleton h-24 w-full" />
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Semester picker */}
          <div className="panel p-5 mb-6">
            <label className="field-label" htmlFor="semester-select">
              Semester
            </label>
            <select
              id="semester-select"
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              className="input cursor-pointer"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `Semester ${s.number}`}
                </option>
              ))}
            </select>
          </div>

          {/* Subjects in this semester — one upload card each */}
          <div className="space-y-4">
            {visibleSubjects.map((subject) => (
              <SubjectUploadCard key={subject.id} subject={subject} />
            ))}
            {visibleSubjects.length === 0 && (
              <div className="panel p-8 text-center text-sm text-muted">
                No subjects in this semester yet. Create subjects in the
                Subjects section first.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SubjectUploadCard({ subject }: { subject: ApiSubject }) {
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [moduleId, setModuleId] = useState<string>("");
  const [category, setCategory] = useState<SourceTypeValue | "auto">("auto");
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [docs, setDocs] = useState<ApiDocument[]>([]);
  const [showDocs, setShowDocs] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listModules(subject.id)
      .then((mods) => {
        if (cancelled) return;
        mods.sort((a, b) => a.number - b.number);
        setModules(mods);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [subject.id]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const refreshDocs = useCallback(async () => {
    try {
      const list = await adminApi.listDocuments(subject.id);
      setDocs(list);
      return list;
    } catch {
      return [];
    }
  }, [subject.id]);

  useEffect(() => {
    refreshDocs();
  }, [refreshDocs]);

  /** Poll until no document for this subject is still processing. */
  const pollProcessing = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const list = await refreshDocs();
      const stillProcessing = list.some(
        (d) => d.status === "processing" || d.status === "uploaded",
      );
      setUploads((prev) =>
        prev.map((u) => {
          if (u.status !== "processing" || !u.documentId) return u;
          const doc = list.find((d) => d.id === u.documentId);
          if (!doc) return u;
          if (doc.status === "ready" || doc.status === "published")
            return { ...u, status: "done" };
          if (doc.status === "failed")
            return { ...u, status: "failed", error: "Processing failed" };
          return u;
        }),
      );
      if (!stillProcessing && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 2500);
  }, [refreshDocs]);

  const selectedModule = modules.find((m) => m.id === moduleId);

  const addFiles = async (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      const id = `u${counter++}`;
      const upload: Upload = {
        id,
        name: f.name,
        size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
        moduleName: selectedModule?.name ?? "Whole subject",
        status: "uploading",
      };
      setUploads((prev) => [upload, ...prev]);

      try {
        const res = await adminApi.uploadDocument({
          file: f,
          subject_id: subject.id,
          module_id: moduleId || null,
          source_type: inferSourceType(f.name, category),
        });
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: "processing", documentId: res.id } : u,
          ),
        );
        pollProcessing();
      } catch (e) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: "failed",
                  error: e instanceof Error ? e.message : "Upload failed",
                }
              : u,
          ),
        );
      }
    }
  };

  const publish = async (documentId: string) => {
    try {
      await adminApi.publishDocument(documentId);
      await refreshDocs();
    } catch {
      // list refresh below will show the true state
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const indexed = docs.filter((d) => d.status === "ready" || d.status === "published");

  return (
    <div className="card p-5 fade-up">
      {/* Subject header + module & category pickers */}
      <div className="flex items-start gap-3 mb-4 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-panel-2 border border-line flex items-center justify-center text-xl">
          📚
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold truncate">{subject.name}</h2>
            <span className="badge badge-neutral">{subject.code}</span>
          </div>
          <p className="text-xs text-faint mt-0.5">
            {modules.length} modules · {docs.length} documents ·{" "}
            {indexed.length} indexed
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="min-w-[160px]">
            <label className="field-label" htmlFor={`module-${subject.id}`}>
              Module
            </label>
            <select
              id={`module-${subject.id}`}
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="input cursor-pointer !py-1.5 text-[13px]"
            >
              <option value="">Whole subject</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="field-label" htmlFor={`category-${subject.id}`}>
              Category
            </label>
            <select
              id={`category-${subject.id}`}
              value={category}
              onChange={(e) => setCategory(e.target.value as SourceTypeValue | "auto")}
              className="input cursor-pointer !py-1.5 text-[13px]"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Compact dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`panel border-dashed cursor-pointer text-center py-8 transition-all ${
          dragging ? "glow-ring border-brand bg-[rgba(229,9,20,0.04)]" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.pptx,.docx,.xlsx"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <p className="font-semibold text-sm">
          {dragging ? "Drop files to upload" : "⬆ Drag & drop or click to browse"}
        </p>
        <p className="text-xs text-faint mt-1">
          PDF, PPTX, DOCX, XLSX · uploading to{" "}
          <span className="text-brand-accent">
            {selectedModule?.name ?? "whole subject"}
          </span>
        </p>
      </div>

      {/* Per-subject upload queue */}
      {uploads.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {uploads.map((u) => (
            <div key={u.id} className="card p-3.5 fade-up">
              <div className="flex items-center gap-3">
                <span className="text-xl">{EXT_ICON[ext(u.name)] ?? "📎"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{u.name}</p>
                  <p className="text-[11px] text-faint">
                    {u.size} · {u.moduleName}
                    {u.error ? ` · ${u.error}` : ""}
                  </p>
                </div>
                {u.status === "done" ? (
                  <span className="badge badge-success">✓ Indexed</span>
                ) : u.status === "failed" ? (
                  <span className="badge badge-error">✕ Failed</span>
                ) : u.status === "processing" ? (
                  <span className="badge badge-warning">Processing</span>
                ) : (
                  <span className="badge badge-neutral">Uploading…</span>
                )}
              </div>
              {(u.status === "uploading" || u.status === "processing") && (
                <div className="mt-3 h-1.5 rounded-full bg-panel-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: u.status === "processing" ? "80%" : "35%",
                      background: "linear-gradient(90deg,#e50914,#ff2a2a)",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Existing documents for this subject */}
      {docs.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowDocs((v) => !v)}
            className="btn-ghost text-xs"
          >
            {showDocs ? "▾" : "▸"} {docs.length} document{docs.length === 1 ? "" : "s"}
          </button>
          {showDocs && (
            <div className="mt-2 space-y-2">
              {docs.map((d) => {
                const badge = STATUS_BADGE[d.status] ?? STATUS_BADGE.uploaded;
                return (
                  <div key={d.id} className="card p-3 flex items-center gap-3">
                    <span className="text-lg">
                      {EXT_ICON[ext(d.original_filename)] ?? "📎"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">
                        {d.document_name}
                      </p>
                      <p className="text-[11px] text-faint">
                        {(d.file_size / 1024 / 1024).toFixed(1)} MB ·{" "}
                        {d.total_chunks} chunks
                      </p>
                    </div>
                    <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    {d.status === "ready" && (
                      <button
                        onClick={() => publish(d.id)}
                        className="btn-ghost text-xs"
                        title="Make available to students"
                      >
                        Publish
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
