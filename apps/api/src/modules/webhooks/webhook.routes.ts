import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerWebhookRoutes(app: FastifyInstance, store: AriStore) {
  app.post("/v1/webhooks/twilio/inbound", async (request) => {
    store.recordWebhook("TWILIO", "inbound_message", (request.body ?? {}) as Record<string, unknown>);
    return store.receiveInbound(request.body as { conversationId?: string; listingId?: string; from?: string; body: string });
  });
  app.post("/v1/webhooks/twilio/status", async (request) => store.recordWebhook("TWILIO", "message_status", (request.body ?? {}) as Record<string, unknown>));
  app.post("/v1/webhooks/sendgrid/events", async (request) => store.recordWebhook("SENDGRID", "message_events", (request.body ?? {}) as Record<string, unknown>));
  app.post("/v1/webhooks/postmark/inbound", async (request) => {
    store.recordWebhook("SENDGRID", "postmark_inbound", (request.body ?? {}) as Record<string, unknown>);
    return store.receiveInbound(request.body as { conversationId?: string; listingId?: string; from?: string; body: string });
  });
  app.post("/v1/webhooks/google-calendar", async (request) => store.recordWebhook("GOOGLE_CALENDAR", "calendar_event", (request.body ?? {}) as Record<string, unknown>));
}
