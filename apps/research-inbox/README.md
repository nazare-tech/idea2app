# Research Inbox

Independent local-first research triage website. It uses Maker Compass's warm editorial styling, but has its own neutral identity, Next.js package, server, APIs, and JSON data.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4310/`. Durable data is created at `.local/research-inbox.json`; no Supabase project or authentication is required.

Useful checks: `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

Reply generation requires a configured local `codex` executable on `PATH`, or `RESEARCH_CODEX_PATH` pointing to it. The app copies the generated draft and opens the stored HTTPS source in the selected browser; the user performs and confirms the public post.
