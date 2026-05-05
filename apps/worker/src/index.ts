import { rentcastFixtureListings } from "@ari/integrations";
import { createTemporalWorker, temporalTaskQueue } from "./temporal";

console.log(`ari-worker ready: ${rentcastFixtureListings.length} fixture listings available for local workflows`);
console.log(`temporal task queue configured: ${temporalTaskQueue}`);

if (process.env.RUN_TEMPORAL_WORKER === "true") {
  const worker = await createTemporalWorker();
  await worker.run();
}
