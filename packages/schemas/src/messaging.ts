import { z } from "zod";
import { ProposedSlotSchema } from "./common";

export const MessageChannelSchema = z.enum(["email", "sms", "whatsapp"]);
export const MessageIntentSchema = z.enum([
  "AVAILABLE",
  "UNAVAILABLE",
  "TOUR_SLOTS_PROPOSED",
  "ASKING_FOR_USER_INFO",
  "APPLICATION_REQUESTED",
  "FEE_DISCLOSURE",
  "PRICE_NEGOTIATION",
  "SCAM_RISK",
  "OTHER"
]);

export const ConversationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  listingId: z.string(),
  contactId: z.string(),
  channel: MessageChannelSchema,
  status: z.enum(["OPEN", "AWAITING_LANDLORD", "NEEDS_USER", "CLOSED", "ESCALATED"]).default("OPEN"),
  lastMessageAt: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  direction: z.enum(["OUTBOUND", "INBOUND"]),
  channel: MessageChannelSchema,
  from: z.string(),
  to: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  normalizedBody: z.string(),
  provider: z.string().optional(),
  providerMessageId: z.string().optional(),
  intent: MessageIntentSchema.optional(),
  extracted: z.record(z.unknown()).default({}),
  sentAt: z.string().optional(),
  receivedAt: z.string().optional(),
  createdAt: z.string()
});

export const MessageDraftSchema = z.object({
  id: z.string(),
  conversationId: z.string().optional(),
  listingId: z.string(),
  contactId: z.string().optional(),
  body: z.string(),
  subject: z.string().optional(),
  generatedByAgentRunId: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "REJECTED", "BLOCKED"]),
  riskScore: z.number().min(0).max(100),
  approvalId: z.string().optional(),
  includedSensitiveInfo: z.boolean().default(false),
  recommendedChannel: MessageChannelSchema.default("email"),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const InboundMessageParseSchema = z.object({
  intent: MessageIntentSchema,
  extracted: z.object({
    proposedTourSlots: z.array(ProposedSlotSchema).optional(),
    fees: z.array(z.object({
      label: z.string(),
      amount: z.number().optional(),
      required: z.boolean().default(true)
    })).optional(),
    requestedDocuments: z.array(z.string()).optional(),
    questionsForUser: z.array(z.string()).optional(),
    phoneNumber: z.string().optional(),
    email: z.string().optional(),
    applicationUrl: z.string().optional()
  }).default({}),
  confidence: z.number().min(0).max(100),
  recommendedAction: z.enum(["reply", "ask_user", "schedule_tour", "prepare_application", "skip", "escalate"])
});

export type MessageChannel = z.infer<typeof MessageChannelSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type MessageDraft = z.infer<typeof MessageDraftSchema>;
export type InboundMessageParse = z.infer<typeof InboundMessageParseSchema>;
export type MessageIntent = z.infer<typeof MessageIntentSchema>;
