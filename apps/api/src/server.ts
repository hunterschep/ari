import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { createAriStore, type AriStore } from "./store";
import { registerRoutes } from "./modules/routes";

export async function buildServer(options: { store?: AriStore } = {}) {
  const app = Fastify({
    logger: true
  });
  const store = options.store ?? createAriStore();

  await app.register(cors, { origin: true });
  await app.register(multipart);
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await registerRoutes(app, store);

  app.setErrorHandler((error, _request, reply) => {
    const err = error as Error & { statusCode?: number };
    const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
    reply.status(statusCode).send({
      error: err.name,
      message: err.message
    });
  });

  return app;
}
