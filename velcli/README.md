# VelCli Build CLI

A standalone Node.js 20+ command-line starter for the Velclaw AI engineering workspace. This package lives in the velcli/ directory of [Velclaw/VelCli](https://github.com/Velclaw/VelCli) and does not replace the existing web application.

## Quick start

From the repository root:

\`\`\`bash
cd velcli
npm test
node src/cli.mjs help
node src/cli.mjs doctor
node src/cli.mjs init ../example-project
node src/cli.mjs plan "Add a persistent project history"
\`\`\`

Optional model chat uses an OpenAI-compatible Chat Completions endpoint:

\`\`\`bash
export OPENAI_API_KEY="set-this-in-your-shell-or-secret-manager"
export OPENAI_BASE_URL="https://api.openai.com/v1"
export VELCLI_MODEL="gpt-4o-mini"
node src/cli.mjs chat "Review the architecture for a secure project workspace"
\`\`\`

Use provider-specific base URLs and model identifiers only when supported by that provider. Never put credentials in source files, project manifests, commits, screenshots, or chat transcripts.

## Commands

- help, version: usage information.
- doctor: checks Node runtime and whether model configuration is present. It does not test a provider network request.
- init [directory]: creates velcli.project.json without overwriting an existing manifest.
- plan "<task>": emits a structured starter plan for human review.
- chat "<prompt>": sends a prompt to the configured OpenAI-compatible endpoint.

## Security boundary

This is an initial CLI foundation, not a complete autonomous coding runtime. It deliberately does not execute generated code or shell commands, create a sandbox, or claim subagent/MCP/plugin support. Do not expose API keys to browser code. A production execution runtime must add isolated per-job containers, resource/network limits, explicit permission grants, audit logging, cancellation, and human approval before enabling command execution.

## Roadmap

1. Agent runtime contracts and structured tool-call approvals.
2. Workspace file operations with path traversal protection.
3. Isolated execution adapter and job lifecycle.
4. Persistent sessions and project metadata in PostgreSQL.
5. Skills, plugins, MCP, hooks, and subagent orchestration.
6. Git status/diff/review workflows.
7. CI integration and deployment health checks.
