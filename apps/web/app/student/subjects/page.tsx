"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen } from "reicon-react";
import { studentApi, type ApiModule, type ApiSubject } from "@/lib/api";

interface SubjectView {
  id: string;
  name: string;
  code: string;
  department: string;
  modules: ApiModule[];
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");

  useEffect(() => {
    let active = true;
    studentApi
      .listSubjects()
      .then(async (subs: ApiSubject[]) => {
        const withModules = await Promise.all(
          subs.map(async (s) => {
            let modules: ApiModule[] = [];
            try {
              modules = await studentApi.listModules(s.id);
            } catch {
              modules = [];
            }
            return {
              id: s.id,
              name: s.name,
              code: s.code,
              department: s.department_name ?? "—",
              modules,
            };
          }),
        );
        if (!active) return;
        setSubjects(withModules);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load subjects");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(subjects.map((s) => s.department))).sort(),
    [subjects],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return subjects.filter(
      (subject) =>
        (department === "all" || subject.department === department) &&
        (!needle ||
          `${subject.name} ${subject.code} ${subject.modules
            .map((m) => m.name)
            .join(" ")}`.toLowerCase().includes(needle)),
    );
  }, [department, query, subjects]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted mt-1">
            Browse the subjects you have access to. Pick one to start a grounded chat.
          </p>
        </div>

        <div className="panel p-4 mb-6 grid sm:grid-cols-2 gap-3">
          <input
            className="input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects or modules"
            aria-label="Search subjects or modules"
          />
          <select
            className="input cursor-pointer"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="panel p-4 mb-5 text-sm text-err" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="skeleton h-6 w-2/3 mb-3" />
                <div className="skeleton h-4 w-full mb-2" />
                <div className="skeleton h-4 w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((s) => (
              <div key={s.id} className="card card-hover p-5 fade-up">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-panel-2 border border-line flex items-center justify-center text-brand-accent">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold truncate">{s.name}</h2>
                      <span className="badge badge-neutral">{s.code}</span>
                    </div>
                    <p className="text-xs text-faint mt-0.5">
                      {s.department} · {s.modules.length} modules
                    </p>
                  </div>
                </div>

                {s.modules.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    {s.modules.map((m) => (
                      <Link
                        key={m.id}
                        href={`/student/chat?subject=${encodeURIComponent(s.id)}&module=${encodeURIComponent(m.id)}`}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-panel-2 border border-line-soft"
                      >
                        <span className="text-[13px] text-muted truncate">{m.name}</span>
                        <span className="text-[11px] text-faint whitespace-nowrap ml-2">
                          Module {m.number}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                <Link
                  href={`/student/chat?subject=${encodeURIComponent(s.id)}`}
                  className="btn-secondary w-full mt-4"
                >
                  Study this subject →
                </Link>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="panel p-8 text-center text-sm text-muted">
            {subjects.length === 0
              ? "No subjects are assigned to your account yet. Ask an admin to set your department and semester."
              : "No subjects match those filters."}
          </div>
        )}
      </div>
    </div>
  );
}
