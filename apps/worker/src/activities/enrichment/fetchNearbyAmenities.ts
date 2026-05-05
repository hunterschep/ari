import type { CanonicalListing } from "@ari/schemas";

export function fetchNearbyAmenities(listing: CanonicalListing) {
  return {
    listingId: listing.id,
    amenities: ["subway within 0.4 mi", "grocery within 0.3 mi", "park within 0.5 mi"]
  };
}
