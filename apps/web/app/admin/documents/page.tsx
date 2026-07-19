"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fetchSemesters, fetchSubjectsWithModules, fetchDocuments, fetchDocumentJob, retryDocument, publishDocument, archiveDocument, SubjectWithModules, DocumentListItem, ProcessingJobResponse } from "@/lib/api";

interface Upload {
  id: string;
  name: string;
  size: string;
  module: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
}

interface Semester {
  id: string;
  name: string;
  number: number;
  is_active: boolean;
}

const EXT_ICON: Record<string, string> = {
  pdf: "PDF",
  ppt: "PPT",
  pptx: "PPTX",
  doc: "DOC",
  docx: "DOCX",
  xls: "XLS",
  xlsx: "XLSX",
};

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

let uploadCounter = 0;

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  uploaded: { label: "Uploaded", variant: "neutral" },
  processing: { label: "Processing", variant: "warning" },
  needs_review: { label: "Needs Review", variant: "warning" },
  ready: { label: "Ready", variant: "success" },
  published: { label: "Published", variant: "success" },
  failed: { label: "Failed", variant: "error" },
  archived: { label: "Archived", variant: "neutral" },
  pending: { label: "Pending", variant: "neutral" },
  running: { label: "Running", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

function getStatusBadge(status: string) {
  const config = STATUS_LABELS[status] ?? { label: status, variant: "neutral" };
  const variantClasses = {
    success: "badge-success",
    warning: "badge-warning",
    error: "badge-error",
    neutral: "badge-neutral",
  };
  return (
    <span className={`badge ${variantClasses[config.variant]}`}>
      {config.label}
    </span>
  );
}

export default function DocumentsPage() {
  const [semesterId, setSemesterId] = useState<string>("");
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SubjectWithModules[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [jobs, setJobs] = useState<Record<string, ProcessingJobResponse>>({});
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch semesters on mount
  useEffect(() => {
    fetchSemesters()
      .then((data) => {
        const active = data.filter((s: Semester) => s.is_active);
        setSemesters(active);
        if (active.length > 0 && !semesterId) {
          setSemesterId(active[0].id);
        }
      })
      .catch(() => setError("Failed to load semesters"));
  }, [semesterId]);

  // Fetch subjects when semester changes
  useEffect(() => {
    if (!semesterId) return;
    setTimeout(() => setLoadingSubjects(true), 0);
    fetchSubjectsWithModules(semesterId)
      .then((data) => setSubjects(data.filter((s) => s.is_active)))
      .catch(() => setError("Failed to load subjects"))
      .finally(() => setLoadingSubjects(false));
  }, [semesterId]);

  // Fetch documents for selected semester's subjects
  useEffect(() => {
    if (!semesterId || subjects.length === 0) return;
    setTimeout(() => setLoadingDocs(true), 0);
    fetchDocuments({ subject_id: subjects[0].id }) // TODO: support multiple
      .then((data) => setDocuments(data))
      .catch(() => setError("Failed to load documents"))
      .finally(() => setLoadingDocs(false));
  }, [semesterId, subjects]);

  // Poll job statuses for documents that are processing
  useEffect(() => {
    const processingDocs = documents.filter((d) => 
      ["processing", "pending", "running"].includes(d.status)
    );
    
    if (processingDocs.length === 0) return;

    const interval = setInterval(async () => {
      for (const doc of processingDocs) {
        try {
          const job = await fetchDocumentJob(doc.id);
          setJobs((prev) => ({ ...prev, [doc.id]: job }));
          
          // Update document status from job
          if (job.status === "completed" || job.status === "failed") {
            setDocuments((prev) => prev.map((d) => 
              d.id === doc.id 
                ? { ...d, status: job.status === "completed" ? "ready" : "failed", total_chunks: job.chunks_created }
                : d
            ));
          }
        } catch {}
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [documents]);

  if (!semesterId) return null;

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Upload study material</h1>
        <p className="text-sm text-muted mt-1">
          Pick a semester, then add PDF, PPT, DOCX or XLSX files under each subject.
          The pipeline processes and indexes them.
        </p>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Semester picker */}
      <div className="panel p-5 mb-6">
        <label className="field-label">Semester</label>
        <select
          value={semesterId}
          onChange={(e) => setSemesterId(e.target.value)}
          className="input cursor-pointer"
          disabled={loadingSubjects || semesters.length === 0}
        >
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (Semester {s.number})
            </option>
          ))}
        </select>
      </div>

      {/* Subjects in this semester  --  one upload card each */}
      <div className="space-y-4">
        {subjects.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted">
            No subjects in this semester yet.
          </div>
        ) : (
          subjects.map((subject) => (
            <SubjectUploadCard 
              key={subject.id} 
              subject={subject}
              onUploadComplete={() => {
                // Refresh documents after upload
                fetchDocuments({ subject_id: subject.id }).then(setDocuments);
              }}
            />
          ))
        )}
      </div>

      {/* Existing Documents List */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Uploaded Documents</h2>
        {loadingDocs ? (
          <div className="panel p-8 text-center text-muted">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <DocumentRow 
                key={doc.id} 
                doc={doc} 
                job={jobs[doc.id]}
                onRetry={() => handleRetry(doc.id)}
                onPublish={() => handlePublish(doc.id)}
                onArchive={() => handleArchive(doc.id)}
                onRefresh={() => refreshDocuments()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  async function handleRetry(docId: string) {
    try {
      await retryDocument(docId);
      await refreshDocuments();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handlePublish(docId: string) {
    try {
      await publishDocument(docId);
      await refreshDocuments();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleArchive(docId: string) {
    try {
      await archiveDocument(docId);
      await refreshDocuments();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function refreshDocuments() {
    if (!subjects.length) return;
    setLoadingDocs(true);
    try {
      const data = await fetchDocuments({ subject_id: subjects[0].id });
      setDocuments(data);
    } finally {
      setLoadingDocs(false);
    }
  }
}

function SubjectUploadCard({ subject, onUploadComplete }: { subject: SubjectWithModules; onUploadComplete: () => void }) {
  const [moduleId, setModuleId] = useState(subject.modules[0]?.id ?? "");
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

const selectedModule = subject.modules.find((m) => m.id === moduleId) ?? subject.modules[0];

  const uploadFile = useCallback(async (file: File, modId: string, subId: string, uploadId: string) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subject_id", subId);
      formData.append("module_id", modId);
      formData.append("source_type", "other");

      const token = typeof window !== "undefined" ? sessionStorage.getItem("access_token") : null;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/admin/documents/upload`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(error.detail || "Upload failed");
      }

      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, progress: 100, status: "done" } : u
        )
      );
      onUploadComplete();
    } catch (err) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, status: "error", error: (err as Error).message } : u
        )
      );
    }
  }, [onUploadComplete]);

  const addFiles = useCallback((files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      const fileExt = ext(f.name);
      if (!["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx"].includes(fileExt)) {
        alert(`Unsupported file type: ${fileExt}`);
        continue;
      }

      const id = `upl_${Date.now()}_${uploadCounter++}`;
      const upload: Upload = {
        id,
        name: f.name,
        size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
        module: selectedModule.name,
        progress: 0,
        status: "uploading",
      };
      setUploads((prev) => [upload, ...prev]);
      uploadFile(f, selectedModule.id, subject.id, id);
    }
  }, [selectedModule.id, selectedModule.name, subject.id, uploadFile]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  return (
    <div className="card p-5 fade-up">
      {/* Subject header + module picker */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-panel-2 border border-line flex items-center justify-center text-xl">
          SUB
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold truncate">{subject.name}</h2>
            <span className="badge badge-neutral">{subject.code}</span>
          </div>
          <p className="text-xs text-faint mt-0.5">
            {subject.modules.length} modules
          </p>
        </div>
        <div className="min-w-[42%] sm:min-w-[200px]">
          <label className="field-label">Module</label>
          <select
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            className="input cursor-pointer !py-1.5 text-[13px]"
          >
            {subject.modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
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
        className={`panel border-dashed cursor-pointer text-center py-8 transition-all ${dragging ? "bg-brand-accent/10 border-brand-accent" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleFileSelect}
        />
        <p className="font-semibold text-sm">
          {dragging ? "Drop files to upload" : "Drag & drop or click to browse"}
        </p>
        <p className="text-xs text-faint mt-1">
          PDF, PPT, DOCX, XLSX  *  uploading to{" "}
          <span className="text-brand-accent">{selectedModule.name}</span>
        </p>
      </div>

      {/* Per-subject upload queue */}
      {uploads.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {uploads.map((u) => (
            <div key={u.id} className="card p-3.5 fade-up">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{EXT_ICON[ext(u.name)] ?? "FILE"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{u.name}</p>
                  <p className="text-[11px] text-faint">
                    {u.size}  *  {u.module}
                  </p>
                </div>
                {u.status === "done" ? (
                  <span className="badge badge-success">OK Indexed</span>
                ) : u.status === "processing" ? (
                  <span className="badge badge-warning">Processing</span>
                ) : u.status === "error" ? (
                  <span className="badge badge-error">Error</span>
                ) : (
                  <span className="text-xs text-faint">{u.progress}%</span>
                )}
              </div>
              {u.status !== "done" && u.status !== "error" && (
                <div className="mt-3 h-1.5 rounded-full bg-panel-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${u.status === "processing" ? 100 : u.progress}%`,
                      background: "linear-gradient(90deg,#e50914,#ff2a2a)",
                    }}
                  />
                </div>
              )}
              {u.error && <p className="text-xs text-error mt-2">{u.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentRow({ 
  doc, 
  job, 
  onRetry, 
  onPublish, 
  onArchive, 
  onRefresh 
}: { 
  doc: DocumentListItem; 
  job?: ProcessingJobResponse;
  onRetry: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onRefresh: () => void;
}) {
  const isProcessing = ["processing", "pending", "running"].includes(doc.status);
  const isFailed = doc.status === "failed";
  const isPublished = doc.status === "published";
  const isReady = doc.status === "ready";

  return (
    <div className="card p-4 fade-up">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{EXT_ICON[ext(doc.original_filename)] ?? "FILE"}</span>
          <div>
            <p className="font-medium truncate max-w-[300px]">{doc.document_name}</p>
            <p className="text-xs text-faint">
              {doc.source_type}  *  {doc.file_size} bytes  *  {doc.total_chunks} chunks
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center gap-2">
          {getStatusBadge(doc.status)}
          {job && isProcessing && (
            <span className="badge badge-warning text-xs">
              Job: {job.status} ({job.chunks_created} chunks)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isFailed && (
            <button 
              onClick={onRetry}
              className="btn btn-sm btn-outline"
              title="Retry processing"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg> Retry
            </button>
          )}
          {isReady && !isPublished && (
            <button 
              onClick={onPublish}
              className="btn btn-sm btn-primary"
              title="Publish document"
            >
              Publish
            </button>
          )}
          {isPublished && (
            <button 
              onClick={onArchive}
              className="btn btn-sm btn-outline"
              title="Archive document"
            >
              Archive
            </button>
          )}
          <button 
            onClick={onRefresh}
            className="btn btn-sm btn-ghost"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {job && isProcessing && (
        <div className="mt-3 h-2 rounded-full bg-panel-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: "100%",
              background: "linear-gradient(90deg,#e50914,#ff2a2a)",
            }}
          />
        </div>
      )}

      {job?.error_message && (
        <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded text-sm text-error">
          Error: {job.error_message}
          {job.retry_count > 0 && <span className="ml-2">(Retry {job.retry_count}/{3})</span>}
        </div>
      )}
    </div>
  );
}