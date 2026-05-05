import { MockMapsProvider } from "@ari/integrations";
import type { CanonicalListing } from "@ari/schemas";

export async function enrichListing(listing: CanonicalListing): Promise<CanonicalListing> {
  const maps = new MockMapsProvider();
  const result = await maps.geocode(`${listing.address.raw}, ${listing.address.city}, ${listing.address.state}`);
  return {
    ...listing,
    address: {
      ...listing.address,
      normalized: result.formattedAddress,
      lat: result.lat,
      lng: result.lng
    }
  };
}
