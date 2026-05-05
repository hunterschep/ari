import { RentcastClient } from "@ari/integrations";
import type { SearchCriteria } from "@ari/schemas";

export async function fetchRentcastListings(criteria: SearchCriteria) {
  const client = new RentcastClient(process.env.RENTCAST_API_KEY);
  return client.searchRentals({
    city: criteria.city,
    state: criteria.state,
    minPrice: criteria.budgetMin,
    maxPrice: criteria.budgetMax * 1.15,
    bedroomsMin: criteria.bedroomsMin,
    bathroomsMin: criteria.bathroomsMin,
    neighborhoods: criteria.neighborhoods,
    limit: 100
  });
}
