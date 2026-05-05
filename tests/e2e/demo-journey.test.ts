import { describe, expect, it } from "vitest";
import { parseInboundMessage } from "@ari/agents";
import { demoDocuments, demoListings, demoProfile, demoResults } from "../../apps/web/lib/mock";
import { generateApplicationPacket } from "@ari/agents";

describe("customer/investor demo journey", () => {
  it("covers onboarding to pricing advice without workflow gaps", () => {
    expect(demoProfile.targetCity).toBe("NYC");
    expect(demoProfile.budgetMax).toBe(3800);
    expect(demoResults.length).toBeGreaterThanOrEqual(3);
    expect(demoResults[0]?.score.explanation?.summary).toBeTruthy();

    const inbound = parseInboundMessage("Yes it’s available. We can show Thursday at 6pm or Saturday at 10am. Any pets?");
    expect(inbound.intent).toBe("TOUR_SLOTS_PROPOSED");
    expect(inbound.extracted.proposedTourSlots).toHaveLength(2);

    const packet = generateApplicationPacket({
      renter: demoProfile,
      listing: demoListings[0]!,
      documents: demoDocuments,
      requestedDocuments: ["PAYSTUB", "PET_RECORD"]
    });
    expect(packet.status).toBe("READY_FOR_REVIEW");
    expect(packet.secureShareUrl).toContain("https://ari.local/share");

    const pricing = demoResults[0]?.pricingAdvice;
    expect(pricing?.moveInCostEstimate.totalKnownCost).toBeGreaterThan(0);
    expect(pricing?.verdict).toBeTruthy();
  });
});
