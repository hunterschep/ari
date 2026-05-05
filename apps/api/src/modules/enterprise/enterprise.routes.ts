import type { FastifyInstance } from "fastify";
import type { IntegrationProvider, ListingPipelineStatus, PipelineAction } from "@ari/schemas";
import type { AriStore } from "../../store";

export async function registerEnterpriseRoutes(app: FastifyInstance, store: AriStore) {
  app.get("/v1/dashboard", async () => store.getDashboard());

  app.get("/v1/listing-pipeline", async (request) => {
    const query = request.query as { searchSessionId?: string; status?: ListingPipelineStatus; limit?: string };
    return store.listPipeline({
      searchSessionId: query.searchSessionId,
      status: query.status,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });
  app.get("/v1/listing-pipeline/:id", async (request) => store.getPipelineItem((request.params as { id: string }).id));
  app.post("/v1/listing-pipeline/:id/actions", async (request) => {
    const body = (request.body ?? {}) as { action?: PipelineAction; payload?: Record<string, unknown> };
    if (!body.action) throw new Error("Pipeline action is required");
    return store.performPipelineAction((request.params as { id: string }).id, body.action, body.payload ?? {});
  });

  app.get("/v1/search-sessions/:id/map", async (request) => store.getSearchMap((request.params as { id: string }).id));
  app.get("/v1/search-sessions/:id/inquiries", async (request) => store.getInquiries((request.params as { id: string }).id));

  app.get("/v1/account/settings", async () => store.getAccountSettings());
  app.patch("/v1/account/settings", async (request) => store.updateAccountSettings((request.body ?? {}) as Record<string, never>));

  app.get("/v1/integrations", async () => store.listIntegrations());
  app.post("/v1/integrations/:provider/connect", async (request) =>
    store.connectIntegration((request.params as { provider: IntegrationProvider }).provider, (request.body ?? {}) as Record<string, unknown>)
  );
  app.post("/v1/integrations/:provider/disconnect", async (request) =>
    store.disconnectIntegration((request.params as { provider: IntegrationProvider }).provider)
  );

  app.get("/v1/admin/ops-summary", async () => store.getAdminOpsSummary());
}
