import type { CanonicalListing, SearchSession } from "@ari/schemas";
import { createListingVersion, markFreshness, rankListings } from "@ari/agents";

export function DailyListingRefreshWorkflow(input: { listings: CanonicalListing[]; searchSession: SearchSession }) {
  const refreshed = input.listings.map((listing) => markFreshness({ ...listing, lastRefreshedAt: new Date().toISOString() }));
  const versions = refreshed.map((listing, index) => createListingVersion(listing, input.listings[index])).filter(Boolean);
  const scores = rankListings(refreshed, input.searchSession.criteria, input.searchSession.id);

  return {
    refreshed,
    versions,
    scores,
    highFitNewListings: scores.filter((score) => score.recommendation === "CONTACT_NOW").map((score) => score.listingId)
  };
}
