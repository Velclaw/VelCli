import test from "node:test";
import assert from "node:assert/strict";
import { createApprovalRecord, evaluateToolRequest } from "../src/runtime/policy.mjs";

test("plan mode allows read-only requests and blocks side effects", () => {
  assert.equal(evaluateToolRequest({ capability: "workspace.read" }).allowed, true);
  const result = evaluateToolRequest({ capability: "workspace.write" }, { mode: "plan" });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /Plan mode/);
});

test("unknown capabilities are denied by default", () => {
  assert.equal(evaluateToolRequest({ capability: "shell.anything" }, { mode: "execute" }).allowed, false);
});

test("side effects require explicit capability approval", () => {
  assert.equal(evaluateToolRequest({ capability: "shell.execute" }, { mode: "execute" }).allowed, false);
  assert.equal(evaluateToolRequest({ capability: "shell.execute" }, {
    mode: "execute", approvedCapabilities: ["shell.execute"]
  }).allowed, true);
});

test("approval record requires actor and reason", () => {
  assert.throws(() => createApprovalRecord({ capability: "shell.execute", approvedBy: "", reason: "test" }), /approvedBy/);
  const record = createApprovalRecord({ capability: "shell.execute", approvedBy: "user", reason: "run reviewed tests" });
  assert.equal(record.capability, "shell.execute");
  assert.equal(record.approvedBy, "user");
  assert.ok(record.approvedAt);
});
