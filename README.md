# VelCli

**VelCli** is Velclaw's autonomous engineering agent platform.

## Production

- Studio/API: https://velcli.onrender.com
- Health: https://velcli.onrender.com/health
- Provider status: https://velcli.onrender.com/api/models

## Architecture

`Studio → API → Agent Runtime → Model Router → Workspace Tools`

## Current implementation

- Responsive web Studio with live Server-Sent Events timeline
- Provider router for OpenAI, Gemini, Anthropic, Groq, OpenRouter and OpenAI-compatible endpoints
- Multi-step tool-calling agent with bounded steps and model retries
- Workspace file read/write/list and Git status/diff tools
- Build/test and terminal tools with approval gates
- Explicit approve/reject UI for pending actions
- Health/model endpoints and Render deployment
- CI checks for TypeScript, build and test

## Configure

Set these variables in Render Environment (GitHub repository secrets do not automatically sync to Render):

```env
VELCLI_PROVIDER=gemini
GEMINI_API_KEY=
VELCLI_GEMINI_MODEL=gemini-2.5-flash
VELCLI_WORKSPACE=.
VELCLI_MAX_STEPS=12
VELCLI_APPROVAL_TIMEOUT_MS=300000
PORT=8787
```

Never commit API keys. Provider status reports only whether a provider is configured, never the key.

## Run locally

```bash
npm install
npm run check
npm run build
npm test
npm run dev
```

## Agent tools

- `fs.read`, `fs.list`, `fs.write`
- `git.status`, `git.diff`
- `build.run`, `test.run`
- `terminal.exec` (requires approval)

## Product roadmap

The longer-term roadmap includes isolated per-project workspaces, authentication and persistence, IDE/editor, live app preview, GitHub pull-request automation, code review, design-to-code, build/deploy pipelines, VelCliHost, VelCliHub, cloud workspaces and Termux agents. These are not considered complete until implemented and production-tested.

## Security status

Current workspace path checks and approval gates are an initial safety layer, not a hardened multi-tenant sandbox. Do not expose this service to untrusted users or arbitrary public workloads until terminal execution is isolated with OS/container boundaries, resource limits and authentication.
