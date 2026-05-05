import { z } from "zod";

export const ApplicationDocumentTypeSchema = z.enum([
  "ID",
  "PAYSTUB",
  "BANK_STATEMENT",
  "EMPLOYMENT_LETTER",
  "TAX_RETURN",
  "W2",
  "OFFER_LETTER",
  "CREDIT_REPORT",
  "BACKGROUND_CHECK",
  "PET_RECORD",
  "GUARANTOR_DOC",
  "OTHER"
]);

export const ApplicationDocumentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: ApplicationDocumentTypeSchema,
  fileName: z.string(),
  mimeType: z.string(),
  storageKey: z.string(),
  sizeBytes: z.number().nonnegative(),
  status: z.enum(["UPLOADED", "CLASSIFIED", "NEEDS_REVIEW", "APPROVED", "EXPIRED", "DELETED"]),
  extractedFields: z.record(z.unknown()).optional(),
  containsSensitiveData: z.boolean(),
  expiresAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ApplicationChecklistSchema = z.object({
  requiredItems: z.array(z.object({
    label: z.string(),
    status: z.enum(["AVAILABLE", "MISSING", "NEEDS_USER_CONFIRMATION"]),
    documentType: ApplicationDocumentTypeSchema.optional()
  })),
  warnings: z.array(z.string()).default([]),
  readyToSubmit: z.boolean()
});

export const ApplicationPacketSchema = z.object({
  id: z.string(),
  userId: z.string(),
  listingId: z.string(),
  status: z.enum(["DRAFT", "MISSING_INFO", "READY_FOR_REVIEW", "APPROVED", "SENT", "WITHDRAWN"]),
  renterSummary: z.string(),
  coverMessage: z.string(),
  includedDocumentIds: z.array(z.string()).default([]),
  secureShareUrl: z.string().url().optional(),
  expiresAt: z.string().optional(),
  createdByAgentRunId: z.string().optional(),
  approvedAt: z.string().optional(),
  sentAt: z.string().optional(),
  checklist: ApplicationChecklistSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ApplicationDocumentType = z.infer<typeof ApplicationDocumentTypeSchema>;
export type ApplicationDocument = z.infer<typeof ApplicationDocumentSchema>;
export type ApplicationChecklist = z.infer<typeof ApplicationChecklistSchema>;
export type ApplicationPacket = z.infer<typeof ApplicationPacketSchema>;
