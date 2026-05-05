import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";
import { ListingService } from "./listing.service";

export async function registerListingRoutes(app: FastifyInstance, store: AriStore) {
  const service = new ListingService(store);

  app.get("/v1/listings/:id", async (request) => service.getListing((request.params as { id: string }).id));
  app.post("/v1/listings/import-url", async (request) => store.importListingUrl((request.body as { sourceUrl: string }).sourceUrl));
  app.post("/v1/listings/:id/save", async (request) => service.repository.save((request.params as { id: string }).id));
  app.post("/v1/listings/:id/reject", async (request) => service.repository.reject((request.params as { id: string }).id));
  app.get("/v1/listings/:id/score", async (request) => service.getScore((request.params as { id: string }).id));
  app.get("/v1/listings/:id/pricing-advice", async (request) => service.getPricingAdvice((request.params as { id: string }).id));
  app.get("/v1/listings/:id/building-risk", async (request) => service.getBuildingRisk((request.params as { id: string }).id));
}
