import type { CanonicalListing, ListingVersion, SearchCriteria } from "@ari/schemas";
import { hoursSince, nowIso, priceBucket, stableHash, normalizeAddress, normalizeText } from "@ari/shared";

export type RawRentalListing = {
  id?: string;
  url?: string;
  title?: string;
  description?: string;
  address: string;
  unit?: string;
  city: string;
  state: string;
  zip?: string;
  price: number;
  bedrooms: number;
  bathrooms?: number;
  squareFeet?: number;
  availableDate?: string;
  amenities?: string[];
  cats?: boolean;
  dogs?: boolean;
  brokerFee?: number;
  applicationFee?: number;
  securityDeposit?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  photos?: string[];
  sourcePayload?: unknown;
};

export function computeCanonicalHash(input: {
  address: string;
  unit?: string;
  bedrooms: number;
  bathrooms?: number;
  price: number;
}): string {
  return stableHash({
    address: normalizeAddress(input.address),
    unit: normalizeText(input.unit),
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms ?? null,
    priceBucket: priceBucket(input.price)
  }).slice(0, 24);
}

export function normalizeListing(raw: RawRentalListing, source: CanonicalListing["source"]): CanonicalListing {
  const observedAt = nowIso();
  const canonicalHash = computeCanonicalHash({
    address: raw.address,
    unit: raw.unit,
    bedrooms: raw.bedrooms,
    bathrooms: raw.bathrooms,
    price: raw.price
  });

  return {
    id: `${source.toLowerCase()}-${canonicalHash}`,
    source,
    sourceListingId: raw.id,
    sourceUrl: raw.url,
    canonicalHash,
    dedupeState: "UNIQUE",
    status: "ACTIVE",
    freshness: "FRESH",
    confidence: computeListingConfidence(raw),
    title: raw.title,
    description: raw.description,
    address: {
      raw: raw.address,
      normalized: normalizeAddress(raw.address),
      unit: raw.unit,
      city: raw.city,
      state: raw.state,
      zip: raw.zip
    },
    price: raw.price,
    currency: "USD",
    bedrooms: raw.bedrooms,
    bathrooms: raw.bathrooms,
    squareFeet: raw.squareFeet,
    availableDate: raw.availableDate,
    fees: {
      brokerFeeRequired: Boolean(raw.brokerFee && raw.brokerFee > 0),
      brokerFeeAmount: raw.brokerFee,
      applicationFee: raw.applicationFee,
      securityDeposit: raw.securityDeposit,
      otherFees: [],
      feeDisclosureText: raw.brokerFee ? `Broker fee disclosed: $${raw.brokerFee}` : undefined
    },
    amenities: raw.amenities ?? [],
    petPolicy: {
      cats: raw.cats,
      dogs: raw.dogs
    },
    media: {
      photos: raw.photos ?? [],
      floorplans: [],
      videos: [],
      virtualTours: []
    },
    contacts: raw.contactEmail || raw.contactPhone
      ? [
          {
            id: stableHash([raw.contactEmail, raw.contactPhone, raw.contactName].join(":")).slice(0, 12),
            name: raw.contactName,
            role: "leasing_agent",
            email: raw.contactEmail,
            phone: raw.contactPhone,
            source,
            confidence: raw.contactEmail && raw.contactPhone ? "HIGH" : "MEDIUM"
          }
        ]
      : [],
    listedAt: observedAt,
    lastSeenAt: observedAt,
    lastRefreshedAt: observedAt,
    rawSourcePayload: raw.sourcePayload ?? raw
  };
}

export function computeListingConfidence(raw: RawRentalListing): number {
  let score = 35;
  if (raw.id) score += 10;
  if (raw.address && raw.city && raw.state) score += 15;
  if (raw.contactEmail || raw.contactPhone) score += 15;
  if ((raw.photos?.length ?? 0) > 0) score += 8;
  if (raw.availableDate) score += 7;
  if (raw.price > 700 && raw.price < 20000) score += 10;
  if (!raw.address || raw.price < 500) score -= 25;
  return Math.max(0, Math.min(100, score));
}

export function markFreshness(listing: CanonicalListing, referenceDate = new Date()): CanonicalListing {
  const ageHours = hoursSince(listing.lastRefreshedAt, referenceDate);
  const freshness =
    listing.status === "RENTED"
      ? "DEAD"
      : ageHours < 24
        ? "FRESH"
        : ageHours <= 72
          ? "AGING"
          : "STALE";

  return {
    ...listing,
    freshness,
    status: freshness === "STALE" && listing.status === "ACTIVE" ? "STALE" : listing.status
  };
}

export function findPotentialDuplicates(listings: CanonicalListing[]): CanonicalListing[] {
  const seen = new Map<string, CanonicalListing>();

  return listings.map((listing) => {
    const exact = seen.get(listing.canonicalHash ?? "");
    if (exact) {
      return { ...listing, dedupeState: "LIKELY_DUPLICATE" };
    }

    const fuzzy = [...seen.values()].find((candidate) => fuzzyDuplicateScore(candidate, listing) >= 80);
    if (fuzzy) {
      seen.set(listing.canonicalHash ?? listing.id, listing);
      return { ...listing, dedupeState: "NEEDS_REVIEW" };
    }

    seen.set(listing.canonicalHash ?? listing.id, listing);
    return { ...listing, dedupeState: "UNIQUE" };
  });
}

export function dedupeListings(listings: CanonicalListing[]): CanonicalListing[] {
  const flagged = findPotentialDuplicates(listings);
  const winners = new Map<string, CanonicalListing>();

  for (const listing of flagged) {
    const key = listing.canonicalHash ?? listing.id;
    const existing = winners.get(key);
    if (!existing || listing.confidence > existing.confidence) {
      winners.set(key, listing.dedupeState === "LIKELY_DUPLICATE" ? { ...listing, dedupeState: "CONFIRMED_DUPLICATE" } : listing);
    }
  }

  return [...winners.values()];
}

function fuzzyDuplicateScore(a: CanonicalListing, b: CanonicalListing): number {
  let score = 0;
  if (normalizeAddress(a.address.raw) === normalizeAddress(b.address.raw)) score += 40;
  if (normalizeText(a.address.unit) === normalizeText(b.address.unit)) score += 15;
  if (a.bedrooms === b.bedrooms) score += 15;
  if ((a.bathrooms ?? 0) === (b.bathrooms ?? 0)) score += 10;
  if (Math.abs(a.price - b.price) <= 150) score += 10;
  if (contactOverlap(a, b)) score += 10;
  return score;
}

function contactOverlap(a: CanonicalListing, b: CanonicalListing): boolean {
  const aContacts = new Set(a.contacts.flatMap((contact) => [contact.email, contact.phone].filter(Boolean)));
  return b.contacts.some((contact) => Boolean(contact.email && aContacts.has(contact.email)) || Boolean(contact.phone && aContacts.has(contact.phone)));
}

export function createListingVersion(listing: CanonicalListing, previous?: CanonicalListing): ListingVersion | null {
  const payloadHash = stableHash({
    status: listing.status,
    price: listing.price,
    fees: listing.fees,
    availabilityDate: listing.availableDate,
    description: listing.description
  });

  if (previous) {
    const previousHash = stableHash({
      status: previous.status,
      price: previous.price,
      fees: previous.fees,
      availabilityDate: previous.availableDate,
      description: previous.description
    });
    if (previousHash === payloadHash) return null;
  }

  return {
    id: stableHash([listing.id, payloadHash, listing.lastRefreshedAt].join(":")).slice(0, 18),
    listingId: listing.id,
    observedAt: listing.lastRefreshedAt,
    status: listing.status,
    price: listing.price,
    feesJson: listing.fees,
    availabilityDate: listing.availableDate,
    payloadHash,
    diff: previous
      ? {
          price: previous.price !== listing.price ? { from: previous.price, to: listing.price } : undefined,
          status: previous.status !== listing.status ? { from: previous.status, to: listing.status } : undefined,
          fees: stableHash(previous.fees) !== stableHash(listing.fees) ? { from: previous.fees, to: listing.fees } : undefined,
          availabilityDate:
            previous.availableDate !== listing.availableDate ? { from: previous.availableDate, to: listing.availableDate } : undefined
        }
      : {}
  };
}

export function applyHardFilters(listing: CanonicalListing, criteria: SearchCriteria): string[] {
  const reasons: string[] = [];
  if (!criteria.budgetMax || listing.price > criteria.budgetMax * (criteria.dealBreakers.includes("allow budget stretch") ? 1.1 : 1)) {
    reasons.push(`Price $${listing.price} exceeds budget max $${criteria.budgetMax}`);
  }
  if (listing.bedrooms < criteria.bedroomsMin) reasons.push(`Bedrooms ${listing.bedrooms} below requested ${criteria.bedroomsMin}+`);
  if (criteria.bathroomsMin && (listing.bathrooms ?? 0) < criteria.bathroomsMin) reasons.push("Bathrooms below minimum");
  if (criteria.pets.some((pet) => pet.type === "cat") && listing.petPolicy?.cats === false) reasons.push("Listing says no cats");
  if (criteria.pets.some((pet) => pet.type === "dog") && listing.petPolicy?.dogs === false) reasons.push("Listing says no dogs");
  for (const mustHave of criteria.mustHaves) {
    if (!listing.amenities.map(normalizeText).includes(normalizeText(mustHave))) {
      reasons.push(`Missing must-have: ${mustHave}`);
    }
  }
  return reasons;
}
