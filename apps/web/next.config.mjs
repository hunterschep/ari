import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ari/ui", "@ari/schemas", "@ari/shared", "@ari/agents", "@ari/integrations"],
  typedRoutes: false,
  turbopack: {
    root
  }
};

export default nextConfig;
