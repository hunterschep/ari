import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerMessagingRoutes(app: FastifyInstance, store: AriStore) {
  app.post("/v1/listings/:id/message-drafts", async (request) => store.createMessageDraft((request.params as { id: string }).id));
  app.get("/v1/message-drafts/:id", async (request) => store.getDraft((request.params as { id: string }).id));
  app.patch("/v1/message-drafts/:id", async (request) => store.updateDraft((request.params as { id: string }).id, request.body as Record<string, never>));
  app.post("/v1/message-drafts/:id/approve", async (request) => store.approveDraft((request.params as { id: string }).id));
  app.post("/v1/message-drafts/:id/send", async (request) => store.sendDraft((request.params as { id: string }).id));
  app.get("/v1/conversations", async () => store.listConversations());
  app.get("/v1/conversations/:id", async (request) => store.getConversation((request.params as { id: string }).id));
  app.post("/v1/conversations/:id/reply-draft", async (request) => {
    const conversation = store.getConversation((request.params as { id: string }).id);
    return store.createMessageDraft(conversation.listingId);
  });
  app.post("/v1/conversations/:id/send", async (request) => {
    const body = request.body as { draftId: string };
    return store.sendDraft(body.draftId);
  });
}
