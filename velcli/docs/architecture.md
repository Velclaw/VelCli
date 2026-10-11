# VelCli Build architecture

## Current implementation

The CLI entry point is src/cli.mjs. It provides local diagnostics, project-manifest initialization, a structured Plan Mode starter, and an optional OpenAI-compatible chat request. src/runtime/policy.mjs provides a small default-deny permission decision function for future agent tools. Neither module launches generated code or shell commands.

## Intended runtime boundaries

- **Orchestrator:** owns task state, cancellation, budgets, retries, and lifecycle transitions.
- **Planner:** emits a typed plan with acceptance criteria and risk labels. Planning must not cause side effects.
- **Tool registry:** registers tools with schemas and capability labels. Unknown capabilities are denied.
- **Approval service:** stores actor, reason, capability, timestamp, and task/run identifier for human-approved side effects.
- **Workspace service:** resolves paths under a workspace root and rejects traversal/symlink escapes.
- **Execution adapter:** future isolated worker/container only. Never run untrusted generated code in the API process.
- **Persistence:** PostgreSQL stores projects, sessions, messages, jobs, and audit events. Secrets belong in deployment secret storage, not these tables.
- **Integrations:** GitHub, MCP, plugins, skills, hooks, and web search are adapters with explicit permissions, timeouts, and audit events.

## Job lifecycle

queued -> planning -> awaiting_approval -> running -> validating -> succeeded | failed | cancelled

A plan-only job may finish after planning. A state transition to running must not happen without the configured approval gate and a supported isolated execution adapter. Terminal states are immutable except for separately recorded retry attempts.

## Sandbox requirements before execution support

A real sandbox needs a separate process/container boundary, non-root identity, CPU/memory/time limits, bounded disk, explicit network policy, secret isolation, output truncation, cancellation, and cleanup after every job. A command allowlist by itself is not a security boundary.

## Planned extension points

- **Subagents:** bounded child runs with scoped context and budgets.
- **Skills:** versioned instruction bundles with declared tool requirements.
- **Plugins/MCP:** explicit tool schemas and per-capability grants.
- **Hooks:** lifecycle events with timeouts and non-secret payloads.
- **Git/review:** status, diff, patch checks, and human-reviewed commits/PRs.
- **Memory/web search:** opt-in retrieval with provenance and per-project scope.
- **Headless mode:** deterministic JSON output and exit codes for CI.
- **PostgreSQL:** migrations, ownership boundaries, retention, and read-after-write health checks.

These are architecture targets, not claims that every subsystem is already implemented or production-ready.
