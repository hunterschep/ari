import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AriStore } from "../../store";

type WebhookProvider = "TWILIO" | "SENDGRID" | "POSTMARK" | "GOOGLE_CALENDAR";

const InboundWebhookSchema = z.object({
  conversationId: z.string().optional(),
  listingId: z.string().optional(),
  from: z.string().optional(),
  body: z.string().min(1)
});

export async function registerWebhookRoutes(app: FastifyInstance, store: AriStore) {
  app.post("/v1/webhooks/twilio/inbound", async (request) => {
    await verifyWebhook(request, "TWILIO");
    const payload = InboundWebhookSchema.parse(request.body ?? {});
    store.recordWebhook("TWILIO", "inbound_message", payload, true);
    return store.receiveInbound(payload);
  });
  app.post("/v1/webhooks/twilio/status", async (request) => {
    await verifyWebhook(request, "TWILIO");
    return store.recordWebhook("TWILIO", "message_status", asPayload(request.body), true);
  });
  app.post("/v1/webhooks/sendgrid/events", async (request) => {
    await verifyWebhook(request, "SENDGRID");
    return store.recordWebhook("SENDGRID", "message_events", asPayload(request.body), true);
  });
  app.post("/v1/webhooks/postmark/inbound", async (request) => {
    await verifyWebhook(request, "POSTMARK");
    const payload = InboundWebhookSchema.parse(request.body ?? {});
    store.recordWebhook("SENDGRID", "postmark_inbound", payload, true);
    return store.receiveInbound(payload);
  });
  app.post("/v1/webhooks/google-calendar", async (request) => {
    await verifyWebhook(request, "GOOGLE_CALENDAR");
    return store.recordWebhook("GOOGLE_CALENDAR", "calendar_event", asPayload(request.body), true);
  });
}

async function verifyWebhook(request: FastifyRequest, provider: WebhookProvider) {
  const secret = webhookSecret(provider);
  if (!secret) {
    throw httpError(503, `${provider} webhook signing secret is not configured`);
  }

  const signature = normalizeSignature(headerValue(request, "x-ari-signature"));
  if (!signature) {
    throw httpError(401, "Webhook signature required");
  }

  const expected = signPayload(request.body ?? {}, secret);
  if (!safeEqual(signature, expected)) {
    throw httpError(401, "Webhook signature invalid");
  }
}

function webhookSecret(provider: WebhookProvider) {
  return process.env[`${provider}_WEBHOOK_SECRET`] || process.env.WEBHOOK_SHARED_SECRET;
}

function signPayload(payload: unknown, secret: string) {
  return createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

function normalizeSignature(value: string | undefined) {
  return value?.replace(/^sha256=/i, "").trim();
}

function headerValue(request: FastifyRequest, name: string) {
  const value = request.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

function safeEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function asPayload(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) return payload as Record<string, unknown>;
  return { payload };
}

function httpError(statusCode: number, message: string) {
  const error = new Error(message);
  (error as Error & { statusCode?: number }).statusCode = statusCode;
  return error;
}
