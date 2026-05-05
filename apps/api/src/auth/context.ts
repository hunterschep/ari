import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "@clerk/backend";
import type { AriStore, AriUser } from "../store";

export type AriRequestContext = {
  userId: string;
  clerkUserId?: string;
  email?: string;
  role: AriUser["role"];
  authProvider: "CLERK" | "LOCAL_DEMO";
  readOnlyImpersonation?: {
    actorUserId: string;
    targetUserId: string;
    reason: string;
  };
};

declare module "fastify" {
  interface FastifyRequest {
    ari?: AriRequestContext;
  }
}

const publicPathMatchers = [
  /^\/health$/,
  /^\/v1\/auth\//,
  /^\/v1\/webhooks\//
];

export function installAuth(app: FastifyInstance, store: AriStore) {
  app.addHook("preHandler", async (request, reply) => {
    if (publicPathMatchers.some((matcher) => matcher.test(request.url))) return;
    request.ari = await authenticateRequest(request, store);

    if (request.url.startsWith("/v1/admin")) {
      await requireAnyRole(["ADMIN", "OPS"], request, reply);
    }
  });
}

export async function requireAnyRole(roles: AriUser["role"][], request: FastifyRequest, reply: FastifyReply) {
  if (!request.ari) {
    reply.status(401).send({ error: "Unauthorized", message: "Authentication required" });
    return;
  }
  if (request.ari.authProvider === "LOCAL_DEMO") return;
  if (!roles.includes(request.ari.role)) {
    reply.status(403).send({ error: "Forbidden", message: `Requires one of: ${roles.join(", ")}` });
  }
}

async function authenticateRequest(request: FastifyRequest, store: AriStore): Promise<AriRequestContext> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const localFallback = process.env.ENABLE_LOCAL_AUTH_FALLBACK !== "false";
  const authHeader = request.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (secretKey && token) {
    const payload = await verifyToken(token, { secretKey });
    const publicMetadata = payload.publicMetadata as { role?: unknown } | undefined;
    const metadata = payload.metadata as { role?: unknown } | undefined;
    const role = parseRole(publicMetadata?.role ?? metadata?.role ?? payload.orgRole);
    return {
      userId: store.user.id,
      clerkUserId: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role,
      authProvider: "CLERK"
    };
  }

  if (!secretKey && localFallback) {
    const role = parseRole(request.headers["x-ari-role"] ?? store.user.role);
    return {
      userId: store.user.id,
      email: store.user.email,
      role,
      authProvider: "LOCAL_DEMO"
    };
  }

  const error = new Error("Authentication required");
  (error as Error & { statusCode?: number }).statusCode = 401;
  throw error;
}

function parseRole(value: unknown): AriUser["role"] {
  const normalized = String(value ?? "RENTER").toUpperCase().replace(/^ORG:/, "");
  if (normalized.includes("ADMIN")) return "ADMIN";
  if (normalized.includes("OPS")) return "OPS";
  if (normalized.includes("DEVELOPER")) return "DEVELOPER";
  return "RENTER";
}
