import type { Building, CanonicalListing } from "@ari/schemas";
import { nowIso, stableHash } from "@ari/shared";

export function enrichBuildingFromPublicData(listing: CanonicalListing): Building {
  const severeViolationCount = listing.address.raw.includes("27-17") ? 2 : 0;
  const openViolationsCount = listing.address.raw.includes("27-17") ? 6 : 1;
  const recentComplaintsCount = listing.address.raw.includes("71 Franklin") ? 4 : 1;
  const riskScore = severeViolationCount * 20 + openViolationsCount * 10 + recentComplaintsCount * 10;

  return {
    id: stableHash(["building", listing.address.normalized ?? listing.address.raw].join(":")).slice(0, 18),
    normalizedAddress: listing.address.normalized ?? listing.address.raw,
    city: listing.address.city,
    state: listing.address.state,
    zip: listing.address.zip,
    lat: listing.address.lat,
    lng: listing.address.lng,
    publicData: {
      source: "mock-nyc-open-data",
      note: "Public-data risk signals only, not a legal or habitability conclusion."
    },
    riskSignals: {
      openViolationsCount,
      recentComplaintsCount,
      severeViolationCount,
      dataConfidence: 76
    },
    riskBucket: riskScore >= 90 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}
