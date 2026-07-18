"use client";

import { useState, useRef } from "react";
import {
  ACTIVE_SEMESTERS,
  subjectsBySemester,
  type Subject,
} from "@/lib/mockData";

interface Upload {
  id: string;
  name: string;
  size: string;
  module: string;
  progress: number;
  status: "uploading" | "processing" | "done";
}

const EXT_ICON: Record<string, string> = {
  pdf: "📕",
  ppt: "📙",
  pptx: "📙",
  doc: "📘",
  docx: "📘",
  xls: "📗",
  xlsx: "📗",
};

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

let counter = 0;

export default function DocumentsPage() {
  const [semester, setSemester] = useState(ACTIVE_SEMESTERS[0]);
  const subjects = subjectsBySemester(semester);

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Upload study material</h1>
        <p className="text-sm text-muted mt-1">
          Pick a semester, then add PDF, PPT, DOCX or XLSX files under each subject.
          The pipeline processes and indexes them.
        </p>
      </div>

      {/* Semester picker */}
      <div className="panel p-5 mb-6">
        <label className="field-label">Semester</label>
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="input cursor-pointer"
        >
          {ACTIVE_SEMESTERS.map((s) => (
            <option key={s} value={s}>
              Semester {s.replace("S", "")}
            </option>
          ))}
        </select>
      </div>

      {/* Subjects in this semester — one upload card each */}
      <div className="space-y-4">
        {subjects.map((subject) => (
          <SubjectUploadCard key={subject.id} subject={subject} />
        ))}
        {subjects.length === 0 && (
          <div className="panel p-8 text-center text-sm text-muted">
            No subjects in this semester yet.
          </div>
        )}
      </div>
    </div>
  );
}

function SubjectUploadCard({ subject }: { subject: Subject }) {
  const [moduleId, setModuleId] = useState(subject.modules[0].id);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedModule =
    subject.modules.find((m) => m.id === moduleId) ?? subject.modules[0];

  const addFiles = (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      const id = `u${counter++}`;
      const upload: Upload = {
        id,
        name: f.name,
        size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
        module: selectedModule.name,
        progress: 0,
        status: "uploading",
      };
      setUploads((prev) => [upload, ...prev]);
      // Simulate upload → processing → done
      const step = () =>
        setUploads((prev) =>
          prev.map((u) => {
            if (u.id !== id) return u;
            const next = Math.min(u.progress + 12 + Math.floor(u.progress % 7), 100);
            const status = next >= 100 ? "processing" : "uploading";
            return { ...u, progress: next, status };
          }),
        );
      const interval = setInterval(() => {
        setUploads((prev) => {
          const u = prev.find((x) => x.id === id);
          if (u && u.progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setUploads((p) =>
                p.map((x) => (x.id === id ? { ...x, status: "done" } : x)),
              );
            }, 1400);
            return prev;
          }
          return prev;
        });
        step();
      }, 220);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="card p-5 fade-up">
      {/* Subject header + module picker */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-panel-2 border border-line flex items-center justify-center text-xl">
          {subject.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold truncate">{subject.name}</h2>
            <span className="badge badge-neutral">{subject.code}</span>
          </div>
          <p className="text-xs text-faint mt-0.5">
            {subject.modules.length} modules · {subject.materials} materials
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
        className={`panel border-dashed cursor-pointer text-center py-8 transition-all ${
          dragging ? "glow-ring border-brand bg-[rgba(229,9,20,0.04)]" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <p className="font-semibold text-sm">
          {dragging ? "Drop files to upload" : "⬆ Drag & drop or click to browse"}
        </p>
        <p className="text-xs text-faint mt-1">
          PDF, PPT, DOCX, XLSX · uploading to{" "}
          <span className="text-brand-accent">{selectedModule.name}</span>
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
                    {u.size} · {u.module}
                  </p>
                </div>
                {u.status === "done" ? (
                  <span className="badge badge-success">✓ Indexed</span>
                ) : u.status === "processing" ? (
                  <span className="badge badge-warning">Processing</span>
                ) : (
                  <span className="text-xs text-faint">{u.progress}%</span>
                )}
              </div>
              {u.status !== "done" && (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
