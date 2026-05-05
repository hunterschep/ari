import type { RawRentalListing } from "@ari/agents";

export type RentcastRentalListing = RawRentalListing & {
  rentcastId: string;
  propertyType?: string;
  daysOnMarket?: number;
};

export type RentcastSearchInput = {
  city: string;
  state: string;
  minPrice?: number;
  maxPrice?: number;
  bedroomsMin?: number;
  bathroomsMin?: number;
  neighborhoods?: string[];
  limit?: number;
};
