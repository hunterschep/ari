import { MockMapsProvider } from "@ari/integrations";
import type { CanonicalListing, CommuteAnchor } from "@ari/schemas";

export async function computeCommuteTimes(listing: CanonicalListing, anchors: CommuteAnchor[]) {
  const maps = new MockMapsProvider();
  return maps.computeRouteMatrix({
    origins: [listing.address.normalized ?? listing.address.raw],
    destinations: anchors.map((anchor) => anchor.address)
  });
}
