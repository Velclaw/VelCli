#!/usr/bin/env node
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const VERSION = "0.1.0";
const HELP = "VelCli Build " + VERSION + "\nAI engineering CLI\n\n" +
"Usage:\n  velcli help                 Show this help\n  velcli version              Print version\n  velcli doctor               Check runtime and provider configuration\n  velcli init [directory]     Create a starter project manifest\n  velcli plan <task>          Create a structured implementation plan\n  velcli chat <prompt>        Ask a configured OpenAI-compatible model\n\n" +
"Environment:\n  OPENAI_API_KEY              API key (keep it out of source control)\n  OPENAI_BASE_URL             Optional API base URL (default: https://api.openai.com/v1)\n  VELCLI_MODEL                Model name (default: gpt-4o-mini)\n\n" +
"Safety:\n  This starter does not execute generated shell commands or code.\n  Review plans and generated code before running them.\n";
function print(message = "") { process.stdout.write(message + "\n"); }
function fail(message, code = 1) { process.stderr.write("Error: " + message + "\n"); process.exitCode = code; }
function safeBaseUrl(value) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("OPENAI_BASE_URL must use HTTP(S).");
  return url.toString().replace(/\/$/, "");
}
async function doctor() {
  print("VelCli doctor");
  print("✓ Node.js " + process.versions.node);
  print("✓ Platform " + process.platform + "/" + process.arch);
  print("• Model: " + (process.env.VELCLI_MODEL || "gpt-4o-mini"));
  print("• API key: " + (process.env.OPENAI_API_KEY ? "configured" : "not configured"));
  try { print("• API base: " + safeBaseUrl(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1")); }
  catch (error) { fail(error.message); }
  if (!process.env.OPENAI_API_KEY) print("Tip: set OPENAI_API_KEY in your shell or secret manager before using chat.");
}
async function init(args) {
  const target = path.resolve(args[0] || "velcli-project");
  await mkdir(target, { recursive: true });
  const manifestPath = path.join(target, "velcli.project.json");
  try {
    await access(manifestPath, constants.F_OK);
    fail("Refusing to overwrite existing file: " + manifestPath);
    return;
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const manifest = {
    schemaVersion: 1, name: path.basename(target), createdAt: new Date().toISOString(),
    agent: { mode: "plan", autoExecute: false },
    safety: { executeGeneratedCode: false, requireHumanApproval: true }
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  print("Created " + manifestPath);
  print('Next: review the manifest, then run velcli plan "your task".');
}
function plan(task) {
  if (!task.trim()) throw new Error("Usage: velcli plan <task>");
  print(JSON.stringify({
    task, mode: "plan",
    steps: [
      "Inspect the existing repository and identify constraints.",
      "Define acceptance criteria and the smallest coherent change.",
      "Implement the change in reviewable increments.",
      "Run relevant tests, type checks, and build validation.",
      "Review the diff for secrets, unsafe execution, and regressions."
    ],
    approvalRequiredBeforeExecution: true,
    generatedAt: new Date().toISOString()
  }, null, 2));
}
async function chat(prompt) {
  if (!prompt.trim()) throw new Error("Usage: velcli chat <prompt>");
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is missing. Configure it in your environment; do not commit it.");
  const base = safeBaseUrl(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1");
  const model = process.env.VELCLI_MODEL || "gpt-4o-mini";
  const response = await fetch(base + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are VelCli Build, a careful software engineering assistant. Explain assumptions, prefer small verifiable changes, never claim to have run tools you did not run, and do not expose secrets." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    }),
    signal: AbortSignal.timeout(60000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Model request failed: " + (body?.error?.message || ("HTTP " + response.status)));
  const answer = body?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) throw new Error("The provider returned no text response.");
  print(answer.trim());
}
async function main() {
  const [command = "help", ...args] = process.argv.slice(2);
  try {
    switch (command) {
      case "help": case "--help": case "-h": print(HELP); break;
      case "version": case "--version": case "-v": print(VERSION); break;
      case "doctor": await doctor(); break;
      case "init": await init(args); break;
      case "plan": plan(args.join(" ")); break;
      case "chat": await chat(args.join(" ")); break;
      default: fail('Unknown command "' + command + '". Run "velcli help".', 2);
    }
  } catch (error) { fail(error instanceof Error ? error.message : String(error)); }
}
await main();
