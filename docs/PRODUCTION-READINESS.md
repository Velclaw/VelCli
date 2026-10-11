# VelCli Production Readiness and Recovery Plan

Last reviewed: 2026-10-11

This document distinguishes verified behavior from capabilities that must not be represented as production-ready until tested.

## 1. PostgreSQL preservation — highest priority

Current Render database: `velclaw-db` (`velclaw_db`), free plan, Singapore, PostgreSQL 18. Its Render metadata reports expiry at `2026-10-11T11:28:27Z` (18:28:27 Vietnam time). The database was reported as available at the last metadata check, but expiry is imminent.

Safety constraints:
- Keep the database IP allowlist unchanged; an empty allowlist is not a reason to expose PostgreSQL to the public Internet.
- Do not delete, recreate, or repoint the production database until a backup has been restored and verified.
- Do not assume a connected application or a successful `/health` response proves that a backup exists.
- The Render integration available to this workflow does not expose a verified backup/restore operation or an update-service health-check setting. Direct read-only SQL was blocked by the current connectivity/allowlist setup.

Recovery options, in order:
1. Use Render's supported dashboard backup/export and restore workflow, if available for this instance; store the dump in a separate trusted location and perform a restore test.
2. If no backup/export is available for the free instance, use an authenticated, application-level export path that reads the same database from inside the service network. Export the `velcli_store` records and `velcli_workspace_files` rows, encrypt the archive, and verify row counts and a test restore before switching databases. Never log secrets or put a dump in the Git repository.
3. Create a replacement database only after an export is secured. Migrate and restore into it, compare row counts and representative workspace files, then update the service's `DATABASE_URL` in Render and verify `/health` plus login/history/project persistence.
4. If the source has already expired or become unavailable, stop changes and check Render's recovery/support options. Do not promise recovery without a confirmed export or restorable backup.

## 2. Render health-check configuration

- The repository Blueprint declares `healthCheckPath: /health`.
- The Render service metadata has reported an empty native `healthCheckPath`.
- The external production smoke test has returned HTTP 200 and verified `ok=true`, authentication configuration, database connectivity, and workspace-file persistence at the time it ran.
- A successful external request is not proof that Render's native health-check setting is configured.

Required follow-up:
1. Open the service settings in Render and set Health Check Path to `/health`, then save.
2. Confirm the service metadata/dashboard shows `/health`.
3. Trigger or wait for the next normal deploy and confirm the service remains live.
4. Re-run the production smoke workflow.

Do not change the service's public inbound policy as part of this task; the web service and database have different exposure requirements.

## 3. Agent capability truth table

| Capability | Current evidence | Production status |
|---|---|---|
| Plan Mode | Plan endpoint/UI implemented; must keep verifying response and no-execution behavior | Implemented; regression tests required |
| `AGENTS.md` | Read into agent context with a size limit; treated as untrusted lower-priority project guidance | Implemented with trust boundary |
| Agent tool loop | Runtime supports model decisions and tool calls with a step limit | Implemented; provider/error-path tests required |
| Approval gate | Selected mutating/command tools request approval | Implemented; test rejection and timeout paths |
| Workspace isolation | AsyncLocalStorage chooses a per-session workspace path | Not a security sandbox; not sufficient for hostile code |
| Command execution | Restricted command allowlist exists | Not equivalent to an OS/container sandbox |
| Subagents | No verified orchestration/evidence of independent delegated workers | Not verified / not production-ready |
| MCP/plugins | No verified secure install, permission, lifecycle, and execution tests | Not verified / not production-ready |
| Hooks | No verified hook lifecycle and policy tests | Not verified / not production-ready |
| Background tasks | No verified durable queue, restart recovery, cancellation, and retry semantics | Not verified / not production-ready |
| CI and production smoke | Repository CI and health smoke workflow exist | Verified only for the workflow runs recorded in GitHub Actions |

Before advertising sandboxed execution, run untrusted commands inside a real OS/container boundary with non-root identity, filesystem/network limits, resource quotas, timeouts, and no production secrets. Until then, describe the runtime as a restricted command allowlist, not an isolated sandbox.

## Release gates

- [ ] A backup exists outside the source database and a restore has been tested.
- [ ] Database migration is complete and production history/projects/workspace files have been compared.
- [ ] Render native health-check setting is visibly `/health`.
- [ ] Agent capability tests cover approvals, path traversal, command allowlisting, provider failure, restart recovery, and persistence.
- [ ] Subagents, MCP/plugins, hooks, and durable background tasks remain marked unavailable until implemented and tested.
