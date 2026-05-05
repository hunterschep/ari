import type { RentcastRentalListing, RentcastSearchInput } from "./types";
import { rentcastFixtureListings } from "./fixtures";
import { RentcastError } from "./errors";

export interface ListingSourceAdapter {
  source: "RENTCAST";
  searchRentals(input: RentcastSearchInput): Promise<RentcastRentalListing[]>;
  getListing(input: { sourceListingId: string }): Promise<RentcastRentalListing | null>;
}

export class RentcastClient implements ListingSourceAdapter {
  source = "RENTCAST" as const;

  constructor(private readonly apiKey?: string) {}

  async searchRentals(input: RentcastSearchInput): Promise<RentcastRentalListing[]> {
    if (this.apiKey) {
      const url = new URL("https://api.rentcast.io/v1/listings/rental/long-term");
      url.searchParams.set("city", input.city);
      url.searchParams.set("state", input.state);
      url.searchParams.set("status", "Active");
      url.searchParams.set("limit", String(input.limit ?? 100));
      if (input.minPrice) url.searchParams.set("minPrice", String(input.minPrice));
      if (input.maxPrice) url.searchParams.set("maxPrice", String(input.maxPrice));
      if (input.bedroomsMin !== undefined) url.searchParams.set("bedrooms", String(input.bedroomsMin));
      if (input.bathroomsMin !== undefined) url.searchParams.set("bathrooms", String(input.bathroomsMin));

      const response = await fetch(url, {
        headers: {
          "X-Api-Key": this.apiKey,
          Accept: "application/json"
        }
      });
      if (!response.ok) throw new RentcastError(`RentCast rental listing search failed: ${response.status}`, response.status);
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.listings) ? payload.listings : [];
      return rows.map(mapRentcastApiListing);
    }

    return rentcastFixtureListings
      .filter((listing) => listing.state === input.state)
      .filter((listing) => listing.price <= (input.maxPrice ?? Number.POSITIVE_INFINITY))
      .filter((listing) => listing.price >= (input.minPrice ?? 0))
      .filter((listing) => listing.bedrooms >= (input.bedroomsMin ?? 0))
      .slice(0, input.limit ?? 100);
  }

  async getListing(input: { sourceListingId: string }): Promise<RentcastRentalListing | null> {
    if (this.apiKey) {
      const response = await fetch(`https://api.rentcast.io/v1/listings/rental/long-term/${encodeURIComponent(input.sourceListingId)}`, {
        headers: {
          "X-Api-Key": this.apiKey,
          Accept: "application/json"
        }
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new RentcastError(`RentCast rental listing lookup failed: ${response.status}`, response.status);
      return mapRentcastApiListing(await response.json());
    }

    return rentcastFixtureListings.find((listing) => listing.id === input.sourceListingId || listing.rentcastId === input.sourceListingId) ?? null;
  }
}

function mapRentcastApiListing(raw: Record<string, unknown>): RentcastRentalListing {
  const lineAddress = [raw.addressLine1, raw.addressLine2].map(stringValue).filter(Boolean).join(" ");
  const address =
    stringValue(raw.formattedAddress) ??
    stringValue(lineAddress) ??
    stringValue(raw.address) ??
    "Unknown address";
  const city = stringValue(raw.city) ?? stringValue(raw.addressCity) ?? "Unknown";
  const state = stringValue(raw.state) ?? stringValue(raw.addressState) ?? "NA";
  const price = numberValue(raw.price) ?? numberValue(raw.rent) ?? numberValue(raw.listPrice) ?? numberValue(raw.listedPrice) ?? 0;

  return {
    rentcastId: stringValue(raw.id) ?? stringValue(raw.listingId) ?? `${address}-${price}`,
    id: stringValue(raw.id) ?? stringValue(raw.listingId),
    url: stringValue(raw.url) ?? stringValue(raw.listingUrl),
    title: stringValue(raw.title) ?? `${numberValue(raw.bedrooms) ?? 0} bed rental at ${address}`,
    description: stringValue(raw.description),
    address,
    unit: stringValue(raw.unit) ?? stringValue(raw.unitNumber),
    city,
    state,
    zip: stringValue(raw.zipCode) ?? stringValue(raw.zip),
    price,
    bedrooms: numberValue(raw.bedrooms) ?? 0,
    bathrooms: numberValue(raw.bathrooms),
    squareFeet: numberValue(raw.squareFootage) ?? numberValue(raw.squareFeet),
    availableDate: stringValue(raw.availableDate),
    amenities: arrayOfStrings(raw.amenities),
    cats: booleanValue(raw.petsAllowed) ?? booleanValue(raw.catsAllowed),
    dogs: booleanValue(raw.petsAllowed) ?? booleanValue(raw.dogsAllowed),
    brokerFee: numberValue(raw.brokerFee),
    applicationFee: numberValue(raw.applicationFee),
    securityDeposit: numberValue(raw.securityDeposit),
    contactName: stringValue(raw.contactName) ?? stringValue(raw.listingAgentName),
    contactEmail: stringValue(raw.contactEmail) ?? stringValue(raw.listingAgentEmail),
    contactPhone: stringValue(raw.contactPhone) ?? stringValue(raw.listingAgentPhone),
    photos: arrayOfStrings(raw.photos),
    propertyType: stringValue(raw.propertyType),
    daysOnMarket: numberValue(raw.daysOnMarket),
    sourcePayload: raw
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}
