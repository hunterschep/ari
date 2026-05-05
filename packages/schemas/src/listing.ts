import { z } from "zod";
import { AddressSchema, CurrencySchema, FeeSchema } from "./common";

export const ListingSourceSchema = z.enum(["RENTCAST", "LANDLORD_FEED", "USER_URL", "INTERNAL_MANUAL"]);
export const ListingStatusSchema = z.enum(["ACTIVE", "PENDING", "RENTED", "STALE", "UNKNOWN"]);
export const ListingFreshnessSchema = z.enum(["FRESH", "AGING", "STALE", "DEAD", "UNKNOWN"]);
export const DedupeStateSchema = z.enum(["UNIQUE", "LIKELY_DUPLICATE", "CONFIRMED_DUPLICATE", "NEEDS_REVIEW"]);

export const ListingContactSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  company: z.string().optional(),
  role: z.enum(["landlord", "broker", "property_manager", "leasing_agent", "unknown"]).default("unknown"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().default("unknown"),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]).default("UNKNOWN")
});

export const CanonicalListingSchema = z.object({
  id: z.string(),
  source: ListingSourceSchema,
  sourceListingId: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  canonicalHash: z.string().optional(),
  dedupeState: DedupeStateSchema.default("UNIQUE"),
  status: ListingStatusSchema,
  freshness: ListingFreshnessSchema.default("UNKNOWN"),
  confidence: z.number().min(0).max(100),
  title: z.string().optional(),
  description: z.string().optional(),
  address: AddressSchema,
  buildingId: z.string().optional(),
  price: z.number().positive(),
  currency: CurrencySchema.default("USD"),
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0).optional(),
  squareFeet: z.number().positive().optional(),
  availableDate: z.string().optional(),
  leaseTermMonths: z.number().positive().optional(),
  fees: z.object({
    brokerFeeRequired: z.boolean().optional(),
    brokerFeeAmount: z.number().nonnegative().optional(),
    applicationFee: z.number().nonnegative().optional(),
    securityDeposit: z.number().nonnegative().optional(),
    otherFees: z.array(FeeSchema).default([]),
    feeDisclosureText: z.string().optional()
  }).default({ otherFees: [] }),
  amenities: z.array(z.string()).default([]),
  petPolicy: z.object({
    cats: z.boolean().optional(),
    dogs: z.boolean().optional(),
    weightLimitLbs: z.number().positive().optional(),
    petFee: z.number().nonnegative().optional(),
    petRent: z.number().nonnegative().optional()
  }).optional(),
  media: z.object({
    photos: z.array(z.string()).default([]),
    floorplans: z.array(z.string()).default([]),
    videos: z.array(z.string()).default([]),
    virtualTours: z.array(z.string()).default([])
  }).default({ photos: [], floorplans: [], videos: [], virtualTours: [] }),
  contacts: z.array(ListingContactSchema).default([]),
  listedAt: z.string().optional(),
  lastSeenAt: z.string(),
  lastRefreshedAt: z.string(),
  rawSourcePayload: z.unknown().optional()
});

export const ListingVersionSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  observedAt: z.string(),
  status: ListingStatusSchema,
  price: z.number().positive(),
  feesJson: z.record(z.unknown()).default({}),
  availabilityDate: z.string().optional(),
  payloadHash: z.string(),
  diff: z.record(z.unknown()).default({})
});

export const BuildingSchema = z.object({
  id: z.string(),
  normalizedAddress: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  yearBuilt: z.number().optional(),
  unitsCount: z.number().optional(),
  buildingClass: z.string().optional(),
  publicData: z.record(z.unknown()).default({}),
  riskSignals: z.object({
    openViolationsCount: z.number().nonnegative().optional(),
    recentComplaintsCount: z.number().nonnegative().optional(),
    severeViolationCount: z.number().nonnegative().optional(),
    dataConfidence: z.number().min(0).max(100)
  }),
  riskBucket: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]).default("UNKNOWN"),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ListingSource = z.infer<typeof ListingSourceSchema>;
export type ListingContact = z.infer<typeof ListingContactSchema>;
export type CanonicalListing = z.infer<typeof CanonicalListingSchema>;
export type ListingVersion = z.infer<typeof ListingVersionSchema>;
export type Building = z.infer<typeof BuildingSchema>;
export type ListingStatus = z.infer<typeof ListingStatusSchema>;
export type DedupeState = z.infer<typeof DedupeStateSchema>;
