"use client";

import Link from "next/link";
import { SAVED_ANSWERS } from "@/lib/mockData";

export default function SavedPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Saved answers</h1>
            <p className="text-sm text-muted mt-1">
              Your bookmarked answers, ready for revision.
            </p>
          </div>
          <span className="badge badge-red">{SAVED_ANSWERS.length} saved</span>
        </div>

        <div className="space-y-3">
          {SAVED_ANSWERS.map((a) => (
            <div key={a.id} className="card card-hover p-5 fade-up">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-neutral">{a.subject}</span>
                <span className="badge badge-red">{a.marks} marks</span>
                <span className="text-[11px] text-faint ml-auto">{a.savedAt}</span>
              </div>
              <h2 className="font-semibold mb-1.5">{a.question}</h2>
              <p className="text-sm text-muted line-clamp-2">{a.excerpt}</p>
              <div className="flex gap-2 mt-4">
                <Link href="/student/chat" className="btn-ghost">↻ Re-ask</Link>
                <button className="btn-ghost">⧉ Copy</button>
                <button className="btn-ghost ml-auto" style={{ color: "#ff2a2a", borderColor: "rgba(229,9,20,0.5)" }}>
                  ★ Saved
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
