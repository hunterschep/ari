import { z } from "zod";

export const CommuteAnchorSchema = z.object({
  id: z.string(),
  label: z.string(),
  address: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("HIGH")
});

export const PetSchema = z.object({
  type: z.enum(["cat", "dog", "other"]),
  name: z.string().optional(),
  weightLbs: z.number().positive().optional()
});

export const OccupantSchema = z.object({
  name: z.string(),
  relationship: z.string().optional()
});

export const EmploymentProfileSchema = z.object({
  employer: z.string().optional(),
  title: z.string().optional(),
  startDate: z.string().optional()
});

export const IncomeProfileSchema = z.object({
  annualIncome: z.number().nonnegative().optional(),
  monthlyIncome: z.number().nonnegative().optional(),
  verified: z.boolean().default(false)
});

export const GuarantorProfileSchema = z.object({
  hasGuarantor: z.boolean(),
  annualIncome: z.number().nonnegative().optional()
});

export const RentalPreferencesSchema = z.object({
  mustHaves: z.array(z.string()).default([]),
  niceToHaves: z.array(z.string()).default([]),
  noFeePreference: z.boolean().default(true),
  petsAllowedRequired: z.boolean().default(false),
  laundry: z.boolean().default(false),
  elevator: z.boolean().default(false),
  doorman: z.boolean().default(false),
  outdoorSpace: z.boolean().default(false),
  dishwasher: z.boolean().default(false),
  furnished: z.boolean().default(false),
  parking: z.boolean().default(false),
  guarantorAllowed: z.boolean().default(false),
  flexibleMoveIn: z.boolean().default(false),
  budgetStretchAllowed: z.boolean().default(false)
});

export const UserAvailabilityRuleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string().default("America/New_York"),
  validFrom: z.string().optional(),
  validUntil: z.string().optional()
});

export const RenterProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  legalName: z.string().min(1).optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  targetCity: z.string().min(1).optional(),
  moveInDate: z.string().optional(),
  leaseTermMonths: z.number().positive().optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().positive().optional(),
  bedroomsMin: z.number().min(0).default(0),
  bathroomsMin: z.number().min(0).optional(),
  neighborhoods: z.array(z.string()).default([]),
  commuteAnchors: z.array(CommuteAnchorSchema).default([]),
  occupants: z.array(OccupantSchema).default([]),
  pets: z.array(PetSchema).default([]),
  employment: EmploymentProfileSchema.optional(),
  income: IncomeProfileSchema.optional(),
  guarantor: GuarantorProfileSchema.optional(),
  preferences: RentalPreferencesSchema.default({}),
  dealBreakers: z.array(z.string()).default([]),
  messageTone: z.enum(["direct", "friendly", "premium", "urgent"]).default("friendly"),
  applicationReadiness: z.enum(["NOT_STARTED", "PARTIAL", "READY"]).default("NOT_STARTED"),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const MinimumSearchProfileSchema = RenterProfileSchema.refine(
  (profile) =>
    Boolean(
      profile.targetCity &&
        profile.moveInDate &&
        profile.budgetMax &&
        profile.bedroomsMin !== undefined &&
        (profile.neighborhoods.length > 0 || profile.commuteAnchors.length > 0)
    ),
  "target city, move-in date, budget max, beds, and a neighborhood or commute anchor are required"
);

export type CommuteAnchor = z.infer<typeof CommuteAnchorSchema>;
export type Pet = z.infer<typeof PetSchema>;
export type RentalPreferences = z.infer<typeof RentalPreferencesSchema>;
export type RenterProfile = z.infer<typeof RenterProfileSchema>;
export type UserAvailabilityRule = z.infer<typeof UserAvailabilityRuleSchema>;
