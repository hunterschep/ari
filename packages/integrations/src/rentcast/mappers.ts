import { normalizeListing } from "@ari/agents";
import type { CanonicalListing } from "@ari/schemas";
import type { RentcastRentalListing } from "./types";

export function mapRentcastToCanonical(raw: RentcastRentalListing): CanonicalListing {
  return normalizeListing(raw, "RENTCAST");
}
