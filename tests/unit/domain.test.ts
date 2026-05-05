import { describe, expect, it } from "vitest";
import {
  computePricingAdvice,
  createOutreachDraft,
  dedupeListings,
  evaluateFeeRules,
  evaluatePolicy,
  generateApplicationPacket,
  normalizeListing,
  parseInboundMessage,
  rankListings
} from "@ari/agents";
import { demoDocuments, demoProfile, demoSession } from "../../apps/web/lib/mock";

describe("domain logic", () => {
  it("normalizes and dedupes listings deterministically", () => {
    const a = normalizeListing(
      {
        id: "a",
        address: "27-17 42nd Road",
        unit: "19C",
        city: "Queens",
        state: "NY",
        price: 3895,
        bedrooms: 1,
        bathrooms: 1,
        contactEmail: "leasing@example.com"
      },
      "RENTCAST"
    );
    const b = normalizeListing(
      {
        id: "b",
        address: "27-17 42nd Rd",
        unit: "19C",
        city: "Queens",
        state: "NY",
        price: 3899,
        bedrooms: 1,
        bathrooms: 1,
        contactEmail: "leasing@example.com"
      },
      "LANDLORD_FEED"
    );

    expect(dedupeListings([a, b])).toHaveLength(1);
  });

  it("removes hard-filter misses before ranking", () => {
    const listing = normalizeListing(
      {
        address: "1 Expensive Avenue",
        city: "Brooklyn",
        state: "NY",
        price: 6000,
        bedrooms: 1,
        bathrooms: 1,
        cats: true,
        amenities: ["laundry"]
      },
      "INTERNAL_MANUAL"
    );
    const scores = rankListings([listing], demoSession.criteria, demoSession.id);
    expect(scores[0]?.recommendation).toBe("SKIP");
    expect(scores[0]?.dimensions.hard_filter_score).toBe(0);
  });

  it("creates first outreach without sensitive financial facts", () => {
    const listing = normalizeListing(
      {
        address: "112 North 7th Street",
        city: "Brooklyn",
        state: "NY",
        price: 3650,
        bedrooms: 1,
        bathrooms: 1,
        cats: true,
        amenities: ["laundry"],
        contactEmail: "leasing@example.com"
      },
      "RENTCAST"
    );
    const draft = createOutreachDraft({ renter: demoProfile, listing });
    expect(draft.includedSensitiveInfo).toBe(false);
    expect(draft.body.toLowerCase()).not.toContain("income");
    expect(draft.body.toLowerCase()).not.toContain("paystub");
  });

  it("parses tour slots and application requests", () => {
    const parsed = parseInboundMessage("Yes it is available. We can show Thursday at 6pm or Saturday at 10am. Any pets?");
    expect(parsed.intent).toBe("TOUR_SLOTS_PROPOSED");
    expect(parsed.extracted.proposedTourSlots).toHaveLength(2);

    const application = parseInboundMessage("Please send application, proof of income, ID, and pet info.");
    expect(application.intent).toBe("APPLICATION_REQUESTED");
    expect(application.extracted.requestedDocuments).toContain("PAYSTUB");
  });

  it("flags NYC broker fees and NY application fee cap risk", () => {
    const listing = normalizeListing(
      {
        address: "71 Franklin Street",
        city: "Brooklyn",
        state: "NY",
        price: 3425,
        bedrooms: 1,
        bathrooms: 1,
        brokerFee: 3425,
        applicationFee: 35
      },
      "RENTCAST"
    );
    const flags = evaluateFeeRules(listing).map((flag) => flag.code);
    expect(flags).toContain("NYC_FARE_ACT_POTENTIAL_VIOLATION");
    expect(flags).toContain("NY_APPLICATION_FEE_CAP_EXCEEDED");
  });

  it("requires approval for sensitive document and SMS sends", () => {
    const docDecision = evaluatePolicy({
      toolName: "createSecureDocumentLink",
      riskLevel: "HIGH",
      input: { documentType: "PAYSTUB", body: "share paystub and ID document" }
    });
    expect(docDecision.requiresApproval).toBe(true);

    const smsDecision = evaluatePolicy({
      toolName: "sendSms",
      riskLevel: "HIGH",
      input: { to: "+12125550199", body: "Available?" },
      consents: []
    });
    expect(smsDecision.allowed).toBe(false);
  });

  it("builds packet checklist and pricing advice from structured facts", () => {
    const listing = normalizeListing(
      {
        address: "112 North 7th Street",
        city: "Brooklyn",
        state: "NY",
        price: 3650,
        bedrooms: 1,
        bathrooms: 1,
        applicationFee: 20
      },
      "RENTCAST"
    );
    const packet = generateApplicationPacket({
      renter: demoProfile,
      listing,
      documents: demoDocuments,
      requestedDocuments: ["PAYSTUB", "PET_RECORD"]
    });
    expect(packet.status).toBe("READY_FOR_REVIEW");

    const pricing = computePricingAdvice(listing, [
      listing,
      { ...listing, id: "comp-1", price: 3500 },
      { ...listing, id: "comp-2", price: 3700 }
    ]);
    expect(pricing.moveInCostEstimate.totalKnownCost).toBeGreaterThan(listing.price);
  });
});
