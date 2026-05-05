import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerCalendarRoutes(app: FastifyInstance, store: AriStore) {
  app.get("/v1/calendar/status", async () => ({
    connected: store.consents.some((consent) => consent.type === "WRITE_CALENDAR" && consent.status === "GRANTED"),
    provider: "google-calendar"
  }));
  app.post("/v1/calendar/google/oauth/start", async () => ({ url: "https://accounts.google.com/o/oauth2/v2/auth?mock=ari" }));
  app.get("/v1/calendar/google/oauth/callback", async () => store.grantConsent({ type: "WRITE_CALENDAR", scope: "ONGOING" }));
  app.post("/v1/calendar/disconnect", async () => {
    const consent = store.consents.find((candidate) => candidate.type === "WRITE_CALENDAR" && candidate.status === "GRANTED");
    return consent ? store.revokeConsent(consent.id) : { ok: true };
  });
}
