"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type ApiDashboard, type ApiDocument } from "@/lib/api";

const statusBadge: Record<string, string> = {
  published: "badge-success",
  processing: "badge-warning",
  ready: "badge-warning",
  uploaded: "badge-neutral",
  needs_review: "badge-neutral",
  failed: "badge-error",
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatWhen(value: string) {
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return "";
  return created.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ApiDashboard | null>(null);
  const [uploads, setUploads] = useState<ApiDocument[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [dashboard, documents] = await Promise.all([
          adminApi.getDashboard(),
          adminApi.listDocuments(),
        ]);
        if (cancelled) return;
        setStats(dashboard);
        setUploads(documents.slice(0, 5));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      label: "Published documents",
      value: stats?.published_documents,
      icon: "Doc",
      accent: false,
    },
    {
      label: "Awaiting processing",
      value: stats?.pending_documents,
      icon: "Wait",
      accent: false,
    },
    {
      label: "Needs review",
      value: stats?.review_documents,
      icon: "Review",
      accent: false,
    },
    {
      label: "Failed jobs",
      value: stats?.failed_jobs,
      icon: "Fail",
      accent: true,
    },
    {
      label: "Total students",
      value: stats?.total_students,
      icon: "Users",
      accent: false,
    },
    {
      label: "Questions today",
      value: stats?.questions_today,
      icon: "Chat",
      accent: false,
    },
    {
      label: "Avg processing",
      value: stats?.avg_processing_ms,
      icon: "Fast",
      accent: false,
      suffix: "ms",
    },
    {
      label: "Low-rated answers",
      value: stats?.low_rated_answers,
      icon: "Low",
      accent: true,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted mt-1">Overview of your VibeGPT knowledge base</p>
        </div>
        <Link href="/admin/documents" className="btn-primary">
          + Upload material
        </Link>
      </div>

      {error && (
        <div className="panel p-4 mb-5 text-sm text-err" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-9">
        {cards.map((card) => (
          <div key={card.label} className="card card-hover p-5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-semibold mb-4 border ${
                card.accent
                  ? "bg-[rgba(229,9,20,0.1)] border-[rgba(229,9,20,0.3)]"
                  : "bg-panel-2 border-line"
              }`}
            >
              {card.icon}
            </div>
            {loading ? (
              <div className="skeleton h-7 w-16 mb-2" />
            ) : (
              <p className={`text-2xl font-extrabold ${card.accent ? "text-brand-accent" : ""}`}>
                {card.value ?? 0}
                {"suffix" in card && card.suffix ? (
                  <span className="text-sm text-faint ml-0.5">{card.suffix}</span>
                ) : null}
              </p>
            )}
            <p className="text-xs text-faint mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent uploads</h2>
            <Link href="/admin/documents" className="text-xs text-brand-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton h-12 w-full" />
              ))
            ) : uploads.length === 0 ? (
              <div className="rounded-xl bg-panel-2 border border-line-soft px-3.5 py-6 text-center text-sm text-muted">
                No uploads yet.
              </div>
            ) : (
              uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-panel-2 border border-line-soft"
                >
                  <span className="badge badge-neutral">File</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">{upload.document_name}</p>
                    <p className="text-[11px] text-faint">{formatWhen(upload.created_at)}</p>
                  </div>
                  <span className={`badge ${statusBadge[upload.status] ?? "badge-neutral"}`}>
                    {formatStatus(upload.status)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="font-semibold mb-4">Quick actions</h2>
          <div className="space-y-2">
            {[
              { label: "Upload PDF / PPT / DOCX", href: "/admin/documents", icon: "Upload" },
              { label: "Configure answer format", href: "/admin/answer-rules", icon: "Rules" },
              { label: "Manage subjects", href: "/admin/subjects", icon: "Subjects" },
              { label: "Review feedback", href: "/admin/feedback", icon: "Feedback" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-panel-2 border border-line-soft hover:border-[rgba(229,9,20,0.4)] transition"
              >
                <span className="badge badge-neutral">{action.icon}</span>
                <span className="text-[13px] font-medium">{action.label}</span>
                <span className="ml-auto text-faint">Go</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
