import {
  demoApprovals,
  demoConversation,
  demoDocuments,
  demoListings,
  demoMessages,
  demoPacket,
  demoProfile,
  demoResults,
  demoSession,
  demoTours
} from "./mock";

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
  return Promise.all([
    fetchJson("/v1/renter-profile", demoProfile),
    fetchJson("/v1/search-sessions/search-demo/results", demoResults),
    fetchJson("/v1/approvals", demoApprovals),
    fetchJson("/v1/tours", demoTours),
    fetchJson("/v1/conversations", [{ ...demoConversation, messages: demoMessages }]),
    fetchJson("/v1/documents", demoDocuments)
  ]).then(([profile, results, approvals, tours, conversations, documents]) => ({
    profile,
    results,
    approvals,
    tours,
    conversations,
    documents
  }));
}

export function getSearchData(searchSessionId: string) {
  return Promise.all([
    fetchJson(`/v1/search-sessions/${searchSessionId}`, demoSession),
    fetchJson(`/v1/search-sessions/${searchSessionId}/results`, demoResults)
  ]).then(([session, results]) => ({ session, results }));
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
    fetchJson("/v1/admin/listings", demoListings),
    fetchJson("/v1/admin/agent-runs", [] as Array<{ id: string; agentName?: string; status?: string }>),
    fetchJson("/v1/admin/tool-calls", [] as Array<{ id: string; toolName?: string; status?: string }>),
    fetchJson("/v1/admin/workflows", [{ id: "workflow-search-demo", workflowType: "SearchWorkflow", status: "RUNNING" }]),
    fetchJson("/v1/admin/compliance-flags", [] as Array<{ id: string; flagType?: string; status?: string }>),
    fetchJson("/v1/admin/audit-logs", [] as Array<{ id: string; action: string }>)
  ]).then(([listings, agentRuns, toolCalls, workflows, complianceFlags, auditLogs]) => ({
    listings,
    agentRuns,
    toolCalls,
    workflows,
    complianceFlags,
    auditLogs
  }));
}
