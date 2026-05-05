import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerApprovalRoutes(app: FastifyInstance, store: AriStore) {
  app.get("/v1/approvals", async () => store.approvals);
  app.get("/v1/approvals/:id", async (request) => store.approvals.find((approval) => approval.id === (request.params as { id: string }).id));
  app.post("/v1/approvals/:id/approve", async (request) => store.approve((request.params as { id: string }).id));
  app.post("/v1/approvals/:id/reject", async (request) => store.reject((request.params as { id: string }).id));
  app.post("/v1/approvals/:id/edit-and-approve", async (request) => {
    const approval = store.approve((request.params as { id: string }).id);
    approval.body = (request.body as { body?: string }).body ?? approval.body;
    return approval;
  });
}
