import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerAdminRoutes(app: FastifyInstance, store: AriStore) {
  app.get("/v1/admin/users", async () => [store.user]);
  app.get("/v1/admin/search-sessions", async () => store.sessions);
  app.get("/v1/admin/listings", async () => store.listings);
  app.get("/v1/admin/listings/review", async () => store.listings.filter((listing) => listing.dedupeState !== "UNIQUE" || listing.confidence < 70));
  app.patch("/v1/admin/listings/:id", async (request) => {
    const listing = store.listings.find((candidate) => candidate.id === (request.params as { id: string }).id);
    if (!listing) throw new Error("Listing not found");
    Object.assign(listing, request.body);
    return listing;
  });
  app.post("/v1/admin/landlord-feeds/upload", async (request) => ({ id: "feed-demo", status: "UPLOADED", rows: Array.isArray(request.body) ? request.body.length : 1 }));
  app.post("/v1/admin/landlord-feeds/:id/import", async (request) => store.createManualListing((request.body as Record<string, unknown>) ?? {}));
  app.get("/v1/admin/landlord-feeds/:id/errors", async () => []);
  app.get("/v1/admin/conversations", async () => store.listConversations());
  app.get("/v1/admin/approvals", async () => store.approvals);
  app.get("/v1/admin/agent-runs", async () => store.agentRuns);
  app.get("/v1/admin/agent-runs/:id", async (request) => store.agentRuns.find((run) => run.id === (request.params as { id: string }).id));
  app.get("/v1/admin/tool-calls", async () => store.toolCalls);
  app.get("/v1/admin/workflows", async () => store.workflowRuns);
  app.post("/v1/admin/workflows/:id/retry", async (request) => ({ ok: true, workflowId: (request.params as { id: string }).id, status: "RETRIED" }));
  app.get("/v1/admin/compliance-flags", async () => store.complianceFlags);
  app.post("/v1/admin/compliance-flags/:id/resolve", async (request) => store.resolveComplianceFlag((request.params as { id: string }).id));
  app.get("/v1/admin/integrations", async () => ({
    rentcast: "mock",
    email: "mock-sendgrid",
    sms: "mock-twilio",
    calendar: "mock-google-calendar",
    objectStorage: "mock-s3"
  }));
  app.get("/v1/admin/audit-logs", async () => store.auditLogs);
}
