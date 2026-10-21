# VelCli — 8-Step Scale-Up Roadmap

**Status:** Proposed execution plan, grounded in the repository audit on 2026-10-22  
**Target:** Move VelCli from an early AI engineering workspace toward a reliable, secure, extensible AI development platform.  
**Operating rule:** Ship small pull requests with verifiable acceptance criteria. Do not deploy production, change database targets, create paid resources, or modify secrets as part of this roadmap without explicit approval.

## Product direction

VelCli should let a developer start from a natural-language task, inspect and edit a project, run tests in a bounded workspace, review the diff, and open a safe GitHub pull request. Hosting/deployment integrations remain separate capabilities and must require explicit approval.

Reuse the visual design language and reusable UI patterns already introduced from OCode.js; do not copy OCode.js articles, page copy, or product content. VelCli keeps its own identity, workflows, and domain model.

## Step 1 — Establish a verified baseline
**Work**
- Record current repository layout, CI jobs, API health/auth, agent packages, workspace persistence, and hosting assumptions.
- Distinguish implemented behavior from UI-only or unverified features.
- Establish a repeatable local test sequence and a small regression suite.
**Acceptance**
- Run npm run check, npm run build, and npm test and record actual results.
- Production smoke checks are only reported as passed when workflow output confirms it.
- Risks are tracked without exposing secrets or private connection strings.

## Step 2 — Protect data and persistence
**Work**
- First determine whether the configured PostgreSQL instance and any recoverable backup still exist.
- Export/restore-test data through an approved, authenticated path before any database switch.
- Verify persistence for history, projects, settings, and workspace files, including after process restart.
- Define a retention and backup/restore runbook.
**Acceptance**
- A restore test is documented with record counts and representative workspace-file checks.
- No database is deleted, recreated, repointed, or made public as a shortcut.
- Filesystem persistence is not presented as durable unless deployment provides durable storage.
**Gate:** If source database or backup state is uncertain, stop and recover/verify first; do not proceed with migrations.

## Step 3 — Harden API and identity
**Work**
- Review authentication/session lifetime, cookie flags, login throttling, request-size limits, ownership checks, CORS/CSRF/origin behavior, and trusted-proxy assumptions.
- Verify every private route rejects unauthenticated requests and every project resource enforces owner scope.
- Add regression tests for auth failure, expired sessions, invalid inputs, and cross-user access.
**Acceptance**
- Security tests cover unauthenticated, unauthorized, malformed, and rate-limited requests.
- Secrets are only read server-side from environment/secret storage and redacted from logs.
- No change weakens existing authentication protections.

## Step 4 — Make Agent Core predictable
**Work**
- Keep one shared agent runtime for Web, CLI, and future clients.
- Standardize task lifecycle events, tool schemas, timeout/retry behavior, context limits, and cancellation.
- Preserve approval gates for file writes and command execution.
- Make plan-only mode provably read-only; test tool-call denial and malformed model responses.
**Acceptance**
- Each run has a traceable run ID and terminal state (completed, failed, or cancelled).
- Tool errors and model-provider errors are actionable and redacted.
- No model output can bypass tool policy or approval checks.

## Step 5 — Isolate workspace execution
**Work**
- Treat the current path-scoped workspace and command allowlist as guardrails, not a security sandbox.
- Add tests for path traversal, symlink escape, oversized files/output, command rejection, timeout, and approval rejection.
- Design a replaceable execution adapter so an OS/container sandbox can be added when an approved runtime exists.
- Do not execute untrusted generated code inside the API process.
**Acceptance**
- All filesystem operations remain within the intended workspace, including symlink edge cases.
- Disallowed commands fail closed; command timeouts and output limits are enforced.
- Product UI/docs accurately state that the current allowlist is not full isolation.

## Step 6 — Deliver a useful browser IDE
**Work**
- Improve file tree, editor state, unsaved-change indication, diff review, task streaming, logs, and responsive mobile layout.
- Add preview only through a clearly isolated and permissioned route/origin.
- Make UI state reflect backend truth; avoid decorative controls that imply unsupported actions.
**Acceptance**
- A user can inspect files, ask the agent to edit, review the diff, run tests, and see the actual result.
- Errors, pending approvals, cancellations, and empty states are visible and accessible.
- Existing VelCli content and routes remain intact; no OCode.js articles are copied.

## Step 7 — Add safe GitHub and CI/CD workflows
**Work**
- Use least-privilege GitHub permissions and short-lived credentials where available.
- Let users inspect changes and create a branch/commit/PR after explicit approval.
- Run typecheck, build, tests, dependency/security checks, and report CI results.
- Keep production deployment and PR merging behind explicit human approval.
**Acceptance**
- No automatic merge or production deploy occurs without an explicit user-approved action.
- Failed CI is summarized with failing job and relevant logs, with secrets redacted.
- PR creation is idempotent or detects an existing matching PR.

## Step 8 — Extend the ecosystem and scale from evidence
**Work**
- Add typed extension contracts for skills/MCP/plugins, explicit capability permissions, versioning, and audit logs.
- Add durable background tasks only with defined retry, cancellation, heartbeat, idempotency, and recovery behavior.
- Measure queue depth, task completion, error rate, p95 latency, resource use, and provider cost before scaling.
- Keep hosting control-plane integrations (such as VelclawHost) behind an explicit, authenticated integration boundary.
**Acceptance**
- Extensions run with bounded permissions, timeouts, and resource budgets; untrusted extensions cannot access secrets by default.
- Background jobs recover safely after restart and avoid duplicate side effects.
- New infrastructure is added only after measured need and approval; default path remains free-first.

## Release gates
1. Code changes are on a focused branch and reviewed in a pull request.
2. CI and relevant regression tests have actually passed.
3. Data/secret impact is documented and no unsafe database change was made.
4. UI labels and documentation match real backend capability.
5. Production deployment is separately approved.

## Suggested implementation order
1. Baseline audit and data-recovery verification.
2. API/security regression coverage.
3. Agent runtime/tool-policy tests.
4. Workspace boundary tests and execution adapter design.
5. Persistence verification and recovery runbook.
6. IDE workflows that expose real agent/task state.
7. GitHub PR workflow and CI reporting.
8. Extension contracts, durable jobs, and metrics-driven scaling.

This roadmap is intentionally staged: it does not claim all eight workstreams are implemented by the existence of this document.