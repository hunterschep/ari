import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerTourRoutes(app: FastifyInstance, store: AriStore) {
  app.get("/v1/tours", async () => store.listTours());
  app.post("/v1/listings/:id/tour-request", async (request) => store.createMessageDraft((request.params as { id: string }).id));
  app.post("/v1/tours/:id/select-slot", async (request) => store.selectTourSlot((request.params as { id: string }).id, (request.body as { slotIndex?: number }).slotIndex ?? 0));
  app.post("/v1/tours/:id/confirm", async (request) => store.confirmTour((request.params as { id: string }).id));
  app.post("/v1/tours/:id/reschedule", async (request) => store.selectTourSlot((request.params as { id: string }).id, (request.body as { slotIndex?: number }).slotIndex ?? 0));
  app.post("/v1/tours/:id/cancel", async (request) => {
    const tour = store.tours.find((candidate) => candidate.id === (request.params as { id: string }).id);
    if (!tour) throw new Error("Tour not found");
    tour.status = "CANCELLED";
    return tour;
  });
}
