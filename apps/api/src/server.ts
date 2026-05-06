import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { ZodError } from "zod";
import { createAriStore, type AriStore } from "./store";
import { registerRoutes } from "./modules/routes";
import { installAuth, type AuthOptions } from "./auth/context";

export async function buildServer(options: { store?: AriStore; auth?: AuthOptions } = {}) {
  if (!options.store && process.env.NODE_ENV === "production") {
    throw new Error("Production API cannot boot with the in-memory demo store. Configure persistent repositories before NODE_ENV=production.");
  }

  const app = Fastify({
    logger: true
  });
  const store = options.store ?? createAriStore();

  await app.register(cors, { origin: allowedCorsOrigins() });
  await app.register(multipart);
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  installAuth(app, store, options.auth);
  await registerRoutes(app, store);

  app.setErrorHandler((error, request, reply) => {
    const err = error as Error & { statusCode?: number };
    const statusCode = error instanceof ZodError ? 400 : typeof err.statusCode === "number" ? err.statusCode : 500;
    const requestId = request.id;
    if (statusCode >= 500) {
      request.log.error({ err, requestId }, "Unhandled API error");
    }
    reply.status(statusCode).send({
      error: statusCode >= 500 ? "InternalServerError" : error instanceof ZodError ? "ValidationError" : err.name,
      message: statusCode >= 500 ? "Internal server error" : err.message,
      requestId,
      issues: error instanceof ZodError ? error.issues : undefined
    });
  });

  return app;
}

function allowedCorsOrigins() {
  if (process.env.NODE_ENV === "test") return true;
  return (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
