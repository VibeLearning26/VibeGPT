"use client";

import Link from "next/link";
import { SUBJECTS } from "@/lib/mockData";

export default function SubjectsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted mt-1">
            Browse subjects and modules. Pick one to start a grounded chat.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {SUBJECTS.map((s) => (
            <div key={s.id} className="card card-hover p-5 fade-up">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-panel-2 border border-line flex items-center justify-center text-xl">
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold truncate">{s.name}</h2>
                    <span className="badge badge-neutral">{s.code}</span>
                  </div>
                  <p className="text-xs text-faint mt-0.5">
                    {s.modules.length} modules · {s.materials} materials
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {s.modules.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-panel-2 border border-line-soft"
                  >
                    <span className="text-[13px] text-muted truncate">{m.name}</span>
                    <span className="text-[11px] text-faint whitespace-nowrap ml-2">
                      {m.materials} files
                    </span>
                  </div>
                ))}
              </div>

              <Link href="/student/chat" className="btn-secondary w-full mt-4">
                Study this subject →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
