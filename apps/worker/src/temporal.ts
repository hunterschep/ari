import { NativeConnection, Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { geocodeAddress } from "./activities/enrichment/geocodeAddress";
import { fetchRentcastListings } from "./activities/listing-ingestion/fetchRentcastListings";

export const temporalTaskQueue = "ari-rental-agent";

export async function createTemporalWorker() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233"
  });

  return Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
    taskQueue: temporalTaskQueue,
    workflowsPath: fileURLToPath(new URL("./workflows/temporal-workflows.ts", import.meta.url)),
    activities: {
      fetchRentcastListings,
      geocodeAddress
    }
  });
}
