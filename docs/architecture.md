# VibeGPT Architecture

## System Overview

VibeGPT is a RAG (Retrieval-Augmented Generation) system for academic study assistance.

### Flow

1. Admin uploads college study materials (PDF, PPTX, DOCX, XLSX)
2. Document worker processes and chunks the content
3. Chunks are embedded using `all-MiniLM-L6-v2` and stored in pgvector
4. Student asks a question with subject + marks selection
5. System retrieves relevant chunks via vector similarity search
6. Ollama generates a grounded answer using only the retrieved context
7. Answer is validated against mark rules and citations are mapped
8. Student sees the answer with source citations (page/slide numbers)

### Components

| Component | Port | Public |
|-----------|------|--------|
| Caddy (reverse proxy) | 80, 443 | ✅ |
| Next.js Web App | 3000 | via Caddy |
| FastAPI Backend | 8000 | via Caddy /api/* |
| Document Worker | — | Internal |
| PostgreSQL + pgvector | 5432 | ❌ |
| Ollama LLM | 11434 | ❌ |

### Security Model

- JWT access tokens (30 min) + HttpOnly refresh cookies (7 days)
- Argon2 password hashing
- Role-based access: super_admin, admin, student
- Backend-enforced authorization on all endpoints
- File validation (type, size, SHA-256 dedup)
- CORS restricted to allowed origins
