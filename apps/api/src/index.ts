import { assertProductionReadyConfig, loadConfig } from "@ari/config";
import { buildServer } from "./server";

const config = loadConfig();
assertProductionReadyConfig(config);
const server = await buildServer();

await server.listen({ port: config.PORT, host: "0.0.0.0" });
