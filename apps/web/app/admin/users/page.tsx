"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  status: "active" | "inactive";
  questionsAsked: number;
  lastActive: string;
}

const MOCK_USERS: User[] = [
  { id: "u1", name: "Abhinav Sharma", email: "abhinav@college.edu", role: "student", status: "active", questionsAsked: 47, lastActive: "2 min ago" },
  { id: "u2", name: "Priya Patel", email: "priya@college.edu", role: "student", status: "active", questionsAsked: 31, lastActive: "15 min ago" },
  { id: "u3", name: "Rahul Kumar", email: "rahul@college.edu", role: "student", status: "active", questionsAsked: 23, lastActive: "1h ago" },
  { id: "u4", name: "Sneha Gupta", email: "sneha@college.edu", role: "student", status: "inactive", questionsAsked: 12, lastActive: "3 days ago" },
  { id: "u5", name: "Dr. Meera Joshi", email: "meera@college.edu", role: "admin", status: "active", questionsAsked: 0, lastActive: "30 min ago" },
  { id: "u6", name: "Arjun Nair", email: "arjun@college.edu", role: "student", status: "active", questionsAsked: 56, lastActive: "5 min ago" },
  { id: "u7", name: "Kavita Reddy", email: "kavita@college.edu", role: "student", status: "active", questionsAsked: 38, lastActive: "45 min ago" },
  { id: "u8", name: "Demo Student", email: "student@vibegpt.local", role: "student", status: "active", questionsAsked: 19, lastActive: "Just now" },
  { id: "u9", name: "System Admin", email: "admin@vibegpt.local", role: "admin", status: "active", questionsAsked: 0, lastActive: "Just now" },
];

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<"all" | "student" | "admin">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setUsers(MOCK_USERS);
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.role !== filter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalStudents = users.filter((u) => u.role === "student").length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const activeCount = users.filter((u) => u.status === "active").length;

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted mt-1">
          View and manage student and admin accounts.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3.5 mb-6">
        {[
          { label: "Students", value: totalStudents, icon: "👥" },
          { label: "Admins", value: totalAdmins, icon: "🛡️" },
          { label: "Active now", value: activeCount, icon: "🟢" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{s.icon}</span>
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
                            {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.name}</p>
                            <p className="text-[11px] text-faint truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${u.role === "admin" ? "badge-red" : "badge-neutral"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell text-muted">{u.questionsAsked}</td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-faint">{u.lastActive}</td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${u.status === "active" ? "badge-success" : "badge-neutral"}`}>
                          {u.status}
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
