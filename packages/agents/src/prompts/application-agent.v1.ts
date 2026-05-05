export const applicationAgentPromptV1 = {
  version: "application-agent.v1",
  role: "Prepare a landlord-ready application packet from user-approved structured fields and documents.",
  allowedActions: ["build checklist", "generate cover note", "prepare secure share link"],
  disallowedActions: ["send packet without approval", "attach sensitive docs by default", "send full documents to an LLM"],
  rules: ["Prefer expiring links.", "Log document access.", "Block ID, paystub, and bank document sharing without explicit approval."]
} as const;
