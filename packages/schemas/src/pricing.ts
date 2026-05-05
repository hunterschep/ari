import { z } from "zod";
import { FeeSchema } from "./common";

export const PricingAdviceSchema = z.object({
  listingId: z.string(),
  verdict: z.enum(["GOOD_DEAL", "FAIR_PRICE", "SLIGHTLY_OVERPRICED", "OVERPRICED", "INSUFFICIENT_DATA"]),
  estimatedFairRent: z.object({
    low: z.number(),
    midpoint: z.number(),
    high: z.number()
  }).optional(),
  moveInCostEstimate: z.object({
    firstMonthRent: z.number(),
    securityDeposit: z.number().optional(),
    brokerFee: z.number().optional(),
    applicationFee: z.number().optional(),
    otherFees: z.array(FeeSchema).default([]),
    totalKnownCost: z.number(),
    unknowns: z.array(z.string()).default([])
  }),
  negotiationAdvice: z.object({
    shouldNegotiate: z.boolean(),
    suggestedAsk: z.string().optional(),
    messageDraft: z.string().optional()
  }),
  warnings: z.array(z.string()).default([]),
  computedAt: z.string()
});

export type PricingAdvice = z.infer<typeof PricingAdviceSchema>;
