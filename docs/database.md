# Database Schema

## Overview

VibeGPT uses PostgreSQL with pgvector extension for vector similarity search.

All tables use UUID primary keys, timestamps, and soft-delete where applicable.

## Tables (20)

| # | Table | Description |
|---|-------|-------------|
| 1 | `users` | User accounts (admin, student) |
| 2 | `refresh_tokens` | JWT refresh token storage |
| 3 | `departments` | Academic departments |
| 4 | `semesters` | Semester definitions |
| 5 | `academic_years` | Academic year periods |
| 6 | `subjects` | Course subjects |
| 7 | `modules` | Subject modules/units |
| 8 | `student_subject_permissions` | Student access control |
| 9 | `documents` | Uploaded study materials |
| 10 | `document_versions` | Document version history |
| 11 | `document_chunks` | Processed text chunks with embeddings |
| 12 | `document_processing_jobs` | Processing job queue |
| 13 | `answer_rules` | Mark-wise answer configuration |
| 14 | `answer_examples` | Teacher-approved style examples |
| 15 | `question_logs` | Student Q&A history |
| 16 | `question_sources` | Source citations per answer |
| 17 | `saved_answers` | Bookmarked answers |
| 18 | `feedback` | Student ratings and comments |
| 19 | `audit_logs` | System audit trail |
| 20 | `system_settings` | Runtime configuration |

## Migrations

Managed with Alembic. See `services/api/alembic/`.

```bash
# Generate a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```
