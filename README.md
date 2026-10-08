# VelCli

**VelCli** is Velclaw's autonomous engineering agent platform.

## Architecture

`Studio → API → Agent Core → Agent Runtime → Model Router → Tools`

## Current foundation

- OpenAI-compatible model router
- Autonomous multi-step runtime
- Safe workspace file read/write/list tools
- Controlled terminal tool with destructive-command blocking
- Agent event model
- Web Studio foundation
- API health and agent endpoint

## Environment

Configure `.env` from `.env.example`:

```env
VELCLI_API_KEY=
VELCLI_BASE_URL=https://api.openai.com/v1
VELCLI_MODEL=
VELCLI_WORKSPACE=.
PORT=8787
```

## Run

```bash
npm install
npm run check
npm run dev
```

VelCli is being built toward Agent, IDE, Review, Design, Build, Deploy, Host, Hub, Cloud and Termux surfaces under Velclaw.