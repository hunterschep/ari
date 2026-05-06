import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AriStore } from "../../store";

const maxDocumentBytes = 20 * 1024 * 1024;

const ApplicationDocumentTypeSchema = z.enum([
  "ID",
  "PAYSTUB",
  "BANK_STATEMENT",
  "EMPLOYMENT_LETTER",
  "TAX_RETURN",
  "W2",
  "OFFER_LETTER",
  "CREDIT_REPORT",
  "BACKGROUND_CHECK",
  "PET_RECORD",
  "GUARANTOR_DOC",
  "OTHER"
]);

const ApplicationDocumentStatusSchema = z.enum(["UPLOADED", "CLASSIFIED", "NEEDS_REVIEW", "APPROVED", "EXPIRED", "DELETED"]);
const SafeFileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .refine((fileName) => !/[\\/]/.test(fileName) && !fileName.includes(".."), "fileName must be a plain file name");
const DocumentMimeTypeSchema = z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const UploadUrlSchema = z.object({
  fileName: SafeFileNameSchema,
  contentType: DocumentMimeTypeSchema
});

const CompleteUploadSchema = z.object({
  fileName: SafeFileNameSchema,
  mimeType: DocumentMimeTypeSchema,
  storageKey: z.string().min(1).max(512),
  sizeBytes: z.number().int().positive().max(maxDocumentBytes),
  type: ApplicationDocumentTypeSchema.optional()
});

const ChecksumSchema = z.string().regex(/^[a-f0-9]{64}$/i);

const UploadSessionSchema = z.object({
  fileName: SafeFileNameSchema,
  mimeType: DocumentMimeTypeSchema,
  sizeBytes: z.number().int().positive().max(maxDocumentBytes),
  checksumSha256: ChecksumSchema.optional()
});

const CompleteUploadSessionSchema = z.object({
  storageKey: z.string().min(1).max(512),
  sizeBytes: z.number().int().positive().max(maxDocumentBytes),
  checksumSha256: ChecksumSchema.optional()
});

const DocumentPatchSchema = z
  .object({
    type: ApplicationDocumentTypeSchema.optional(),
    status: ApplicationDocumentStatusSchema.optional(),
    expiresAt: z.string().optional()
  })
  .strict();

const PacketRequestSchema = z.object({
  requestedDocuments: z.array(ApplicationDocumentTypeSchema).max(12).default([])
});

export async function registerDocumentRoutes(app: FastifyInstance, store: AriStore) {
  app.post("/v1/documents/upload-sessions", async (request) => store.createUploadSession(UploadSessionSchema.parse(request.body)));
  app.post("/v1/documents/upload-sessions/:id/complete", async (request) =>
    store.completeUploadSession((request.params as { id: string }).id, CompleteUploadSessionSchema.parse(request.body))
  );
  app.post("/v1/documents/upload-url", async (request) => store.createUploadUrl(UploadUrlSchema.parse(request.body)));
  app.post("/v1/documents/complete-upload", async (request) => {
    const input = CompleteUploadSchema.parse(request.body);
    assertOwnedStorageKey(input.storageKey, store.user.id);
    return store.completeUpload(input);
  });
  app.get("/v1/documents", async () => store.documents);
  app.get("/v1/documents/:id", async (request) => {
    const document = store.documents.find((candidate) => candidate.id === (request.params as { id: string }).id);
    if (!document) throw httpError(404, "Document not found");
    return document;
  });
  app.patch("/v1/documents/:id", async (request) => store.updateDocument((request.params as { id: string }).id, DocumentPatchSchema.parse(request.body)));
  app.delete("/v1/documents/:id", async (request) => store.deleteDocument((request.params as { id: string }).id));
  app.post("/v1/listings/:id/application-packet", async (request) => {
    const input = PacketRequestSchema.parse(request.body ?? {});
    return store.generatePacket((request.params as { id: string }).id, input.requestedDocuments);
  });
  app.get("/v1/application-packets/:id", async (request) => {
    const packet = store.packets.find((candidate) => candidate.id === (request.params as { id: string }).id);
    if (!packet) throw httpError(404, "Application packet not found");
    return packet;
  });
  app.post("/v1/application-packets/:id/approve", async (request) => store.approvePacket((request.params as { id: string }).id));
  app.post("/v1/application-packets/:id/send", async (request) => store.sendPacket((request.params as { id: string }).id));
  app.post("/v1/application-packets/:id/revoke-links", async (request) => store.revokePacketLinks((request.params as { id: string }).id));
}

function assertOwnedStorageKey(storageKey: string, userId: string) {
  if (!storageKey.startsWith(`${userId}/`) || storageKey.includes("..")) {
    throw httpError(403, "Storage key does not belong to the authenticated user");
  }
}

function httpError(statusCode: number, message: string) {
  const error = new Error(message);
  (error as Error & { statusCode?: number }).statusCode = statusCode;
  return error;
}
