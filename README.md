# VibeGPT – Campus Study Agent

<p align="center">
  <strong>AI-powered study assistant that generates exam-ready answers using admin-approved college study materials</strong>
</p>

<p align="center">
  <em>Grounded in facts • Structured by marks • Cited with sources</em>
</p>

---

## 🎯 What is VibeGPT?

VibeGPT is a **RAG-powered campus study system** where:

- **Admins** upload and manage college study materials (PDFs, PPTs, DOCX, XLSX)
- **Students** ask questions and receive exam-ready answers grounded in those materials
- Answers are structured by marks (2, 5, 10), cited with source pages/slides, and validated

**This is NOT an open chatbot.** It only answers using admin-approved materials.

## 🏗️ Architecture

| Component | Technology |
|-----------|-----------|
| **Web App** | Next.js 16, TypeScript, Tailwind CSS v4 |
| **Mobile App** | Flutter, Riverpod, Dio, go_router |
| **Backend** | Python, FastAPI, SQLAlchemy, Alembic |
| **Database** | PostgreSQL + pgvector |
| **AI/RAG** | sentence-transformers, Ollama (local LLM) |
| **Deployment** | Docker Compose, Caddy, Oracle Cloud VPS (ARM64) |

## 📁 Monorepo Structure

```
VibeGPT/
├── apps/
│   ├── web/          → Next.js student + admin web app
│   └── mobile/       → Flutter Android app (student)
├── services/
│   └── api/          → FastAPI backend + RAG + document processing
├── infrastructure/   → Docker Compose, Caddy, deploy scripts
├── docs/             → Architecture, API, deployment documentation
└── .github/          → CI/CD workflows, templates
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Flutter 3.x
- Docker & Docker Compose
- PostgreSQL with pgvector (or use Docker)

### 1. Clone & Configure

```bash
git clone <repository-url>
cd VibeGPT
cp .env.example .env
# Edit .env with your settings
```

### 2. Start Database (Docker)

```bash
cd infrastructure
docker compose up postgres -d
```

### 3. Backend

```bash
cd services/api
python -m venv .venv
.venv/Scripts/activate  # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 4. Web App

```bash
cd apps/web
npm install
npm run dev
```

### 5. Flutter App

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

### 6. Full Stack (Docker)

```bash
cd infrastructure
docker compose up -d
```

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vibegpt.local | (set in .env) |
| Student | student@vibegpt.local | student123 |

## 📖 Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Database Schema](docs/database.md)
- [Deployment Guide](docs/deployment.md)
- [Flutter Setup](docs/flutter-setup.md)
- [Web Setup](docs/web-setup.md)
- [Contributing](docs/contribution-guide.md)

## 🤝 Contributing

See [Contribution Guide](docs/contribution-guide.md) for branch conventions, PR templates, and coding standards.

## 📄 License

MIT License — see [LICENSE](LICENSE)
