import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerSearchSessionRoutes(app: FastifyInstance, store: AriStore) {
  app.post("/v1/search-sessions", async (request) => store.createSearchSession(request.body as Record<string, never>));
  app.get("/v1/search-sessions", async () => store.sessions);
  app.get("/v1/search-sessions/:id", async (request) => store.getSearchSession((request.params as { id: string }).id));
  app.patch("/v1/search-sessions/:id", async (request) => store.updateSearchSession((request.params as { id: string }).id, request.body as Record<string, never>));
  app.post("/v1/search-sessions/:id/start", async (request) => store.startSearchSession((request.params as { id: string }).id));
  app.post("/v1/search-sessions/:id/pause", async (request) => store.pauseSearchSession((request.params as { id: string }).id));
  app.post("/v1/search-sessions/:id/refresh", async (request) => store.refreshSearchSession((request.params as { id: string }).id));
  app.get("/v1/search-sessions/:id/results", async (request) => store.getSearchResults((request.params as { id: string }).id));
}
