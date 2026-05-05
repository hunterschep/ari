import type { CanonicalListing } from "@ari/schemas";
import { NY_APPLICATION_FEE_CAP_USD } from "@ari/shared";

export type FeeRuleFlag = {
  code: "NYC_FARE_ACT_POTENTIAL_VIOLATION" | "NY_APPLICATION_FEE_CAP_EXCEEDED";
  severity: "MEDIUM" | "HIGH";
  reason: string;
};

export function evaluateFeeRules(listing: CanonicalListing): FeeRuleFlag[] {
  const flags: FeeRuleFlag[] = [];
  const city = listing.address.city.toLowerCase();
  const state = listing.address.state.toUpperCase();

  if ((city === "nyc" || city === "new york" || ["brooklyn", "queens", "manhattan", "bronx", "staten island"].includes(city)) && listing.fees.brokerFeeRequired) {
    flags.push({
      code: "NYC_FARE_ACT_POTENTIAL_VIOLATION",
      severity: "HIGH",
      reason: "NYC FARE Act review: landlord/listing-agent broker fees charged to tenants may be prohibited."
    });
  }

  if (state === "NY" && typeof listing.fees.applicationFee === "number" && listing.fees.applicationFee > NY_APPLICATION_FEE_CAP_USD) {
    flags.push({
      code: "NY_APPLICATION_FEE_CAP_EXCEEDED",
      severity: "HIGH",
      reason: `New York application/background/credit fee exceeds $${NY_APPLICATION_FEE_CAP_USD}.`
    });
  }

  return flags;
}
