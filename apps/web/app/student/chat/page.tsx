"use client";

import { useState, useRef, useEffect } from "react";
import {
  MARKS_OPTIONS,
  SEMESTER_OPTIONS,
  SUBJECTS,
  routeQuestion,
  generateMockAnswer,
  simplifyAnswer,
  type StudyAnswer,
  type RouteResult,
  type Subject,
} from "@/lib/mockData";
import { readDemoSubjects } from "@/lib/demoAcademic";
import { askQuestion, fetchApi, hasRealSession, isUuid, type ApiAnswerResponse } from "@/lib/api";

interface RealSubject {
  id: string;
  name: string;
  code: string;
}

function apiAnswerToStudyAnswer(
  api: ApiAnswerResponse,
  subjectName: string,
  moduleName: string,
): StudyAnswer {
  return {
    question: api.question,
    marks: api.marks,
    subject: subjectName,
    module: moduleName,
    body: api.answer ?? "No answer was generated.",
    wordCount: api.word_count ?? 0,
    processingMs: api.processing_ms ?? 0,
    sources: api.sources.map((s) => ({
      tag: s.label,
      document: s.document_name,
      location:
        s.page_number != null
          ? `Page ${s.page_number}`
          : s.slide_number != null
            ? `Slide ${s.slide_number}`
            : (s.sheet_name ?? "—"),
      preview: s.preview ?? "",
    })),
  };
}

function renderBody(body: string) {
  // Minimal markdown-ish rendering for **bold**, bullets, and paragraphs.
  return body.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    const html = trimmed
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
    if (trimmed.startsWith("- ")) {
      return (
        <li
          key={i}
          className="ml-4 list-disc"
          dangerouslySetInnerHTML={{ __html: html.slice(2) }}
        />
      );
    }
    return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

function AnswerSkeleton() {
  return (
    <div className="answer-card space-y-3 fade-in">
      <div className="skeleton h-4 w-2/5" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-11/12" />
      <div className="skeleton h-3 w-4/5" />
      <div className="h-2" />
      <div className="skeleton h-3 w-3/4" />
      <div className="skeleton h-3 w-5/6" />
      <div className="flex gap-2 pt-2">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-6 w-20" />
      </div>
    </div>
  );
}

const semLabel = (sem: string) => `Semester ${sem.replace("S", "")}`;

export default function ChatPage() {
  const [marks, setMarks] = useState(5);
  const [semester, setSemester] = useState(
    "S5",
  );
  const [catalog, setCatalog] = useState<Subject[]>(SUBJECTS);
  const [subjectId, setSubjectId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<StudyAnswer | null>(null);
  const [detected, setDetected] = useState<RouteResult | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Real backend subjects the student can access (empty in demo mode).
  const [realSubjects, setRealSubjects] = useState<RealSubject[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const items = readDemoSubjects();
      setCatalog(items);
      const params = new URLSearchParams(window.location.search);
      const requestedSubject = params.get("subject") ?? "";
      const requestedModule = params.get("module") ?? "";
      const selected = items.find((item) => item.id === requestedSubject);
      if (selected) {
        setSemester(selected.semester);
        setSubjectId(selected.id);
        if (selected.modules.some((module) => module.id === requestedModule)) {
          setModuleId(requestedModule);
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasRealSession()) return;
    fetchApi("/api/v1/student/subjects")
      .then((subs: RealSubject[]) => setRealSubjects(subs))
      .catch(() => setRealSubjects([]));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [answer, loading]);

  /** Find the real UUID subject matching a mock-routed subject (by code, then name). */
  const matchRealSubject = (code: string, name: string): RealSubject | undefined =>
    realSubjects.find((s) => s.code.toLowerCase() === code.toLowerCase()) ??
    realSubjects.find((s) => s.name.toLowerCase() === name.toLowerCase());

  const run = async (q: string, m: number) => {
    // Route the question to a subject within the chosen semester (mock "AI").
    const selectedSubject = catalog.find((subject) => subject.id === subjectId);
    const selectedModule = selectedSubject?.modules.find((module) => module.id === moduleId);
    const automaticRoute = routeQuestion(q, semester, catalog);
    const route: RouteResult | null = selectedSubject
      ? {
          subject: selectedSubject,
          module: selectedModule ?? selectedSubject.modules[0] ?? {
            id: `${selectedSubject.id}-general`,
            name: "General",
            materials: 0,
          },
          confidence: "high",
        }
      : automaticRoute;
    setDetected(route);
    setLoading(true);
    setShowSources(false);
    setCopied(false);
    setSaved(false);

    // When logged into the real backend, resolve the routed subject to a real
    // UUID (mock ids like "dbms" are matched to API subjects by code/name) and
    // ask the Ollama-backed RAG pipeline; otherwise fall back to the local mock.
    if (hasRealSession()) {
      const real = route
        ? isUuid(route.subject.id)
          ? { id: route.subject.id, name: route.subject.name, code: route.subject.code }
          : matchRealSubject(route.subject.code, route.subject.name)
        : realSubjects[0]; // no mock route — let retrieval decide relevance
      if (real) {
        try {
          const api = await askQuestion({
            subject_id: real.id,
            module_id: route && isUuid(route.module.id) ? route.module.id : null,
            marks: m,
            question: q,
          });
          setAnswer(
            apiAnswerToStudyAnswer(api, real.name, route?.module.name ?? "General"),
          );
          setLoading(false);
          return;
        } catch {
          // Backend unreachable or errored — fall through to mock below.
        }
      }
    }

    const result = route
      ? generateMockAnswer(q, m, route.subject.name, route.module.name)
      : generateMockAnswer(q, m, "General", "General");
    await new Promise((r) => setTimeout(r, 1100));
    setAnswer(result);
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    run(q, marks);
    setQuestion("");
  };

  const regenerate = () => answer && run(answer.question, answer.marks);
  const simplify = async () => {
    if (!answer) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setAnswer(simplifyAnswer(answer));
    setLoading(false);
  };
  const copy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer.body.replace(/\*\*/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-5 sm:px-8 h-16 border-b border-line">
        <div>
          <h1 className="text-base font-semibold">Ask a question</h1>
          <p className="text-xs text-faint">
            {semLabel(semester)}
            {detected ? ` · ${detected.subject.name}` : " · subject auto-detected"}
          </p>
        </div>
        <span className="badge badge-red hidden sm:inline-flex">● Grounded mode</span>
      </header>

      {/* Conversation area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
          {!answer && !loading && (
            <div className="text-center py-16 fade-up">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-panel border border-line glow-ring flex items-center justify-center text-3xl">
                📚
              </div>
              <h2 className="text-2xl font-bold mb-2">What would you like to study?</h2>
              <p className="text-sm text-muted max-w-md mx-auto">
                Pick your semester and marks below, then ask. VibeGPT figures out which
                subject your question belongs to and writes a structured, cited answer.
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
                {[
                  "Explain ACID properties of a transaction",
                  "Compare paging and segmentation",
                  "State and prove the Master Theorem",
                  "Difference between TCP and UDP",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => run(s, marks)}
                    className="card card-hover p-3.5 text-sm text-muted hover:text-fg text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question bubble */}
          {(answer || loading) && (
            <div className="flex justify-end mb-6 fade-up">
              <div className="bubble-user max-w-[85%]">
                <p className="text-[15px]">{answer?.question ?? (question || "…")}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="badge badge-neutral">{answer?.marks ?? marks} marks</span>
                  <span className="badge badge-neutral">{semLabel(semester)}</span>
                  {detected && (
                    <span className="text-[11px] text-faint">
                      {detected.subject.icon} {detected.subject.code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {loading && <AnswerSkeleton />}

          {/* Answer */}
          {answer && !loading && (
            <div className="fade-up">
              {/* Detected subject banner */}
              {detected && (
                <div className="mb-3">
                  {detected.confidence === "high" ? (
                    <span className="badge badge-success">
                      🎯 Detected subject: {detected.subject.name} · {detected.module.name}
                    </span>
                  ) : (
                    <span className="badge badge-warning">
                      ⚠ Couldn&apos;t confidently match a subject — showing best guess:{" "}
                      {detected.subject.name}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e50914] to-[#ff2a2a] flex items-center justify-center text-xs font-extrabold text-white">
                  V
                </div>
                <span className="text-sm font-semibold">VibeGPT</span>
                <span className="text-[11px] text-faint">
                  {answer.wordCount} words · {answer.processingMs}ms
                </span>
              </div>

              <div className="answer-card">{renderBody(answer.body)}</div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button onClick={copy} className="btn-ghost">
                  {copied ? "✓ Copied" : "⧉ Copy"}
                </button>
                <button
                  onClick={() => setSaved((s) => !s)}
                  className="btn-ghost"
                  style={saved ? { color: "#ff2a2a", borderColor: "rgba(229,9,20,0.5)" } : undefined}
                >
                  {saved ? "★ Saved" : "☆ Save"}
                </button>
                <button onClick={regenerate} className="btn-ghost">↻ Regenerate</button>
                <button onClick={simplify} className="btn-ghost">✦ Simplify</button>
                <button
                  onClick={() => setShowSources((v) => !v)}
                  className="btn-ghost ml-auto"
                >
                  📄 Sources ({answer.sources.length})
                </button>
              </div>

              {/* Sources */}
              {showSources && (
                <div className="mt-4 space-y-2 fade-in">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                    Source references
                  </p>
                  {answer.sources.map((src) => (
                    <div key={src.tag} className="card p-3.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="source-tag">{src.tag}</span>
                        <span className="text-sm font-medium">{src.document}</span>
                        <span className="badge badge-neutral ml-auto">{src.location}</span>
                      </div>
                      <p className="text-xs text-muted italic">{src.preview}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky composer */}
      <div className="border-t border-line bg-bg/60 backdrop-blur px-5 sm:px-8 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          {/* Selectors */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Semester */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-faint mr-1">Semester</span>
              <div className="relative">
                <select
                  value={semester}
                  onChange={(e) => {
                    setSemester(e.target.value);
                    setSubjectId("");
                    setModuleId("");
                  }}
                  className="chip appearance-none pr-7 cursor-pointer"
                  aria-label="Semester"
                >
                  {SEMESTER_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {semLabel(s)}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint text-[10px]">▾</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-faint mr-1">Subject</span>
              <select
                value={subjectId}
                onChange={(e) => { setSubjectId(e.target.value); setModuleId(""); }}
                className="chip appearance-none cursor-pointer max-w-[190px]"
                aria-label="Subject"
              >
                <option value="">Auto-detect</option>
                {catalog.filter((subject) => subject.semester === semester).map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-faint mr-1">Module</span>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                disabled={!subjectId}
                className="chip appearance-none cursor-pointer max-w-[180px] disabled:opacity-50"
                aria-label="Module"
              >
                <option value="">Any module</option>
                {(catalog.find((subject) => subject.id === subjectId)?.modules ?? []).map((module) => (
                  <option key={module.id} value={module.id}>{module.name}</option>
                ))}
              </select>
            </div>

            {/* Marks */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] text-faint mr-1">Marks</span>
              {MARKS_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMarks(m)}
                  className={`chip !px-3.5 ${marks === m ? "active" : ""}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="composer flex items-end gap-2 p-2.5">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question — VibeGPT finds the right subject…"
              rows={1}
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="flex-1 bg-transparent resize-none outline-none text-[15px] px-2 py-2 max-h-40 placeholder:text-faint"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="btn-primary h-11 w-11 !px-0 rounded-xl"
              aria-label="Send"
            >
              {loading ? (
                <span className="loading-dots"><span></span><span></span><span></span></span>
              ) : (
                "↑"
              )}
            </button>
          </div>
          <p className="text-center text-[11px] text-faint mt-2">
            Answers use only admin-approved college materials · Enter to send, Shift+Enter for a new line
          </p>
        </form>
      </div>
    </div>
  );
}
