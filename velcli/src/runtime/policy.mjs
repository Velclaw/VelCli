const SIDE_EFFECTS = new Set(["workspace.write", "shell.execute", "network.request", "git.commit", "deployment.create"]);
const KNOWN_CAPABILITIES = new Set(["workspace.read", ...SIDE_EFFECTS]);

export function evaluateToolRequest(request, policy = {}) {
  if (!request || typeof request !== "object") return { allowed: false, reason: "Invalid tool request." };
  const capability = request.capability;
  if (typeof capability !== "string" || !KNOWN_CAPABILITIES.has(capability)) {
    return { allowed: false, reason: "Unknown capability; deny by default." };
  }
  const mode = policy.mode || "plan";
  if (mode === "plan" && capability !== "workspace.read") {
    return { allowed: false, reason: "Plan mode blocks side effects." };
  }
  if (SIDE_EFFECTS.has(capability)) {
    const approved = Array.isArray(policy.approvedCapabilities) && policy.approvedCapabilities.includes(capability);
    if (!approved) return { allowed: false, reason: "Explicit human approval is required for this capability." };
  }
  return { allowed: true, reason: "Capability permitted by the current policy." };
}

export function createApprovalRecord({ capability, approvedBy, reason }) {
  if (!SIDE_EFFECTS.has(capability)) throw new Error("Approval records are only for side-effect capabilities.");
  if (typeof approvedBy !== "string" || !approvedBy.trim()) throw new Error("approvedBy is required.");
  if (typeof reason !== "string" || !reason.trim()) throw new Error("A reason is required for the audit record.");
  return Object.freeze({
    schemaVersion: 1,
    capability,
    approvedBy: approvedBy.trim(),
    reason: reason.trim(),
    approvedAt: new Date().toISOString()
  });
}
