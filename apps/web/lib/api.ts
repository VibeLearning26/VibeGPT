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

// Admin Document API helpers
export interface SubjectWithModules {
  id: string;
  name: string;
  code: string;
  description: string | null;
  department_id: string;
  semester_id: string;
  credits: number | null;
  is_active: boolean;
  created_at: string;
  modules: ModuleResponse[];
}

export interface ModuleResponse {
  id: string;
  name: string;
  number: number;
  description: string | null;
  subject_id: string;
  is_active: boolean;
  created_at: string;
}

export interface DocumentListItem {
  id: string;
  document_name: string;
  original_filename: string;
  status: string;
  source_type: string;
  file_size: number;
  total_chunks: number;
  created_at: string;
}

export interface ProcessingJobResponse {
  id: string;
  document_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  chunks_created: number;
  retry_count: number;
  triggered_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentDetailResponse {
  id: string;
  document_name: string;
  original_filename: string;
  storage_path: string;
  file_hash: string;
  mime_type: string;
  file_size: number;
  source_type: string;
  priority: number;
  version: number;
  status: string;
  description: string | null;
  topic: string | null;
  uploaded_by: string;
  is_active: boolean;
  published_at: string | null;
  published_by: string | null;
  total_chunks: number;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch subjects with their modules for a given semester (via department filter)
export async function fetchSubjectsWithModules(semesterId: string): Promise<SubjectWithModules[]> {
  // First get subjects for the semester
  const subjects = await fetchApi(`/api/v1/admin/subjects?semester_id=${semesterId}`);
  // Then fetch modules for each subject
  const subjectsWithModules = await Promise.all(
    subjects.map(async (subject: any) => {
      const modules = await fetchApi(`/api/v1/admin/modules?subject_id=${subject.id}`);
      return { ...subject, modules: modules.filter((m: any) => m.is_active) };
    })
  );
  return subjectsWithModules;
}

// Fetch all semesters
export async function fetchSemesters() {
  return fetchApi("/api/v1/admin/semesters");
}

// Document upload (uses FormData, handled separately in page)
// Document list
export async function fetchDocuments(params?: { status?: string; subject_id?: string }): Promise<DocumentListItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.subject_id) searchParams.set("subject_id", params.subject_id);
  const query = searchParams.toString();
  return fetchApi(`/api/v1/admin/documents${query ? `?${query}` : ""}`);
}

// Get document detail
export async function fetchDocument(id: string): Promise<DocumentDetailResponse> {
  return fetchApi(`/api/v1/admin/documents/${id}`);
}

// Get processing job for document
export async function fetchDocumentJob(id: string): Promise<ProcessingJobResponse> {
  return fetchApi(`/api/v1/admin/documents/${id}/job`);
}

// Retry failed document
export async function retryDocument(id: string): Promise<{ message: string }> {
  return fetchApi(`/api/v1/admin/documents/${id}/retry`, { method: "POST" });
}

// Publish document
export async function publishDocument(id: string): Promise<{ message: string }> {
  return fetchApi(`/api/v1/admin/documents/${id}/publish`, { method: "POST" });
}

// Archive document
export async function archiveDocument(id: string): Promise<{ message: string }> {
  return fetchApi(`/api/v1/admin/documents/${id}/archive`, { method: "POST" });
}
