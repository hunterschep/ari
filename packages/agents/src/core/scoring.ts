import type { CanonicalListing, ListingScore, SearchCriteria } from "@ari/schemas";
import { clamp, nowIso, normalizeText } from "@ari/shared";
import { applyHardFilters } from "./listing-engine";

export const defaultWeights = {
  hardFilter: 1000,
  budget: 0.18,
  location: 0.14,
  commute: 0.14,
  amenities: 0.1,
  availability: 0.1,
  applicationFit: 0.08,
  pricing: 0.1,
  buildingRisk: 0.06,
  fee: 0.06,
  freshness: 0.05,
  contactability: 0.05
};

export function scoreListing(listing: CanonicalListing, criteria: SearchCriteria, index = 1): ListingScore {
  const hardFilterFailures = applyHardFilters(listing, criteria);
  const rejected = hardFilterFailures.length > 0;
  const budgetScore = clamp(100 - Math.max(0, ((listing.price - criteria.budgetMax) / criteria.budgetMax) * 100));
  const locationScore = criteria.neighborhoods.length === 0
    ? 70
    : criteria.neighborhoods.some((area) => normalizeText(listing.address.raw).includes(normalizeText(area)))
      ? 96
      : 68;
  const commuteScore = listing.address.lat && listing.address.lng ? 88 : criteria.commuteAnchors.length > 0 ? 70 : 82;
  const amenityScore = criteria.niceToHaves.length === 0
    ? 80
    : clamp(
        (criteria.niceToHaves.filter((item) => listing.amenities.map(normalizeText).includes(normalizeText(item))).length /
          Math.max(criteria.niceToHaves.length, 1)) *
          100
      );
  const availabilityScore = listing.availableDate ? 88 : 55;
  const applicationFitScore = listing.fees.applicationFee && listing.fees.applicationFee > 20 ? 55 : 80;
  const pricingScore = listing.price <= criteria.budgetMax * 0.92 ? 92 : budgetScore;
  const buildingRiskScore = listing.confidence > 70 ? 84 : 65;
  const feeScore = listing.fees.brokerFeeRequired ? 45 : 92;
  const freshnessScore = listing.freshness === "FRESH" ? 96 : listing.freshness === "AGING" ? 72 : listing.freshness === "STALE" ? 38 : 55;
  const contactabilityScore = listing.contacts.length > 0 ? (listing.contacts[0]?.confidence === "HIGH" ? 94 : 74) : 30;

  const dimensions = {
    hard_filter_score: rejected ? 0 : 1,
    budget_score: rejected ? 0 : budgetScore,
    location_score: rejected ? 0 : locationScore,
    commute_score: rejected ? 0 : commuteScore,
    amenity_score: rejected ? 0 : amenityScore,
    availability_score: rejected ? 0 : availabilityScore,
    application_fit_score: rejected ? 0 : applicationFitScore,
    pricing_score: rejected ? 0 : pricingScore,
    building_risk_score: rejected ? 0 : buildingRiskScore,
    fee_score: rejected ? 0 : feeScore,
    freshness_score: rejected ? 0 : freshnessScore,
    contactability_score: rejected ? 0 : contactabilityScore
  };

  const totalScore = rejected
    ? 0
    : Math.round(
        budgetScore * defaultWeights.budget +
          locationScore * defaultWeights.location +
          commuteScore * defaultWeights.commute +
          amenityScore * defaultWeights.amenities +
          availabilityScore * defaultWeights.availability +
          applicationFitScore * defaultWeights.applicationFit +
          pricingScore * defaultWeights.pricing +
          buildingRiskScore * defaultWeights.buildingRisk +
          feeScore * defaultWeights.fee +
          freshnessScore * defaultWeights.freshness +
          contactabilityScore * defaultWeights.contactability
      );

  const positives = [
    budgetScore >= 85 ? "Fits the stated budget" : undefined,
    locationScore >= 90 ? "Located in a preferred neighborhood" : undefined,
    amenityScore >= 80 ? "Matches key amenity preferences" : undefined,
    contactabilityScore >= 80 ? "Has a direct contact path" : undefined
  ].filter(Boolean) as string[];

  const negatives = [
    ...hardFilterFailures,
    listing.fees.brokerFeeRequired ? "Broker fee needs review" : undefined,
    listing.freshness === "STALE" ? "Listing freshness is stale" : undefined
  ].filter(Boolean) as string[];

  const uncertainties = [
    listing.address.lat ? undefined : "Commute is estimated until geocoding completes",
    listing.contacts.length === 0 ? "No direct landlord or broker contact found yet" : undefined
  ].filter(Boolean) as string[];

  const recommendation: ListingScore["recommendation"] =
    totalScore >= 82
      ? "CONTACT_NOW"
      : totalScore >= 70
        ? "SAVE"
        : totalScore >= 55
          ? "MAYBE"
          : rejected
            ? "SKIP"
            : "NEEDS_USER_REVIEW";

  return {
    id: `${listing.id}-${criteria.city}-${index}`,
    listingId: listing.id,
    searchSessionId: "pending",
    totalScore,
    rank: index,
    recommendation,
    dimensions,
    reasons: {
      positives,
      negatives,
      uncertainties
    },
    explanation: {
      summary: rejected
        ? "This listing is excluded by a hard requirement."
        : `${listing.title ?? listing.address.raw} is a ${recommendation.toLowerCase().replaceAll("_", " ")} match at ${totalScore}/100.`,
      whyGoodFit: positives,
      concerns: negatives.concat(uncertainties),
      recommendedNextAction: recommendation === "CONTACT_NOW" ? "message_landlord" : recommendation === "SKIP" ? "skip" : "ask_question",
      suggestedQuestion: listing.fees.brokerFeeRequired ? "Can you confirm who hired the broker and which fees are tenant-paid?" : undefined
    },
    computedAt: nowIso()
  };
}

export function rankListings(listings: CanonicalListing[], criteria: SearchCriteria, searchSessionId: string): ListingScore[] {
  return listings
    .map((listing, index) => scoreListing(listing, criteria, index + 1))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((score, index) => ({
      ...score,
      searchSessionId,
      rank: index + 1
    }));
}
