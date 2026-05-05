import type { AutomationPolicy, PolicyDecision, UserConsent } from "@ari/schemas";

export type PolicyInput = {
  toolName: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  input: Record<string, unknown>;
  automationPolicy?: AutomationPolicy;
  consents?: UserConsent[];
};

export function evaluatePolicy(params: PolicyInput): PolicyDecision {
  const reasonCodes: string[] = [];
  let riskScore = riskLevelScore(params.riskLevel);
  let requiresApproval = params.riskLevel === "HIGH" || params.riskLevel === "CRITICAL";
  let requiresAdminReview = false;
  let allowed = true;

  const inputString = JSON.stringify(params.input).toLowerCase();

  if (inputString.includes("paystub") || inputString.includes("bank_statement") || inputString.includes("id document")) {
    riskScore = Math.max(riskScore, 85);
    requiresApproval = true;
    reasonCodes.push("SENSITIVE_DOCUMENT_SHARING");
  }

  if (inputString.includes("income") || inputString.includes("employer")) {
    riskScore = Math.max(riskScore, 72);
    requiresApproval = true;
    reasonCodes.push("FINANCIAL_INFO_DISCLOSURE");
  }

  if (params.toolName === "sendSms" || params.toolName === "sendWhatsapp") {
    const consent = params.consents?.find((candidate) => candidate.type === "SEND_SMS_OUTREACH" && candidate.status === "GRANTED");
    if (!consent) {
      allowed = false;
      reasonCodes.push("SMS_CONSENT_MISSING");
    }
    requiresApproval = true;
  }

  if (params.toolName === "sendApplicationPacket") {
    requiresApproval = true;
    if (!params.consents?.some((candidate) => candidate.type === "SEND_APPLICATION_PACKET" && candidate.status === "GRANTED")) {
      reasonCodes.push("APPLICATION_PACKET_APPROVAL_REQUIRED");
    }
  }

  if (params.toolName === "confirmTour" && params.automationPolicy?.requireApprovalFor.tourConfirmation !== false) {
    requiresApproval = true;
    reasonCodes.push("TOUR_CONFIRMATION_APPROVAL_REQUIRED");
  }

  if (params.riskLevel === "CRITICAL") {
    requiresApproval = true;
    requiresAdminReview = true;
    if (inputString.includes("money") || inputString.includes("wire") || inputString.includes("crypto")) {
      allowed = false;
      reasonCodes.push("PAYMENT_INSTRUCTION_BLOCKED");
    }
  }

  if (reasonCodes.length === 0) reasonCodes.push(requiresApproval ? "APPROVAL_REQUIRED" : "POLICY_ALLOWED");

  return {
    allowed,
    requiresApproval,
    requiresAdminReview,
    riskScore,
    reasonCodes
  };
}

function riskLevelScore(level: PolicyInput["riskLevel"]): number {
  switch (level) {
    case "LOW":
      return 15;
    case "MEDIUM":
      return 42;
    case "HIGH":
      return 75;
    case "CRITICAL":
      return 95;
  }
}
