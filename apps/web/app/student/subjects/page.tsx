"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEPARTMENTS, SEMESTER_OPTIONS, SUBJECTS, type Subject } from "@/lib/mockData";
import { readDemoSubjects } from "@/lib/demoAcademic";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>(SUBJECTS);
  const [query, setQuery] = useState("");
  const [semester, setSemester] = useState("all");
  const [department, setDepartment] = useState("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setSubjects(readDemoSubjects()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return subjects.filter((subject) =>
      (semester === "all" || subject.semester === semester) &&
      (department === "all" || subject.department === department) &&
      (!needle || `${subject.name} ${subject.code} ${subject.modules.map((m) => m.name).join(" ")}`
        .toLowerCase().includes(needle)),
    );
  }, [department, query, semester, subjects]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted mt-1">
            Browse subjects and modules. Pick one to start a grounded chat.
          </p>
        </div>

        <div className="panel p-4 mb-6 grid sm:grid-cols-3 gap-3">
          <input
            className="input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects or modules"
            aria-label="Search subjects or modules"
          />
          <select className="input cursor-pointer" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="all">All departments</option>
            {DEPARTMENTS.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}
          </select>
          <select className="input cursor-pointer" value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="all">All semesters</option>
            {SEMESTER_OPTIONS.map((item) => <option key={item} value={item}>Semester {item.slice(1)}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="card card-hover p-5 fade-up">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-panel-2 border border-line flex items-center justify-center text-xl">
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold truncate">{s.name}</h2>
                    <span className="badge badge-neutral">{s.code}</span>
                    <span className="badge badge-neutral">{s.department}</span>
                  </div>
                  <p className="text-xs text-faint mt-0.5">
                    {s.modules.length} modules · {s.materials} materials
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {s.modules.map((m) => (
                  <Link
                    key={m.id}
                    href={`/student/chat?subject=${encodeURIComponent(s.id)}&module=${encodeURIComponent(m.id)}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-panel-2 border border-line-soft"
                  >
                    <span className="text-[13px] text-muted truncate">{m.name}</span>
                    <span className="text-[11px] text-faint whitespace-nowrap ml-2">
                      {m.materials} files
                    </span>
                  </Link>
                ))}
              </div>

              <Link href={`/student/chat?subject=${encodeURIComponent(s.id)}`} className="btn-secondary w-full mt-4">
                Study this subject →
              </Link>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="panel p-8 text-center text-sm text-muted">No subjects match those filters.</div>
        )}
      </div>
    </div>
  );
}
