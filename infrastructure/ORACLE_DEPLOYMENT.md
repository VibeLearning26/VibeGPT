# Deploy VibeGPT on Oracle Cloud Free Tier

This deployment runs the web application, FastAPI service, document worker, and Ollama on the Oracle VPS. Supabase provides PostgreSQL/pgvector and document storage.

## 1. Prepare the server

Install Git and Docker Engine with the Docker Compose plugin. Clone the repository and enter the infrastructure directory:

```bash
git clone https://github.com/VibeLearning26/VibeGPT.git
cd VibeGPT/infrastructure
```

## 2. Configure environment variables

Copy the safe template and fill it locally on the VPS:

```bash
cp oracle.env.example ../.env
nano ../.env
```

Required private values include:

- Supabase pooler database URL with a URL-encoded password
- Supabase server-side secret key
- A random JWT secret of at least 64 characters
- A strong initial admin password
- The Oracle VPS public IP or domain

Never commit the completed `.env` file. Do not place a Supabase secret key in frontend variables or browser code.

## 3. Configure Supabase Storage

Run `supabase-storage-setup.sql` in the Supabase SQL editor. Confirm that the private `documents` bucket exists.

## 4. Start the application

```bash
docker compose --env-file ../.env -f docker-compose.oracle.yml up -d --build
docker compose --env-file ../.env -f docker-compose.oracle.yml ps
```

The first startup can take several minutes while Ollama downloads the configured model and the API runs database migrations.

## 5. Inspect startup problems

```bash
docker compose --env-file ../.env -f docker-compose.oracle.yml logs api --tail 200
docker compose --env-file ../.env -f docker-compose.oracle.yml logs web --tail 100
docker compose --env-file ../.env -f docker-compose.oracle.yml logs worker --tail 100
```

## 6. Firewall and production security

During initial IP-based testing, allow TCP ports `3000` and `8000`. Do not expose PostgreSQL or Ollama port `11434` publicly.

Before student use:

- Configure a domain and HTTPS reverse proxy.
- Expose only ports `80` and `443` publicly.
- Set `APP_ENV=production`.
- Change public URLs and CORS origins to the HTTPS domain.
- Rotate any credential that has appeared in chat, screenshots, terminal output, or Git history.
- Back up Supabase data and test document restoration.

## Data flow

- The API uploads private document objects to Supabase Storage.
- The worker downloads an object temporarily, extracts text, creates chunks and embeddings, and stores the indexed results in Supabase PostgreSQL.
- Ollama receives only retrieved document text, never Supabase credentials.
