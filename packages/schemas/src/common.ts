import { z } from "zod";

export const UuidSchema = z.string().min(1);
export const IsoDateSchema = z.string().min(4);
export const CurrencySchema = z.literal("USD");

export const AddressSchema = z.object({
  raw: z.string().min(1),
  normalized: z.string().optional(),
  unit: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(2),
  zip: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  geohash: z.string().optional()
});

export const FeeSchema = z.object({
  type: z.enum(["BROKER_FEE", "APPLICATION_FEE", "SECURITY_DEPOSIT", "PET_FEE", "PET_RENT", "OTHER"]),
  label: z.string(),
  amount: z.number().nonnegative().optional(),
  required: z.boolean().default(true),
  brokerRepresentsLandlord: z.boolean().optional(),
  disclosureText: z.string().optional()
});

export const ProposedSlotSchema = z.object({
  startDateTime: z.string(),
  endDateTime: z.string(),
  timezone: z.string().default("America/New_York"),
  sourceText: z.string().optional()
});

export const AuditLogSchema = z.object({
  id: UuidSchema,
  actorType: z.enum(["USER", "ADMIN", "OPS", "AGENT", "SYSTEM"]),
  actorId: z.string().optional(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string()
});

export type Address = z.infer<typeof AddressSchema>;
export type Fee = z.infer<typeof FeeSchema>;
export type ProposedSlot = z.infer<typeof ProposedSlotSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
