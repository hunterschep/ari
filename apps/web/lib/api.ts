import {
  demoAccountSettings,
  demoApprovals,
  demoConversation,
  demoDashboard,
  demoDocuments,
  demoIntegrations,
  demoListings,
  demoMapSearch,
  demoMessages,
  demoPacket,
  demoPipelineRows,
  demoProfile,
  demoResults,
  demoSession,
  demoSourceIngestions,
  demoTasks,
  demoTours
} from "./mock";
import type { UserConsent } from "@ari/schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchJson<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function getDashboardData() {
  return fetchJson("/v1/dashboard", demoDashboard);
}

export function getSearchData(searchSessionId: string) {
  return Promise.all([
    fetchJson(`/v1/search-sessions/${searchSessionId}`, demoSession),
    fetchJson(`/v1/search-sessions/${searchSessionId}/results`, demoResults),
    fetchJson(`/v1/search-sessions/${searchSessionId}/inquiries`, demoPipelineRows),
    fetchJson(`/v1/search-sessions/${searchSessionId}/map`, demoMapSearch)
  ]).then(([session, results, inquiries, map]) => ({ session, results, inquiries, map }));
}

export function getListingData(listingId: string) {
  const fallbackListing = demoListings.find((listing) => listing.id === listingId) ?? demoListings[0]!;
  const fallbackResult = demoResults.find((result) => result.listing.id === fallbackListing.id)!;
  return fetchJson(`/v1/listings/${listingId}`, {
    listing: fallbackListing,
    versions: [],
    score: fallbackResult.score,
    pricingAdvice: fallbackResult.pricingAdvice,
    buildingRisk: { bucket: "LOW", signals: { dataConfidence: 76 } },
    conversations: [demoConversation]
  });
}

export function getInboxData() {
  return fetchJson("/v1/conversations", [{ ...demoConversation, listing: demoListings[0], messages: demoMessages }]);
}

export function getToursData() {
  return fetchJson("/v1/tours", demoTours);
}

export function getApplicationData() {
  return Promise.all([
    fetchJson("/v1/renter-profile", demoProfile),
    fetchJson("/v1/documents", demoDocuments),
    fetchJson(`/v1/application-packets/${demoPacket.id}`, demoPacket)
  ]).then(([profile, documents, packet]) => ({ profile, documents, packet }));
}

export function getAdminData() {
  return Promise.all([
    fetchJson("/v1/admin/ops-summary", {
      totals: {
        users: 1,
        listings: demoListings.length,
        activeSearches: 1,
        pipeline: demoPipelineRows.length,
        openTasks: demoTasks.length,
        pendingApprovals: demoApprovals.length,
        openFlags: 0
      },
      integrations: demoIntegrations,
      workflows: [{ id: "workflow-search-demo", workflowType: "SearchWorkflow", status: "RUNNING" }],
      ingestions: demoSourceIngestions,
      providerEvents: [],
      webhookEvents: [],
      tasks: demoTasks,
      pipeline: demoPipelineRows
    }),
    fetchJson("/v1/admin/listings", demoListings),
    fetchJson("/v1/admin/agent-runs", [] as Array<{ id: string; agentName?: string; status?: string }>),
    fetchJson("/v1/admin/tool-calls", [] as Array<{ id: string; toolName?: string; status?: string }>),
    fetchJson("/v1/admin/workflows", [{ id: "workflow-search-demo", workflowType: "SearchWorkflow", status: "RUNNING" }]),
    fetchJson("/v1/admin/compliance-flags", [] as Array<{ id: string; flagType?: string; status?: string }>),
    fetchJson("/v1/admin/audit-logs", [] as Array<{ id: string; action: string }>)
  ]).then(([ops, listings, agentRuns, toolCalls, workflows, complianceFlags, auditLogs]) => ({
    ops,
    listings,
    agentRuns,
    toolCalls,
    workflows,
    complianceFlags,
    auditLogs
  }));
}

export function getAccountData() {
  return fetchJson("/v1/account/settings", {
    user: { id: "user-demo", email: demoProfile.email, phone: demoProfile.phone, role: "RENTER", createdAt: demoProfile.createdAt, updatedAt: demoProfile.updatedAt },
    accountSettings: demoAccountSettings,
    consents: [] as UserConsent[],
    authSessions: [{ id: "session-demo", userId: "user-demo", token: "ari-demo-session-token", createdAt: demoProfile.createdAt, expiresAt: "2026-06-04T00:00:00.000Z" }],
    integrationConnections: demoIntegrations
  });
}

export function getIntegrationsData() {
  return fetchJson("/v1/integrations", {
    connections: demoIntegrations,
    sourceIngestions: demoSourceIngestions,
    providerEvents: [],
    webhookEvents: []
  });
}
