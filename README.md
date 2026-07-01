# syber

Context-first task capture. Add a task in plain language, and it gets auto-tagged
by context (`@computer`, `@phone-calls`, `@anywhere`, ...) and project. Browse tasks
by context on `/now` or by project on `/projects`, and drag a task onto a tab to
retag it.

## Stack

- Next.js (App Router) + React + Tailwind
- Firebase Auth (Google sign-in) + Firestore
- Claude (Anthropic API) for auto-tagging new tasks
- PWA (installable, via next-pwa)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Requires a `.env` with Firebase
and `ANTHROPIC_API_KEY` config (see `lib/firebase.ts` and `app/api/tag/route.ts` for
the expected variable names).

## Deploy

Connected to Vercel — pushes to `main` deploy automatically.
