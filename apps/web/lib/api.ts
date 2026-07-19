export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const token = typeof window !== "undefined" ? sessionStorage.getItem("access_token") : null;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "API Request Failed";
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }

  return response.json();
}

// ── Ask-question (RAG) API ─────────────────────────────────────
// Mirrors services/api app/schemas/question.py

export interface ApiSourceInfo {
  label: string;
  document_id: string;
  document_name: string;
  page_number: number | null;
  slide_number: number | null;
  sheet_name: string | null;
  preview: string | null;
  relevance_score: number | null;
}

export interface ApiAnswerResponse {
  id: string;
  status: string;
  answer: string | null;
  word_count: number | null;
  marks: number;
  question: string;
  sources: ApiSourceInfo[];
  model: string | null;
  processing_ms: number | null;
  created_at: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when we hold a real backend session (not the demo mock token). */
export function hasRealSession(): boolean {
  if (typeof window === "undefined") return false;
  const token = sessionStorage.getItem("access_token");
  return !!token && !token.startsWith("demo-token");
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Call the real RAG pipeline: POST /api/v1/student/answers. */
export async function askQuestion(params: {
  subject_id: string;
  module_id?: string | null;
  marks: number;
  question: string;
}): Promise<ApiAnswerResponse> {
  return fetchApi("/api/v1/student/answers", {
    method: "POST",
    body: JSON.stringify({
      subject_id: params.subject_id,
      module_id: params.module_id ?? null,
      marks: params.marks,
      question: params.question,
    }),
  });
}
