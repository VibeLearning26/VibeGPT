"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { mockLogin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Frontend-only mock auth — no backend.
    await new Promise((r) => setTimeout(r, 650));
    const user = mockLogin(email, password);

    if (!user) {
      setError("Invalid email or password. Try a demo account below.");
      setLoading(false);
      return;
    }

    router.push(user.role === "admin" ? "/admin" : "/student/chat");
  };

  const fill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="app-shell min-h-screen flex">
      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 border-r border-line relative overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #e50914, transparent 70%)" }}
        />
        <div className="flex items-center gap-3 relative">
          <div className="w-11 h-11 rounded-2xl glow-ring flex items-center justify-center bg-panel overflow-hidden">
            <Image src="/logo.png" alt="VibeGPT Logo" width={44} height={44} className="object-cover" />
          </div>
          <span className="text-lg font-bold tracking-tight">VibeGPT</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-5xl font-extrabold leading-tight mb-5">
            Exam-ready answers,
            <br />
            <span className="text-gradient-red">grounded in your college material.</span>
          </h1>
          <p className="text-muted text-[15px] leading-relaxed">
            Pick a subject and module, choose your marks, and ask. VibeGPT retrieves the
            approved study material and writes a structured, cited answer.
          </p>

          <div className="mt-10 space-y-3">
            {[
              "Answers from approved college materials only",
              "Structured by marks — 2, 5 and 10",
              "Every claim cited with page & slide",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-panel-2 border border-line flex items-center justify-center text-brand-accent text-xs">
                  ✓
                </span>
                <span className="text-sm text-muted">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-faint">© 2026 VibeGPT · Campus Study Agent</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl glow-ring flex items-center justify-center bg-panel overflow-hidden">
              <Image src="/logo.png" alt="VibeGPT Logo" width={44} height={44} className="object-cover" />
            </div>
            <span className="text-lg font-bold">VibeGPT</span>
          </div>

          <h2 className="text-2xl font-bold mb-1.5">Welcome back</h2>
          <p className="text-sm text-muted mb-8">Sign in to access your study materials</p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-[rgba(255,77,79,0.1)] border border-[rgba(255,77,79,0.3)] text-[var(--color-err)] text-sm fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="field-label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@college.edu"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-12">
              {loading ? (
                <span className="loading-dots"><span></span><span></span><span></span></span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 panel p-4">
            <p className="text-xs font-semibold text-muted mb-3">Demo accounts — tap to fill</p>
            <div className="space-y-2">
              <button
                onClick={() => fill("student@vibegpt.local", "student123")}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-panel-2 border border-line hover:border-[rgba(229,9,20,0.4)] transition text-xs"
              >
                <span className="badge badge-neutral mr-2">Student</span>
                <span className="text-muted">student@vibegpt.local · student123</span>
              </button>
              <button
                onClick={() => fill("admin@vibegpt.local", "admin123")}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-panel-2 border border-line hover:border-[rgba(229,9,20,0.4)] transition text-xs"
              >
                <span className="badge badge-red mr-2">Admin</span>
                <span className="text-muted">admin@vibegpt.local · admin123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
