import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src", "cli.mjs");
function run(args, env = {}) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
}
test("help prints supported commands", () => {
  const result = run(["help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /doctor/);
  assert.match(result.stdout, /plan/);
  assert.match(result.stdout, /does not execute generated shell commands/);
});
test("plan returns a human-reviewable plan", () => {
  const result = run(["plan", "Build a todo app"]);
  assert.equal(result.status, 0);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.task, "Build a todo app");
  assert.equal(plan.approvalRequiredBeforeExecution, true);
  assert.ok(plan.steps.length >= 4);
});
test("init creates a safe starter manifest and refuses overwrite", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "velcli-test-"));
  const project = path.join(temp, "sample");
  try {
    const first = run(["init", project]);
    assert.equal(first.status, 0, first.stderr);
    const manifest = JSON.parse(await readFile(path.join(project, "velcli.project.json"), "utf8"));
    assert.equal(manifest.agent.autoExecute, false);
    assert.equal(manifest.safety.requireHumanApproval, true);
    const second = run(["init", project]);
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /Refusing to overwrite/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
test("chat fails clearly when API key is absent", () => {
  const result = run(["chat", "hello"], { OPENAI_API_KEY: "" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OPENAI_API_KEY is missing/);
});
