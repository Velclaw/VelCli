# VelCli — Velclaw

VelCli is an early-stage autonomous engineering-agent platform. Current implementation includes:
- Shared Agent Core with model routing and approval events.
- Protected Studio login using a single administrator password.
- Per-login workspace roots, filesystem file APIs, conversation history and project metadata.
- Static HTML preview, AI code review, and design-brief-to-code orchestration.
- Restricted terminal command allowlist (build, test, typecheck, git status/diff, version checks).
- API request limits, path traversal checks, security response headers, and GitHub Actions CI.

## Deploy
- Build: `npm install && npm run build`
- Start: `npm run dev`
- Set a strong unique `VELCLI_ADMIN_PASSWORD` in Render before using write APIs.
- Configure `GEMINI_API_KEY` and `VELCLI_PROVIDER=gemini`.

## Important limitations
- History and project metadata use Postgres when `DATABASE_URL` is configured; otherwise they fall back to a local JSON file. On Render Free, the local file and workspace files are ephemeral. Postgres does not persist generated workspace files; use a persistent disk or object storage for those.
- Sessions are in-memory and expire on process restart. Login is a shared administrator password, not multi-user OAuth/RBAC.
- Restricted commands are not a real OS/container sandbox. Do not run arbitrary untrusted workloads.
- Static preview expects `index.html`; arbitrary framework dev servers and isolated per-project deployment URLs are not yet available.
- GitHub clone/push, Postgres-backed history/project metadata (optional via `DATABASE_URL`), basic workspace file editing, active project isolation, multi-user identity, full IDE, real sandboxing, host/hub/cloud orchestration, Termux pairing, and end-to-end production validation have different levels of completion; see the configured environment and limitations above.
