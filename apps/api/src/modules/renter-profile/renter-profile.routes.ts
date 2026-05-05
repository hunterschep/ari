import type { FastifyInstance } from "fastify";
import type { AriStore } from "../../store";

export async function registerRenterProfileRoutes(app: FastifyInstance, store: AriStore) {
  app.get("/v1/renter-profile", async () => store.getProfile());
  app.patch("/v1/renter-profile", async (request) => store.updateProfile(request.body as Record<string, never>));
  app.post("/v1/renter-profile/validate", async () => store.validateProfile());
  app.post("/v1/renter-profile/commute-anchors", async (request) => {
    const profile = store.getProfile();
    profile.commuteAnchors.push(request.body as never);
    return store.updateProfile({ commuteAnchors: profile.commuteAnchors });
  });
  app.delete("/v1/renter-profile/commute-anchors/:id", async (request) => {
    const id = (request.params as { id: string }).id;
    return store.updateProfile({ commuteAnchors: store.getProfile().commuteAnchors.filter((anchor) => anchor.id !== id) });
  });
  app.post("/v1/renter-profile/pets", async (request) => {
    const profile = store.getProfile();
    profile.pets.push(request.body as never);
    return store.updateProfile({ pets: profile.pets });
  });
  app.patch("/v1/renter-profile/preferences", async (request) => {
    const profile = store.getProfile();
    return store.updateProfile({ preferences: { ...profile.preferences, ...(request.body as Record<string, never>) } });
  });
}
