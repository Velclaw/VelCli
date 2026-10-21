# VelCli — Repository Baseline Audit

**Audit date:** 2026-10-22  
**Scope:** Read-only inspection of the default branch and existing documentation/source.  
**Limitations:** No commands were run in a local checkout in this audit. No production endpoint, Render service, database, secrets, or runtime configuration was modified. This document records source-level observations, not a passing test or production certification.

## Confirmed repository structure

- Root package scripts provide check, build, test, and start commands.
- API entrypoint: apps/api/src/index.ts.
- Agent packages exist: packages/agent-core, packages/agent-runtime, packages/agent-tools, packages/model-router, and packages/shared.
- CLI exists under velcli/src with tests under velcli/test.
- Existing CI workflow runs Node.js 22, npm install, typecheck, build, and tests.
- Existing production smoke script exercises root HTML, health, authentication, Plan Mode, and authenticated backup export.
- Shared visual stylesheet assets/ocode-design-system.css is present on main after PR #5 merged.

## Findings and required follow-up

### P0 — Verify database and backup state immediately

docs/PRODUCTION-READINESS.md says the last known Render database expiry time was 2026-10-11 and describes backup/restore as unverified at that time. That note is now stale relative to this audit date. It does not establish the current database status.

**Action:** Verify current Render database status and backup availability through the authorized dashboard/workflow. Preserve the current database and its allowlist. Do not repoint DATABASE_URL, delete/create a database, expose PostgreSQL publicly, or run destructive migrations until a backup/export is restored and verified.

### P1 — Session durability and multi-instance behavior

apps/api/src/index.ts stores active sessions in a process-local Map. Source inspection therefore indicates that sessions are not durable across process restart and are not automatically shared across multiple instances.

**Action:** Add regression tests for restart/session behavior and choose a durable, revocable session store before multi-instance scaling. Do not silently change auth behavior without tests.

### P1 — Persistence fallback and workspace guarantees

The API supports PostgreSQL-backed structured records when DATABASE_URL is configured and a filesystem fallback otherwise. Workspace operations use a configured workspace root. This source layout alone does not prove the deployed service has durable disk or that every write/read survives a restart.

**Action:** Verify actual deployment configuration, write/read representative history/project/settings/workspace data, restart only in a safe test environment, and confirm persistence. Never use production test data destructively.

### P1 — Workspace boundary and execution isolation

packages/agent-tools/src/index.ts resolves paths under a workspace root and restricts command execution with an allowlist, output cap, and timeout. Source inspection shows these guardrails; it does not establish a complete OS/container sandbox. Symlink behavior and all edge cases require dedicated tests.

**Action:** Add tests for traversal, symlink escape, output limits, timeout, rejected commands, and approval rejection. Keep arbitrary shell execution disabled. Design stronger isolation as a separate adapter and only deploy it when a permitted runtime is available.

### P1 — Agent lifecycle and provider failure paths

packages/agent-runtime/src/index.ts has a bounded step count, context limit, provider retry logic, tool definitions, and approval-aware tool policy. packages/model-router supports multiple provider configurations. These features need regression coverage for malformed provider responses, exhausted retries, denied approvals, cancellation, and terminal event consistency.

**Action:** Add focused tests before adding subagents, plugins, or durable jobs. Do not represent unverified subagents, hooks, or durable background tasks as production-ready.

### P2 — CI hardening and repeatability

.github/workflows/ci.yml currently uses actions/checkout@v4 and actions/setup-node@v4 tags and runs npm install. The current workflow is functional in design, but the tags are not immutable full commit SHAs.

**Action:** Pin GitHub Actions to verified full-length commit SHAs, keep versions updated deliberately, and consider npm ci where the lockfile is authoritative. Run CI after changes and record actual results.

### P2 — Feature truthfulness in the UI

README.md explicitly cautions that some areas may be UI-only or incomplete, and distinguishes links to VelclawHost from a verified deployment integration.

**Action:** Keep that distinction. For each IDE, preview, plugin, MCP, background-task, and deploy control, verify the backend route and authorization before presenting it as operational.

## Baseline test commands

Run these in a disposable checkout or CI branch, not on production data:

1. npm ci
2. npm run check
3. npm run build
4. npm test

Record the commit SHA, command, exit status, and relevant failure summary. A source audit is not a substitute for these results.

## Recommended next implementation PRs

1. Add security regression tests for API auth/ownership and agent tool policy.
2. Add workspace traversal/symlink/command-timeout tests and address confirmed failures.
3. Add session and persistence integration tests with an isolated test database or temporary filesystem.
4. Pin CI actions to verified full SHAs and use lockfile-consistent installs.
5. Improve task lifecycle events and cancellation only after defining the contract and tests.

## Safety boundary

This audit did not modify production, database configuration, secrets, paid resources, or the main branch. Any database recovery/switch, deployment, merge, or infrastructure expansion requires a separate explicit approval.