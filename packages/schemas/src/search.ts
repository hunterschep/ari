import { z } from "zod";
import { CommuteAnchorSchema, PetSchema } from "./renter-profile";

export const SearchCriteriaSchema = z.object({
  city: z.string(),
  state: z.string().default("NY"),
  neighborhoods: z.array(z.string()).default([]),
  budgetMax: z.number().positive(),
  budgetMin: z.number().nonnegative().optional(),
  bedroomsMin: z.number().min(0),
  bathroomsMin: z.number().min(0).optional(),
  moveInDate: z.string(),
  pets: z.array(PetSchema).default([]),
  mustHaves: z.array(z.string()).default([]),
  niceToHaves: z.array(z.string()).default([]),
  dealBreakers: z.array(z.string()).default([]),
  commuteAnchors: z.array(CommuteAnchorSchema).default([])
});

export const AutomationPolicySchema = z.object({
  autoFindListings: z.boolean().default(true),
  autoScoreListings: z.boolean().default(true),
  autoDraftMessages: z.boolean().default(true),
  autoSendMessages: z.boolean().default(false),
  autoBookTours: z.boolean().default(false),
  autoPrepareApplications: z.boolean().default(true),
  maxOutreachPerDay: z.number().int().min(0).default(5),
  requireApprovalFor: z.object({
    firstMessage: z.boolean().default(true),
    followUps: z.boolean().default(true),
    tourConfirmation: z.boolean().default(true),
    applicationPacket: z.boolean().default(true),
    messagesWithPersonalFinancialInfo: z.boolean().default(true)
  }).default({
    firstMessage: true,
    followUps: true,
    tourConfirmation: true,
    applicationPacket: true,
    messagesWithPersonalFinancialInfo: true
  })
});

export const SearchSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]),
  criteria: SearchCriteriaSchema,
  automationPolicy: AutomationPolicySchema,
  startedAt: z.string().optional(),
  pausedAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ListingScoreSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  searchSessionId: z.string(),
  totalScore: z.number().min(0),
  rank: z.number().int().positive(),
  recommendation: z.enum(["CONTACT_NOW", "SAVE", "MAYBE", "SKIP", "NEEDS_USER_REVIEW"]),
  dimensions: z.record(z.number()),
  reasons: z.object({
    positives: z.array(z.string()).default([]),
    negatives: z.array(z.string()).default([]),
    uncertainties: z.array(z.string()).default([])
  }),
  explanation: z.object({
    summary: z.string(),
    whyGoodFit: z.array(z.string()),
    concerns: z.array(z.string()),
    recommendedNextAction: z.enum(["message_landlord", "ask_question", "book_tour", "skip"]),
    suggestedQuestion: z.string().optional()
  }).optional(),
  computedAt: z.string()
});

export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>;
export type AutomationPolicy = z.infer<typeof AutomationPolicySchema>;
export type SearchSession = z.infer<typeof SearchSessionSchema>;
export type ListingScore = z.infer<typeof ListingScoreSchema>;
