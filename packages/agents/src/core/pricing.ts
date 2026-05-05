import type { CanonicalListing, PricingAdvice } from "@ari/schemas";
import { nowIso } from "@ari/shared";
import { evaluateFeeRules } from "../policies/feeRules";

export function computePricingAdvice(listing: CanonicalListing, comps: CanonicalListing[]): PricingAdvice {
  const comparablePrices = comps
    .filter((comp) => comp.id !== listing.id && comp.bedrooms === listing.bedrooms && Math.abs(comp.price - listing.price) < listing.price)
    .map((comp) => comp.price)
    .sort((a, b) => a - b);

  const midpoint = comparablePrices.length > 0 ? median(comparablePrices) : listing.price;
  const low = Math.round(midpoint * 0.92);
  const high = Math.round(midpoint * 1.08);
  const brokerFee = listing.fees.brokerFeeRequired ? listing.fees.brokerFeeAmount ?? listing.price : undefined;
  const applicationFee = listing.fees.applicationFee;
  const securityDeposit = listing.fees.securityDeposit ?? listing.price;
  const otherFees = listing.fees.otherFees ?? [];
  const totalKnownCost = listing.price + (securityDeposit ?? 0) + (brokerFee ?? 0) + (applicationFee ?? 0) + otherFees.reduce((sum, fee) => sum + (fee.amount ?? 0), 0);
  const feeFlags = evaluateFeeRules(listing).map((flag) => flag.reason);
  const overage = listing.price - midpoint;

  const verdict: PricingAdvice["verdict"] =
    comparablePrices.length < 2
      ? "INSUFFICIENT_DATA"
      : listing.price <= low
        ? "GOOD_DEAL"
        : listing.price <= high
          ? "FAIR_PRICE"
          : listing.price <= Math.round(midpoint * 1.15)
            ? "SLIGHTLY_OVERPRICED"
            : "OVERPRICED";

  return {
    listingId: listing.id,
    verdict,
    estimatedFairRent: comparablePrices.length >= 2 ? { low, midpoint, high } : undefined,
    moveInCostEstimate: {
      firstMonthRent: listing.price,
      securityDeposit,
      brokerFee,
      applicationFee,
      otherFees,
      totalKnownCost,
      unknowns: listing.fees.feeDisclosureText ? [] : ["Full fee disclosure not confirmed"]
    },
    negotiationAdvice: {
      shouldNegotiate: verdict === "SLIGHTLY_OVERPRICED" || verdict === "OVERPRICED",
      suggestedAsk: overage > 0 ? `Ask for $${Math.max(low, midpoint)} based on nearby comparable listings.` : undefined,
      messageDraft:
        overage > 0
          ? `I like the apartment and can move quickly. I am seeing comparable units around $${Math.max(low, midpoint).toLocaleString()}. Would the owner consider that rent?`
          : undefined
    },
    warnings: feeFlags,
    computedAt: nowIso()
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] ?? 0 : Math.round(((values[mid - 1] ?? 0) + (values[mid] ?? 0)) / 2);
}
