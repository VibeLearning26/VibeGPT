"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Refresh, Copy, Star } from "reicon-react";
import { studentApi, type ApiHistoryItem } from "@/lib/api";

export default function SavedPage() {
  const [items, setItems] = useState<ApiHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    studentApi
      .getSavedAnswers()
      .then((result) => {
        if (!active) return;
        setItems(result);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load saved answers");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const copy = (item: ApiHistoryItem) => {
    navigator.clipboard.writeText(item.answer_preview ?? item.question);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((c) => (c === item.id ? null : c)), 1600);
  };

  const unsave = async (item: ApiHistoryItem) => {
    try {
      await studentApi.unsaveAnswer(item.id);
      setItems((current) => current.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove saved answer");
    }
  };

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
          {!loading && <span className="badge badge-red">{items.length} saved</span>}
        </div>

        {error && (
          <div className="panel p-4 mb-5 text-sm text-err" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="skeleton h-5 w-3/5 mb-3" />
                <div className="skeleton h-4 w-full mb-2" />
                <div className="skeleton h-4 w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div key={a.id} className="card card-hover p-5 fade-up">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-neutral">{a.subject_name}</span>
                  <span className="badge badge-red">{a.marks} marks</span>
                  <span className="text-[11px] text-faint ml-auto">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="font-semibold mb-1.5">{a.question}</h2>
                <p className="text-sm text-muted line-clamp-2">{a.answer_preview}</p>
                <div className="flex gap-2 mt-4">
                  <Link
                    href="/student/chat"
                    className="btn-ghost inline-flex items-center gap-1.5"
                  >
                    <Refresh size={14} /> Re-ask
                  </Link>
                  <button
                    onClick={() => copy(a)}
                    className="btn-ghost inline-flex items-center gap-1.5"
                  >
                    <Copy size={14} /> {copiedId === a.id ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => unsave(a)}
                    className="btn-ghost inline-flex items-center gap-1.5 ml-auto"
                    style={{ color: "#ff2a2a", borderColor: "rgba(229,9,20,0.5)" }}
                    title="Remove from saved"
                  >
                    <Star size={14} weight="Filled" /> Saved
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="panel p-8 text-center text-sm text-muted">
                No saved answers yet. Save an answer from the chat to build your revision library.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
