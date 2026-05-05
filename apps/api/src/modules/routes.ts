import type { FastifyInstance } from "fastify";
import type { AriStore } from "../store";
import { registerAdminRoutes } from "./admin/admin.routes";
import { registerApprovalRoutes } from "./approvals/approval.routes";
import { registerAuthRoutes } from "./auth/auth.routes";
import { registerCalendarRoutes } from "./calendar/calendar.routes";
import { registerDocumentRoutes } from "./documents/document.routes";
import { registerEnterpriseRoutes } from "./enterprise/enterprise.routes";
import { registerListingRoutes } from "./listings/listing.routes";
import { registerMessagingRoutes } from "./messaging/messaging.routes";
import { registerRenterProfileRoutes } from "./renter-profile/renter-profile.routes";
import { registerSearchSessionRoutes } from "./search-sessions/search-session.routes";
import { registerTourRoutes } from "./tours/tour.routes";
import { registerWebhookRoutes } from "./webhooks/webhook.routes";

export async function registerRoutes(app: FastifyInstance, store: AriStore) {
  app.get("/health", async () => ({ ok: true, service: "ari-api" }));
  await registerAuthRoutes(app, store);
  await registerRenterProfileRoutes(app, store);
  await registerSearchSessionRoutes(app, store);
  await registerListingRoutes(app, store);
  await registerMessagingRoutes(app, store);
  await registerWebhookRoutes(app, store);
  await registerTourRoutes(app, store);
  await registerCalendarRoutes(app, store);
  await registerDocumentRoutes(app, store);
  await registerApprovalRoutes(app, store);
  await registerEnterpriseRoutes(app, store);
  await registerAdminRoutes(app, store);
}
