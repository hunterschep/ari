import { z } from "zod";
import { CanonicalListingSchema } from "./listing";
import { ListingScoreSchema } from "./search";

export const ListingPipelineStatusSchema = z.enum([
  "NEW_MATCH",
  "DRAFTED",
  "APPROVAL_PENDING",
  "CONTACTED",
  "AWAITING_REPLY",
  "REPLIED",
  "TOUR_PROPOSED",
  "TOUR_CONFIRMED",
  "APPLICATION_REQUESTED",
  "APPLIED",
  "SKIPPED",
  "STALE",
  "PAUSED"
]);

export const TaskStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "WAITING", "DONE", "DISMISSED"]);
export const TaskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const ListingTaskSchema = z.object({
  id: z.string(),
  userId: z.string(),
  listingId: z.string().optional(),
  conversationId: z.string().optional(),
  approvalId: z.string().optional(),
  type: z.enum([
    "APPROVE_OUTREACH",
    "REPLY_TO_LANDLORD",
    "SELECT_TOUR_SLOT",
    "UPLOAD_DOCUMENT",
    "APPROVE_PACKET",
    "REVIEW_RISK",
    "FOLLOW_UP",
    "CONNECT_INTEGRATION",
    "PROFILE_GAP"
  ]),
  status: TaskStatusSchema.default("OPEN"),
  priority: TaskPrioritySchema.default("MEDIUM"),
  dueAt: z.string().optional(),
  title: z.string(),
  body: z.string().optional(),
  riskScore: z.number().min(0).max(100).default(0),
  createdBy: z.enum(["SYSTEM", "AGENT", "USER", "OPS"]).default("SYSTEM"),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ListingPipelineItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  searchSessionId: z.string(),
  listingId: z.string(),
  status: ListingPipelineStatusSchema,
  priority: TaskPrioritySchema,
  score: z.number().min(0).max(100),
  recommendation: z.string(),
  owner: z.enum(["ARI", "USER", "OPS", "LANDLORD"]).default("ARI"),
  nextAction: z.string(),
  lastOutboundAt: z.string().optional(),
  lastInboundAt: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  riskFlags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const PipelineActionSchema = z.enum([
  "DRAFT_OUTREACH",
  "APPROVE_SEND",
  "MARK_SKIPPED",
  "PAUSE_AUTOMATION",
  "REQUEST_TOUR",
  "PREPARE_PACKET",
  "SCHEDULE_FOLLOW_UP",
  "MARK_STALE"
]);

export const IntegrationProviderSchema = z.enum([
  "CLERK",
  "RENTCAST",
  "MAPBOX",
  "SENDGRID",
  "TWILIO",
  "GOOGLE_CALENDAR",
  "S3",
  "OPENAI",
  "TEMPORAL",
  "POSTGRES"
]);

export const IntegrationStatusSchema = z.enum(["CONNECTED", "DEGRADED", "DISCONNECTED", "NEEDS_CONFIG", "SANDBOX"]);

export const IntegrationConnectionSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  provider: IntegrationProviderSchema,
  status: IntegrationStatusSchema,
  mode: z.enum(["PRODUCTION", "SANDBOX", "MOCK"]).default("MOCK"),
  label: z.string(),
  scopes: z.array(z.string()).default([]),
  lastCheckedAt: z.string(),
  lastSyncedAt: z.string().optional(),
  configRequired: z.array(z.string()).default([]),
  health: z.object({
    latencyMs: z.number().optional(),
    errorRate: z.number().min(0).max(1).optional(),
    lastError: z.string().optional()
  }).default({})
});

export const SourceIngestionSchema = z.object({
  id: z.string(),
  provider: IntegrationProviderSchema,
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "PARTIAL"]),
  mode: z.enum(["PRODUCTION", "SANDBOX", "MOCK"]).default("MOCK"),
  searchSessionId: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  rowsSeen: z.number().int().nonnegative().default(0),
  rowsImported: z.number().int().nonnegative().default(0),
  rowsRejected: z.number().int().nonnegative().default(0),
  errors: z.array(z.string()).default([])
});

export const ProviderEventSchema = z.object({
  id: z.string(),
  provider: IntegrationProviderSchema,
  eventType: z.string(),
  status: z.enum(["RECEIVED", "PROCESSED", "IGNORED", "FAILED"]),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  payload: z.record(z.unknown()).default({}),
  receivedAt: z.string(),
  processedAt: z.string().optional()
});

export const WebhookEventSchema = z.object({
  id: z.string(),
  provider: IntegrationProviderSchema,
  signatureVerified: z.boolean(),
  status: z.enum(["RECEIVED", "PROCESSED", "IGNORED", "FAILED"]),
  eventType: z.string(),
  payload: z.record(z.unknown()).default({}),
  receivedAt: z.string(),
  processedAt: z.string().optional()
});

export const NotificationEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.enum(["email", "sms", "in_app"]),
  status: z.enum(["QUEUED", "SENT", "FAILED", "SKIPPED"]),
  template: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  sentAt: z.string().optional(),
  createdAt: z.string()
});

export const AgentStepSchema = z.object({
  id: z.string(),
  agentRunId: z.string(),
  stepIndex: z.number().int().nonnegative(),
  kind: z.enum(["MODEL_OUTPUT", "TOOL_PLAN", "TOOL_RESULT", "POLICY_DECISION", "APPROVAL_REQUEST", "FINAL_OUTPUT"]),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "BLOCKED", "NEEDS_APPROVAL"]),
  createdAt: z.string(),
  completedAt: z.string().optional()
});

export const ModelMessageSchema = z.object({
  id: z.string(),
  agentRunId: z.string(),
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
  tokenCount: z.number().int().nonnegative().optional(),
  redacted: z.boolean().default(false),
  createdAt: z.string()
});

export const PolicyDecisionRecordSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  agentRunId: z.string().optional(),
  toolCallId: z.string().optional(),
  allowed: z.boolean(),
  requiresApproval: z.boolean(),
  requiresAdminReview: z.boolean(),
  riskScore: z.number().min(0).max(100),
  reasonCodes: z.array(z.string()),
  redactedInput: z.unknown().optional(),
  createdAt: z.string()
});

export const DocumentShareSchema = z.object({
  id: z.string(),
  userId: z.string(),
  packetId: z.string().optional(),
  documentIds: z.array(z.string()),
  recipient: z.string(),
  shareUrl: z.string().url(),
  status: z.enum(["ACTIVE", "REVOKED", "EXPIRED"]),
  expiresAt: z.string(),
  createdAt: z.string(),
  revokedAt: z.string().optional()
});

export const DocumentAccessLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  documentId: z.string().optional(),
  shareId: z.string().optional(),
  actorType: z.enum(["USER", "ADMIN", "OPS", "RECIPIENT", "SYSTEM"]),
  actorId: z.string().optional(),
  action: z.enum(["UPLOAD", "DOWNLOAD_URL_CREATED", "SHARE_CREATED", "SHARE_VIEWED", "SHARE_REVOKED", "DELETED", "ADMIN_VIEWED"]),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string()
});

export const UserDataRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(["EXPORT", "DELETE"]),
  status: z.enum(["REQUESTED", "PROCESSING", "READY", "COMPLETED", "FAILED", "CANCELLED"]),
  requestedAt: z.string(),
  completedAt: z.string().optional(),
  exportUrl: z.string().url().optional(),
  notes: z.string().optional()
});

export const FeatureFlagSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  description: z.string().optional(),
  rolloutPercent: z.number().min(0).max(100).default(0),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const AccountSettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  authProvider: z.enum(["CLERK", "LOCAL_DEMO"]),
  clerkUserId: z.string().optional(),
  legalName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  timezone: z.string().default("America/New_York"),
  notificationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(false),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional()
  }),
  security: z.object({
    mfaEnabled: z.boolean().default(false),
    sessions: z.number().int().nonnegative().default(1),
    lastLoginAt: z.string().optional()
  }),
  dataControls: z.object({
    allowTraining: z.boolean().default(false),
    retainApplicationDocs: z.boolean().default(true),
    redactFinancialsByDefault: z.boolean().default(true)
  }),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const MapListingFeatureSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  lat: z.number(),
  lng: z.number(),
  status: ListingPipelineStatusSchema,
  score: z.number().min(0).max(100),
  price: z.number().positive(),
  title: z.string(),
  neighborhood: z.string(),
  warningCount: z.number().int().nonnegative().default(0),
  commuteMinutes: z.number().int().nonnegative().optional()
});

export const MapSearchResponseSchema = z.object({
  searchSessionId: z.string(),
  center: z.object({ lat: z.number(), lng: z.number() }),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number()
  }),
  features: z.array(MapListingFeatureSchema)
});

export const InquiryPipelineRowSchema = z.object({
  pipeline: ListingPipelineItemSchema,
  listing: CanonicalListingSchema,
  score: ListingScoreSchema.optional(),
  conversationId: z.string().optional(),
  lastMessageAt: z.string().optional()
});

export type ListingPipelineStatus = z.infer<typeof ListingPipelineStatusSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type ListingTask = z.infer<typeof ListingTaskSchema>;
export type ListingPipelineItem = z.infer<typeof ListingPipelineItemSchema>;
export type PipelineAction = z.infer<typeof PipelineActionSchema>;
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;
export type IntegrationConnection = z.infer<typeof IntegrationConnectionSchema>;
export type SourceIngestion = z.infer<typeof SourceIngestionSchema>;
export type ProviderEvent = z.infer<typeof ProviderEventSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;
export type AgentStep = z.infer<typeof AgentStepSchema>;
export type ModelMessage = z.infer<typeof ModelMessageSchema>;
export type PolicyDecisionRecord = z.infer<typeof PolicyDecisionRecordSchema>;
export type DocumentShare = z.infer<typeof DocumentShareSchema>;
export type DocumentAccessLog = z.infer<typeof DocumentAccessLogSchema>;
export type UserDataRequest = z.infer<typeof UserDataRequestSchema>;
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;
export type AccountSettings = z.infer<typeof AccountSettingsSchema>;
export type MapListingFeature = z.infer<typeof MapListingFeatureSchema>;
export type MapSearchResponse = z.infer<typeof MapSearchResponseSchema>;
export type InquiryPipelineRow = z.infer<typeof InquiryPipelineRowSchema>;
