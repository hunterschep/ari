import { createHmac } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../apps/api/src/server";
import { createAriStore } from "../../apps/api/src/store";

const webhookSecret = "test-webhook-secret";
const originalWebhookSecret = process.env.WEBHOOK_SHARED_SECRET;
const originalLocalAuthFallback = process.env.ENABLE_LOCAL_AUTH_FALLBACK;
const originalClerkSecret = process.env.CLERK_SECRET_KEY;

describe("api", () => {
  beforeEach(() => {
    process.env.WEBHOOK_SHARED_SECRET = webhookSecret;
    process.env.ENABLE_LOCAL_AUTH_FALLBACK = "false";
    delete process.env.CLERK_SECRET_KEY;
  });

  afterAll(() => {
    restoreEnv("WEBHOOK_SHARED_SECRET", originalWebhookSecret);
    restoreEnv("ENABLE_LOCAL_AUTH_FALLBACK", originalLocalAuthFallback);
    restoreEnv("CLERK_SECRET_KEY", originalClerkSecret);
  });

  it("runs the complete MVP journey through API state transitions", async () => {
    const store = createAriStore();
    const app = await buildServer({ store, auth: { allowLocalFallback: true } });

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

    const inboundPayload = {
      conversationId: sent.json().conversationId,
      listingId: top.listing.id,
      from: "leasing@example.com",
      body: "Yes it’s available. We can show Thursday at 6pm or Saturday at 10am. Any pets?"
    };
    const inbound = await app.inject({
      method: "POST",
      url: "/v1/webhooks/postmark/inbound",
      headers: signedWebhookHeaders(inboundPayload),
      payload: inboundPayload
    });
    expect(inbound.json().parsed.intent).toBe("TOUR_SLOTS_PROPOSED");

    const tours = await app.inject({ method: "GET", url: "/v1/tours" });
    const tour = tours.json()[0];
    expect(tour.proposedSlots).toHaveLength(2);

    await app.inject({ method: "POST", url: `/v1/tours/${tour.id}/select-slot`, payload: { slotIndex: 1 } });
    const confirmed = await app.inject({ method: "POST", url: `/v1/tours/${tour.id}/confirm` });
    expect(confirmed.json().status).toBe("CONFIRMED");
    expect(confirmed.json().calendarEventId).toBeTruthy();
    const confirmedAgain = await app.inject({ method: "POST", url: `/v1/tours/${tour.id}/confirm` });
    expect(confirmedAgain.json().calendarEventId).toBe(confirmed.json().calendarEventId);

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
    const sentPacketAgain = await app.inject({ method: "POST", url: `/v1/application-packets/${packet.id}/send` });
    expect(sentPacketAgain.json().sentAt).toBe(sentPacket.json().sentAt);

    const pricing = await app.inject({ method: "GET", url: `/v1/listings/${top.listing.id}/pricing-advice` });
    expect(pricing.json().moveInCostEstimate.totalKnownCost).toBeGreaterThan(0);

    const audit = await app.inject({ method: "GET", url: "/v1/admin/audit-logs", headers: { "x-ari-role": "ADMIN" } });
    expect(audit.json().some((entry: { action: string }) => entry.action === "APPLICATION_PACKET_SENT")).toBe(true);

    await app.close();
  });

  it("exposes enterprise pipeline, map, account, and integration surfaces", async () => {
    const store = createAriStore();
    const app = await buildServer({ store, auth: { allowLocalFallback: true } });

    const dashboard = await app.inject({ method: "GET", url: "/v1/dashboard" });
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.json().summary.pipelineItems).toBeGreaterThan(0);
    expect(dashboard.json().tasks.length).toBeGreaterThan(0);

    const inquiries = await app.inject({ method: "GET", url: "/v1/search-sessions/search-demo/inquiries" });
    expect(inquiries.statusCode).toBe(200);
    const firstInquiry = inquiries.json()[0];
    expect(firstInquiry.pipeline.nextAction).toBeTruthy();

    const map = await app.inject({ method: "GET", url: "/v1/search-sessions/search-demo/map" });
    expect(map.statusCode).toBe(200);
    expect(map.json().features.length).toBe(inquiries.json().length);
    expect(map.json().features[0].lat).toBeGreaterThan(40);

    const action = await app.inject({
      method: "POST",
      url: `/v1/listing-pipeline/${firstInquiry.pipeline.id}/actions`,
      payload: { action: "DRAFT_OUTREACH" }
    });
    expect(action.statusCode).toBe(200);
    expect(action.json().draft.status).toBe("PENDING_APPROVAL");
    expect(action.json().pipeline.status).toBe("APPROVAL_PENDING");

    const account = await app.inject({ method: "GET", url: "/v1/account/settings" });
    expect(account.statusCode).toBe(200);
    expect(account.json().accountSettings.email).toBe("alex.renter@example.com");

    const integrations = await app.inject({ method: "GET", url: "/v1/integrations" });
    expect(integrations.statusCode).toBe(200);
    expect(integrations.json().connections.some((connection: { provider: string }) => connection.provider === "MAPBOX")).toBe(true);

    await app.close();
  });

  it("requires explicit local auth fallback for protected routes", async () => {
    const app = await buildServer({ store: createAriStore() });

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    const protectedRoute = await app.inject({ method: "GET", url: "/v1/renter-profile" });
    expect(protectedRoute.statusCode).toBe(401);

    await app.close();
  });

  it("enforces admin roles even when demo auth is explicitly enabled", async () => {
    const app = await buildServer({ store: createAriStore(), auth: { allowLocalFallback: true } });

    const renter = await app.inject({ method: "GET", url: "/v1/admin/users" });
    expect(renter.statusCode).toBe(403);

    const admin = await app.inject({ method: "GET", url: "/v1/admin/users", headers: { "x-ari-role": "ADMIN" } });
    expect(admin.statusCode).toBe(200);

    await app.close();
  });

  it("rejects unsigned webhooks and accepts signed provider callbacks", async () => {
    const app = await buildServer({ store: createAriStore(), auth: { allowLocalFallback: true } });
    const payload = { MessageSid: "SM-test", MessageStatus: "delivered" };

    const unsigned = await app.inject({
      method: "POST",
      url: "/v1/webhooks/twilio/status",
      payload
    });
    expect(unsigned.statusCode).toBe(401);

    const signed = await app.inject({
      method: "POST",
      url: "/v1/webhooks/twilio/status",
      headers: signedWebhookHeaders(payload),
      payload
    });
    expect(signed.statusCode).toBe(200);
    expect(signed.json().signatureVerified).toBe(true);

    await app.close();
  });

  it("validates document uploads before creating sensitive application records", async () => {
    const app = await buildServer({ store: createAriStore(), auth: { allowLocalFallback: true } });

    const pathTraversal = await app.inject({
      method: "POST",
      url: "/v1/documents/upload-url",
      payload: { fileName: "../id.pdf", contentType: "application/pdf" }
    });
    expect(pathTraversal.statusCode).toBe(400);

    const unsupportedMime = await app.inject({
      method: "POST",
      url: "/v1/documents/upload-url",
      payload: { fileName: "id.exe", contentType: "application/x-msdownload" }
    });
    expect(unsupportedMime.statusCode).toBe(400);

    const foreignStorageKey = await app.inject({
      method: "POST",
      url: "/v1/documents/complete-upload",
      payload: { fileName: "id.pdf", mimeType: "application/pdf", storageKey: "other-user/id.pdf", sizeBytes: 1000 }
    });
    expect(foreignStorageKey.statusCode).toBe(403);

    const oversize = await app.inject({
      method: "POST",
      url: "/v1/documents/complete-upload",
      payload: { fileName: "id.pdf", mimeType: "application/pdf", storageKey: "user-demo/id.pdf", sizeBytes: 21 * 1024 * 1024 }
    });
    expect(oversize.statusCode).toBe(400);

    await app.close();
  });

  it("requires server-issued upload sessions before completing document uploads", async () => {
    const app = await buildServer({ store: createAriStore(), auth: { allowLocalFallback: true } });
    const checksum = "a".repeat(64);

    const sessionResponse = await app.inject({
      method: "POST",
      url: "/v1/documents/upload-sessions",
      payload: { fileName: "bank-statement.pdf", mimeType: "application/pdf", sizeBytes: 2048, checksumSha256: checksum }
    });
    expect(sessionResponse.statusCode).toBe(200);
    const session = sessionResponse.json();
    expect(session.id).toBeTruthy();
    expect(session.storageKey).toContain("user-demo/");
    expect(session.uploadUrl).toContain("ari.local");

    const wrongStorageKey = await app.inject({
      method: "POST",
      url: `/v1/documents/upload-sessions/${session.id}/complete`,
      payload: { storageKey: "user-demo/wrong.pdf", sizeBytes: 2048, checksumSha256: checksum }
    });
    expect(wrongStorageKey.statusCode).toBe(409);

    const checksumMismatch = await app.inject({
      method: "POST",
      url: `/v1/documents/upload-sessions/${session.id}/complete`,
      payload: { storageKey: session.storageKey, sizeBytes: 2048, checksumSha256: "b".repeat(64) }
    });
    expect(checksumMismatch.statusCode).toBe(409);

    const completed = await app.inject({
      method: "POST",
      url: `/v1/documents/upload-sessions/${session.id}/complete`,
      payload: { storageKey: session.storageKey, sizeBytes: 2048, checksumSha256: checksum }
    });
    expect(completed.statusCode).toBe(200);
    expect(completed.json().session.status).toBe("COMPLETED");
    expect(completed.json().document.storageKey).toBe(session.storageKey);

    const completedAgain = await app.inject({
      method: "POST",
      url: `/v1/documents/upload-sessions/${session.id}/complete`,
      payload: { storageKey: session.storageKey, sizeBytes: 2048, checksumSha256: checksum }
    });
    expect(completedAgain.statusCode).toBe(200);
    expect(completedAgain.json().document.id).toBe(completed.json().document.id);

    await app.close();
  });

  it("accepts validated user data export/delete requests and dedupes open requests", async () => {
    const app = await buildServer({ store: createAriStore(), auth: { allowLocalFallback: true } });

    const invalid = await app.inject({
      method: "POST",
      url: "/v1/me/data-requests",
      payload: { type: "PRINT_EVERYTHING" }
    });
    expect(invalid.statusCode).toBe(400);

    const created = await app.inject({
      method: "POST",
      url: "/v1/me/data-requests",
      payload: { type: "EXPORT", notes: "Need a copy of my account data." }
    });
    expect(created.statusCode).toBe(200);
    expect(created.json().status).toBe("REQUESTED");

    const duplicate = await app.inject({
      method: "POST",
      url: "/v1/me/data-requests",
      payload: { type: "EXPORT" }
    });
    expect(duplicate.json().id).toBe(created.json().id);

    const list = await app.inject({ method: "GET", url: "/v1/me/data-requests" });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });
});

function signedWebhookHeaders(payload: unknown) {
  return {
    "x-ari-signature": createHmac("sha256", webhookSecret).update(JSON.stringify(payload)).digest("hex")
  };
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
