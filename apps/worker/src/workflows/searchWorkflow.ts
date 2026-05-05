import { dedupeListings, rankListings } from "@ari/agents";
import { mapRentcastToCanonical } from "@ari/integrations";
import type { RenterProfile, SearchSession } from "@ari/schemas";
import { fetchRentcastListings } from "../activities/listing-ingestion/fetchRentcastListings";
import { enrichListing } from "../activities/listing-ingestion/enrichListing";

export async function SearchWorkflow(input: { profile: RenterProfile; searchSession: SearchSession }) {
  const raw = await fetchRentcastListings(input.searchSession.criteria);
  const normalized = dedupeListings(raw.map(mapRentcastToCanonical));
  const enriched = await Promise.all(normalized.map(enrichListing));
  const scores = rankListings(enriched, input.searchSession.criteria, input.searchSession.id);
  const topListings = enriched
    .map((listing) => ({ listing, score: scores.find((score) => score.listingId === listing.id) }))
    .filter((item) => item.score?.recommendation === "CONTACT_NOW");

  return {
    listings: enriched,
    scores,
    draftOutreachListingIds: input.searchSession.automationPolicy.autoDraftMessages ? topListings.map((item) => item.listing.id) : [],
    notification: `${scores.length} listings ranked, ${topListings.length} ready for outreach drafts.`
  };
}
