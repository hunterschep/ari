import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerDocumentRoutes(app: FastifyInstance, store: AriStore) {
  app.post("/v1/documents/upload-url", async (request) => store.createUploadUrl(request.body as { fileName: string; contentType: string }));
  app.post("/v1/documents/complete-upload", async (request) => store.completeUpload(request.body as { fileName: string; mimeType: string; storageKey: string; sizeBytes: number }));
  app.get("/v1/documents", async () => store.documents);
  app.get("/v1/documents/:id", async (request) => store.documents.find((document) => document.id === (request.params as { id: string }).id));
  app.patch("/v1/documents/:id", async (request) => store.updateDocument((request.params as { id: string }).id, request.body as Record<string, never>));
  app.delete("/v1/documents/:id", async (request) => store.deleteDocument((request.params as { id: string }).id));
  app.post("/v1/listings/:id/application-packet", async (request) => store.generatePacket((request.params as { id: string }).id, (request.body as { requestedDocuments?: string[] })?.requestedDocuments ?? []));
  app.get("/v1/application-packets/:id", async (request) => store.packets.find((packet) => packet.id === (request.params as { id: string }).id));
  app.post("/v1/application-packets/:id/approve", async (request) => store.approvePacket((request.params as { id: string }).id));
  app.post("/v1/application-packets/:id/send", async (request) => store.sendPacket((request.params as { id: string }).id));
  app.post("/v1/application-packets/:id/revoke-links", async (request) => store.revokePacketLinks((request.params as { id: string }).id));
}
