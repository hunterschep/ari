import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerAuthRoutes(app: FastifyInstance, store: AriStore) {
  app.post("/v1/auth/register", async (request) => store.registerUser(request.body as { email?: string; phone?: string }));
  app.post("/v1/auth/login", async (request) => store.login(request.body as { email?: string }));
  app.get("/v1/auth/session", async (request) => store.getSession(request.headers.authorization?.replace(/^Bearer\s+/i, "")));
  app.post("/v1/auth/logout", async (request) => store.logout(request.headers.authorization?.replace(/^Bearer\s+/i, "")));
  app.get("/v1/me", async () => store.getMe());
  app.patch("/v1/me", async (request) => store.updateMe(request.body as Record<string, never>));
  app.get("/v1/me/consents", async () => store.consents);
  app.post("/v1/me/consents", async (request) => store.grantConsent(request.body as Record<string, never>));
  app.patch("/v1/me/consents/:id/revoke", async (request) => store.revokeConsent((request.params as { id: string }).id));
}
