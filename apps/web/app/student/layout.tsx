"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "@/lib/auth";
import { RECENT_CONVERSATIONS, SUBJECTS, type Subject } from "@/lib/mockData";
import { readDemoSubjects } from "@/lib/demoAcademic";

const navItems = [
  { icon: "📚", label: "Subjects", href: "/student/subjects", id: "subjects" },
  { icon: "⭐", label: "Saved answers", href: "/student/saved", id: "saved" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>(SUBJECTS);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => setSubjects(readDemoSubjects()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div className="overlay fixed inset-0 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar fixed lg:static z-40 h-full w-[276px] flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-line">
          <div className="w-9 h-9 rounded-xl glow-ring bg-panel flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="VibeGPT Logo" width={36} height={36} className="object-cover" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">VibeGPT</h1>
            <p className="text-[10px] text-faint mt-1">Campus Study Agent</p>
          </div>
        </div>

        {/* New chat */}
        <div className="p-3">
          <Link href="/student/chat" onClick={() => setOpen(false)} className="btn-primary w-full">
            <span className="text-base leading-none">＋</span>
            New chat
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-6">
          {/* Primary nav */}
          <nav className="space-y-1">
            <Link
              href="/student/chat"
              onClick={() => setOpen(false)}
              className={`sidebar-item ${isActive("/student/chat") ? "active" : ""}`}
            >
              <span className="sidebar-icon text-base">💬</span>
              <span>Chat</span>
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
              >
                <span className="sidebar-icon text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Recent conversations */}
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
              Recent
            </p>
            <div className="space-y-0.5">
              {RECENT_CONVERSATIONS.map((c) => (
                <Link
                  key={c.id}
                  href="/student/chat"
                  onClick={() => setOpen(false)}
                  className="sidebar-item !py-2 group"
                  title={c.title}
                >
                  <span className="sidebar-icon text-xs text-faint">↳</span>
                  <span className="truncate flex-1 text-[13px]">{c.title}</span>
                  <span className="text-[10px] text-faint opacity-0 group-hover:opacity-100 transition">
                    {c.subject}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Subjects quick list */}
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
              Subjects
            </p>
            <div className="space-y-0.5">
              {subjects.map((s) => (
                <Link
                  key={s.id}
                  href="/student/subjects"
                  onClick={() => setOpen(false)}
                  className="sidebar-item !py-2"
                >
                  <span className="sidebar-icon text-base">{s.icon}</span>
                  <span className="truncate text-[13px]">{s.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom — admin + logout */}
        <div className="p-3 border-t border-line space-y-1">
          <Link href="/admin" className="sidebar-item">
            <span className="sidebar-icon text-base">🛠️</span>
            <span>Admin panel</span>
          </Link>
          <button onClick={handleLogout} className="sidebar-item w-full text-left">
            <span className="sidebar-icon text-base">↩</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 border-b border-line bg-panel">
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 rounded-lg bg-panel-2 border border-line flex items-center justify-center"
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="font-bold text-sm">VibeGPT</span>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
