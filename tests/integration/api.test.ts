import { describe, expect, it } from "vitest";
import { buildServer } from "../../apps/api/src/server";
import { createAriStore } from "../../apps/api/src/store";

describe("api", () => {
  it("runs the complete MVP journey through API state transitions", async () => {
    const store = createAriStore();
    const app = await buildServer({ store });

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    const profile = await app.inject({ method: "GET", url: "/v1/renter-profile" });
    expect(profile.json().targetCity).toBe("NYC");

    const auth = await app.inject({ method: "POST", url: "/v1/auth/login", payload: { email: "alex.renter@example.com" } });
    expect(auth.statusCode).toBe(200);
    expect(auth.json().session.token).toBeTruthy();

    const refresh = await app.inject({ method: "POST", url: "/v1/search-sessions/search-demo/refresh" });
    expect(refresh.statusCode).toBe(200);
    expect(refresh.json().ranked).toBeGreaterThanOrEqual(3);

    const results = await app.inject({ method: "GET", url: "/v1/search-sessions/search-demo/results" });
    const top = results.json()[0];
    expect(top.score.totalScore).toBeGreaterThan(0);

    const draftResponse = await app.inject({ method: "POST", url: `/v1/listings/${top.listing.id}/message-drafts` });
    const draft = draftResponse.json();
    expect(draft.status).toBe("PENDING_APPROVAL");

    await app.inject({ method: "POST", url: `/v1/message-drafts/${draft.id}/approve` });
    const sent = await app.inject({ method: "POST", url: `/v1/message-drafts/${draft.id}/send` });
    expect(sent.statusCode).toBe(200);
    expect(sent.json().direction).toBe("OUTBOUND");

    const inbound = await app.inject({
      method: "POST",
      url: "/v1/webhooks/postmark/inbound",
      payload: {
        conversationId: sent.json().conversationId,
        listingId: top.listing.id,
        from: "leasing@example.com",
        body: "Yes it’s available. We can show Thursday at 6pm or Saturday at 10am. Any pets?"
      }
    });
    expect(inbound.json().parsed.intent).toBe("TOUR_SLOTS_PROPOSED");

    const tours = await app.inject({ method: "GET", url: "/v1/tours" });
    const tour = tours.json()[0];
    expect(tour.proposedSlots).toHaveLength(2);

    await app.inject({ method: "POST", url: `/v1/tours/${tour.id}/select-slot`, payload: { slotIndex: 1 } });
    const confirmed = await app.inject({ method: "POST", url: `/v1/tours/${tour.id}/confirm` });
    expect(confirmed.json().status).toBe("CONFIRMED");
    expect(confirmed.json().calendarEventId).toBeTruthy();

    const uploadUrl = await app.inject({
      method: "POST",
      url: "/v1/documents/upload-url",
      payload: { fileName: "alex-id.pdf", contentType: "application/pdf" }
    });
    expect(uploadUrl.json().uploadUrl).toContain("ari.local");

    await app.inject({
      method: "POST",
      url: "/v1/documents/complete-upload",
      payload: { fileName: "alex-id.pdf", mimeType: "application/pdf", storageKey: uploadUrl.json().storageKey, sizeBytes: 1000 }
    });

    const packetResponse = await app.inject({
      method: "POST",
      url: `/v1/listings/${top.listing.id}/application-packet`,
      payload: { requestedDocuments: ["ID", "PAYSTUB", "PET_RECORD"] }
    });
    const packet = packetResponse.json();
    expect(packet.status).toBe("READY_FOR_REVIEW");

    await app.inject({ method: "POST", url: `/v1/application-packets/${packet.id}/approve` });
    const sentPacket = await app.inject({ method: "POST", url: `/v1/application-packets/${packet.id}/send` });
    expect(sentPacket.json().status).toBe("SENT");

    const pricing = await app.inject({ method: "GET", url: `/v1/listings/${top.listing.id}/pricing-advice` });
    expect(pricing.json().moveInCostEstimate.totalKnownCost).toBeGreaterThan(0);

    const audit = await app.inject({ method: "GET", url: "/v1/admin/audit-logs" });
    expect(audit.json().some((entry: { action: string }) => entry.action === "APPLICATION_PACKET_SENT")).toBe(true);

    await app.close();
  });
});
