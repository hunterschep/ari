import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerWebhookRoutes(app: FastifyInstance, store: AriStore) {
  app.post("/v1/webhooks/twilio/inbound", async (request) => store.receiveInbound(request.body as { conversationId?: string; listingId?: string; from?: string; body: string }));
  app.post("/v1/webhooks/twilio/status", async (request) => ({ ok: true, provider: "twilio", payload: request.body }));
  app.post("/v1/webhooks/sendgrid/events", async (request) => ({ ok: true, provider: "sendgrid", payload: request.body }));
  app.post("/v1/webhooks/postmark/inbound", async (request) => store.receiveInbound(request.body as { conversationId?: string; listingId?: string; from?: string; body: string }));
  app.post("/v1/webhooks/google-calendar", async (request) => ({ ok: true, provider: "google-calendar", payload: request.body }));
}
