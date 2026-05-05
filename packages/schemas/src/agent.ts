import { z } from "zod";

export const UserRoleSchema = z.enum(["RENTER", "ADMIN", "OPS", "DEVELOPER"]);

export const UserConsentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    "SEND_EMAIL_OUTREACH",
    "SEND_SMS_OUTREACH",
    "AUTO_BOOK_TOUR",
    "SEND_APPLICATION_PACKET",
    "READ_CALENDAR",
    "WRITE_CALENDAR"
  ]),
  status: z.enum(["GRANTED", "REVOKED"]),
  scope: z.enum(["ONE_TIME", "SESSION", "ONGOING"]),
  constraints: z.object({
    maxMessagesPerDay: z.number().int().positive().optional(),
    allowedChannels: z.array(z.enum(["email", "sms", "whatsapp"])).optional(),
    requireApprovalAboveRiskScore: z.number().min(0).max(100).optional(),
    allowedTemplates: z.array(z.string()).optional()
  }).default({}),
  grantedAt: z.string(),
  revokedAt: z.string().optional()
});

export const ApprovalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    "SEND_FIRST_MESSAGE",
    "SEND_FOLLOW_UP",
    "SEND_SMS",
    "CONFIRM_TOUR",
    "SHARE_APPLICATION_PACKET",
    "DISCLOSE_FINANCIAL_INFO",
    "FLAGGED_COMPLIANCE_RESPONSE"
  ]),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED"]),
  title: z.string(),
  body: z.string(),
  payload: z.unknown(),
  riskScore: z.number().min(0).max(100),
  expiresAt: z.string().optional(),
  approvedAt: z.string().optional(),
  rejectedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const AgentRunSchema = z.object({
  id: z.string(),
  workflowId: z.string().optional(),
  agentName: z.string(),
  userId: z.string().optional(),
  searchSessionId: z.string().optional(),
  listingId: z.string().optional(),
  status: z.enum(["RUNNING", "SUCCEEDED", "FAILED", "BLOCKED", "NEEDS_APPROVAL"]),
  input: z.unknown(),
  output: z.unknown().optional(),
  model: z.string(),
  promptVersion: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  error: z.string().optional()
});

export const ToolCallSchema = z.object({
  id: z.string(),
  agentRunId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
  output: z.unknown().optional(),
  status: z.enum(["PENDING", "APPROVED", "EXECUTED", "FAILED", "BLOCKED"]),
  riskScore: z.number().min(0).max(100),
  approvalId: z.string().optional(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
  executedAt: z.string().optional()
});

export const PolicyDecisionSchema = z.object({
  allowed: z.boolean(),
  requiresApproval: z.boolean(),
  requiresAdminReview: z.boolean(),
  riskScore: z.number().min(0).max(100),
  reasonCodes: z.array(z.string()),
  redactedInput: z.unknown().optional()
});

export const ComplianceFlagSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  listingId: z.string().optional(),
  conversationId: z.string().optional(),
  flagType: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
  details: z.record(z.unknown()).default({}),
  createdAt: z.string(),
  resolvedAt: z.string().optional()
});

export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserConsent = z.infer<typeof UserConsentSchema>;
export type Approval = z.infer<typeof ApprovalSchema>;
export type AgentRun = z.infer<typeof AgentRunSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
export type ComplianceFlag = z.infer<typeof ComplianceFlagSchema>;
