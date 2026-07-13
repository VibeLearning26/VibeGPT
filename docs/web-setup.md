# Next.js Web Setup

## Requirements
- Node.js 20+
- npm (or pnpm/yarn)

## Local Development

1. Install dependencies:
```bash
cd apps/web
npm install
```

2. Configure environment (optional, defaults to `http://localhost:8000`):
Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Run development server:
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.
