import { test, expect } from "@playwright/test";
import { buildServer } from "../../apps/api/src/server";
import { createAriStore } from "../../apps/api/src/store";

test("Playwright API journey covers the MVP demo path", async ({ request }) => {
  const server = await buildServer({ store: createAriStore() });
  await server.listen({ port: 4011, host: "127.0.0.1" });

  const base = "http://127.0.0.1:4011";
  const profile = await request.get(`${base}/v1/renter-profile`);
  expect((await profile.json()).targetCity).toBe("NYC");

  const results = await request.get(`${base}/v1/search-sessions/search-demo/results`);
  const ranked = await results.json();
  expect(ranked.length).toBeGreaterThanOrEqual(3);

  const draft = await request.post(`${base}/v1/listings/${ranked[0].listing.id}/message-drafts`);
  const draftJson = await draft.json();
  await request.post(`${base}/v1/message-drafts/${draftJson.id}/approve`);
  const sent = await request.post(`${base}/v1/message-drafts/${draftJson.id}/send`);
  expect((await sent.json()).direction).toBe("OUTBOUND");

  await server.close();
});
