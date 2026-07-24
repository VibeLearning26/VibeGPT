"use client";

import { useState, useEffect } from "react";
import { Star, Bell, Warning, Check } from "reicon-react";

interface FeedbackItem {
  id: string;
  question: string;
  subject: string;
  rating: number;
  comment: string;
  student: string;
  when: string;
  status: "new" | "reviewed" | "resolved";
}

const MOCK_FEEDBACK: FeedbackItem[] = [
  {
    id: "f1",
    question: "Explain ACID properties of a transaction",
    subject: "DBMS",
    rating: 5,
    comment: "Very detailed answer with accurate citations. Exactly what I needed for my exam prep.",
    student: "Abhinav S.",
    when: "1h ago",
    status: "new",
  },
  {
    id: "f2",
    question: "Compare paging and segmentation",
    subject: "OS",
    rating: 4,
    comment: "Good explanation but could include a diagram reference.",
    student: "Priya P.",
    when: "3h ago",
    status: "new",
  },
  {
    id: "f3",
    question: "Difference between TCP and UDP",
    subject: "CN",
    rating: 2,
    comment: "The answer missed key points about connection-oriented vs connectionless nature. Needs more depth.",
    student: "Rahul K.",
    when: "Yesterday",
    status: "reviewed",
  },
  {
    id: "f4",
    question: "Dijkstra's algorithm steps",
    subject: "DAA",
    rating: 5,
    comment: "Perfect step-by-step breakdown with the example. Very helpful!",
    student: "Arjun N.",
    when: "Yesterday",
    status: "resolved",
  },
  {
    id: "f5",
    question: "Normalization up to BCNF",
    subject: "DBMS",
    rating: 3,
    comment: "Covered 1NF to 3NF well but BCNF explanation was thin.",
    student: "Kavita R.",
    when: "2 days ago",
    status: "reviewed",
  },
  {
    id: "f6",
    question: "Round Robin vs SJF scheduling",
    subject: "OS",
    rating: 4,
    comment: "Great comparison table format. Would appreciate a worked Gantt chart example.",
    student: "Sneha G.",
    when: "3 days ago",
    status: "resolved",
  },
];

const statusBadge: Record<string, string> = {
  new: "badge-red",
  reviewed: "badge-warning",
  resolved: "badge-success",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={13}
          weight="Filled"
          color={star <= rating ? "#ff2a2a" : "#3d3d42"}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [filter, setFilter] = useState<"all" | "new" | "reviewed" | "resolved">("all");

  useEffect(() => {
    const t = setTimeout(() => {
      setFeedback(MOCK_FEEDBACK);
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const filtered = feedback.filter((f) => filter === "all" || f.status === filter);

  const avgRating = feedback.length
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
    : "—";
  const newCount = feedback.filter((f) => f.status === "new").length;
  const lowRated = feedback.filter((f) => f.rating <= 2).length;

  const updateStatus = (id: string, status: FeedbackItem["status"]) => {
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Student feedback</h1>
        <p className="text-sm text-muted mt-1">
          Review ratings and comments from students on generated answers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3.5 mb-6">
        {[
          { label: "Avg rating", value: avgRating, icon: <Star size={18} className="text-brand-accent" /> },
          { label: "New feedback", value: newCount, icon: <Bell size={18} className="text-brand-accent" /> },
          { label: "Low-rated", value: lowRated, icon: <Warning size={18} className="text-brand-accent" />, accent: true },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center">{s.icon}</span>
              <span className="text-xs text-faint">{s.label}</span>
            </div>
            {loading ? (
              <div className="skeleton h-7 w-12" />
            ) : (
              <p className={`text-2xl font-extrabold ${"accent" in s && s.accent ? "text-brand-accent" : ""}`}>
                {s.value}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-5">
        {(["all", "new", "reviewed", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`chip !px-4 ${filter === f ? "active" : ""}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Feedback cards */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="skeleton h-5 w-3/5 mb-3" />
                <div className="skeleton h-4 w-full mb-2" />
                <div className="skeleton h-4 w-4/5" />
              </div>
            ))
          : filtered.map((f) => (
              <div key={f.id} className="card card-hover p-5 fade-up">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="badge badge-neutral">{f.subject}</span>
                  <StarRating rating={f.rating} />
                  <span className={`badge ${statusBadge[f.status]}`}>{f.status}</span>
                  <span className="text-[11px] text-faint ml-auto">{f.when}</span>
                </div>
                <h3 className="font-semibold mb-1">{f.question}</h3>
                <p className="text-sm text-muted mb-3">{f.comment}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-faint">— {f.student}</span>
                  <div className="flex gap-2">
                    {f.status === "new" && (
                      <button
                        onClick={() => updateStatus(f.id, "reviewed")}
                        className="btn-ghost"
                      >
                        Mark reviewed
                      </button>
                    )}
                    {f.status !== "resolved" && (
                      <button
                        onClick={() => updateStatus(f.id, "resolved")}
                        className="btn-ghost inline-flex items-center gap-1.5"
                      >
                        <Check size={14} /> Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        {!loading && filtered.length === 0 && (
          <div className="panel text-center py-10 text-faint text-sm">
            No feedback matching this filter.
          </div>
        )}
      </div>
    </div>
  );
}
