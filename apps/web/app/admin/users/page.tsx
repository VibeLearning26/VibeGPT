"use client";

import { useState, useEffect } from "react";
import { Users, Shield } from "reicon-react";
import { adminApi, type ApiUser } from "@/lib/api";

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "student" | "admin">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminApi.listUsers()
      .then((result) => {
        if (!cancelled) setUsers(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load users");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = users.filter((u) => {
    const normalizedRole = u.role === "student" ? "student" : "admin";
    if (filter !== "all" && normalizedRole !== filter) return false;
    if (search && !u.full_name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalStudents = users.filter((u) => u.role === "student").length;
  const totalAdmins = users.filter((u) => u.role !== "student").length;
  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted mt-1">
          View and manage student and admin accounts.
        </p>
      </div>
      {error && (
        <div className="panel p-4 mb-5 text-sm text-err" role="alert">{error}</div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3.5 mb-6">
        {[
          { label: "Students", value: totalStudents, icon: <Users size={18} className="text-brand-accent" /> },
          { label: "Admins", value: totalAdmins, icon: <Shield size={18} className="text-brand-accent" /> },
          { label: "Active now", value: activeCount, icon: <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" /> },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center">{s.icon}</span>
              <span className="text-xs text-faint">{s.label}</span>
            </div>
            {loading ? (
              <div className="skeleton h-7 w-12" />
            ) : (
              <p className="text-2xl font-extrabold">{s.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          className="input max-w-xs"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5 ml-auto">
          {(["all", "student", "admin"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip !px-4 ${filter === f ? "active" : ""}`}
            >
              {f === "all" ? "All" : f === "student" ? "Students" : "Admins"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-faint">User</th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-faint">Role</th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-faint hidden sm:table-cell">Questions</th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-faint hidden md:table-cell">Last active</th>
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-faint">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-line-soft">
                      <td className="px-5 py-3.5"><div className="skeleton h-5 w-36" /></td>
                      <td className="px-5 py-3.5"><div className="skeleton h-5 w-16" /></td>
                      <td className="px-5 py-3.5 hidden sm:table-cell"><div className="skeleton h-5 w-10" /></td>
                      <td className="px-5 py-3.5 hidden md:table-cell"><div className="skeleton h-5 w-20" /></td>
                      <td className="px-5 py-3.5"><div className="skeleton h-5 w-14" /></td>
                    </tr>
                  ))
                : filtered.map((u) => (
                    <tr key={u.id} className="border-b border-line-soft hover:bg-panel-hover transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-panel-2 border border-line flex items-center justify-center text-xs font-bold text-muted">
                            {u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.full_name}</p>
                            <p className="text-[11px] text-faint truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${u.role !== "student" ? "badge-red" : "badge-neutral"}`}>
                          {u.role === "super_admin" ? "super admin" : u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell text-muted">—</td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-faint">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${u.is_active ? "badge-success" : "badge-neutral"}`}>
                          {u.is_active ? "active" : "inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="text-center py-10 text-faint text-sm">
            No users match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
