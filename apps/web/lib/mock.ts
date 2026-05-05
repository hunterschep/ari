import { computePricingAdvice, createOutreachDraft, dedupeListings, generateApplicationPacket, parseInboundMessage, rankListings } from "@ari/agents";
import { mapRentcastToCanonical, rentcastFixtureListings } from "@ari/integrations";
import type {
  AccountSettings,
  ApplicationDocument,
  Approval,
  Conversation,
  InquiryPipelineRow,
  IntegrationConnection,
  ListingPipelineItem,
  ListingTask,
  MapSearchResponse,
  Message,
  RenterProfile,
  SearchSession,
  SourceIngestion,
  Tour
} from "@ari/schemas";
import { nowIso, stableHash } from "@ari/shared";

export const demoProfile: RenterProfile = {
  id: "profile-demo",
  userId: "user-demo",
  legalName: "Alex Morgan",
  email: "alex.renter@example.com",
  phone: "+12125550118",
  targetCity: "NYC",
  moveInDate: "2026-07-01",
  leaseTermMonths: 12,
  budgetMin: 3000,
  budgetMax: 3800,
  bedroomsMin: 1,
  bathroomsMin: 1,
  neighborhoods: ["Williamsburg", "Greenpoint", "LIC"],
  commuteAnchors: [{ id: "anchor-office", label: "Office", address: "Flatiron Building, New York, NY", priority: "HIGH" }],
  occupants: [{ name: "Alex Morgan" }],
  pets: [{ type: "cat", name: "Miso" }],
  employment: { employer: "Northstar Labs", title: "Product lead", startDate: "2024-01-15" },
  income: { annualIncome: 165000, verified: true },
  preferences: {
    mustHaves: ["laundry"],
    niceToHaves: ["dishwasher", "elevator", "doorman", "outdoor space"],
    noFeePreference: true,
    petsAllowedRequired: true,
    laundry: true,
    elevator: false,
    doorman: false,
    outdoorSpace: false,
    dishwasher: true,
    furnished: false,
    parking: false,
    guarantorAllowed: false,
    flexibleMoveIn: false,
    budgetStretchAllowed: false
  },
  dealBreakers: ["no pets", "cash deposit before tour"],
  messageTone: "friendly",
  applicationReadiness: "PARTIAL",
  createdAt: nowIso(),
  updatedAt: nowIso()
};

export const demoSession: SearchSession = {
  id: "search-demo",
  userId: "user-demo",
  status: "ACTIVE",
  criteria: {
    city: "NYC",
    state: "NY",
    neighborhoods: demoProfile.neighborhoods,
    budgetMax: demoProfile.budgetMax!,
    budgetMin: demoProfile.budgetMin,
    bedroomsMin: 1,
    bathroomsMin: 1,
    moveInDate: "2026-07-01",
    pets: demoProfile.pets,
    mustHaves: ["laundry"],
    niceToHaves: ["dishwasher", "elevator", "doorman", "outdoor space"],
    dealBreakers: demoProfile.dealBreakers,
    commuteAnchors: demoProfile.commuteAnchors
  },
  automationPolicy: {
    autoFindListings: true,
    autoScoreListings: true,
    autoDraftMessages: true,
    autoSendMessages: false,
    autoBookTours: false,
    autoPrepareApplications: true,
    maxOutreachPerDay: 5,
    requireApprovalFor: {
      firstMessage: true,
      followUps: true,
      tourConfirmation: true,
      applicationPacket: true,
      messagesWithPersonalFinancialInfo: true
    }
  },
  startedAt: nowIso(),
  createdAt: nowIso(),
  updatedAt: nowIso()
};

export const demoListings = dedupeListings(rentcastFixtureListings.map(mapRentcastToCanonical)).map((listing) => ({
  ...listing,
  id: listing.id.replace("rentcast-", "listing-"),
  media: {
    ...listing.media,
    photos: listing.media.photos.length ? listing.media.photos : ["/images/listing-living.svg"]
  }
}));

export const demoScores = rankListings(demoListings, demoSession.criteria, demoSession.id);
export const demoResults = demoScores.map((score) => {
  const listing = demoListings.find((item) => item.id === score.listingId)!;
  return {
    listing,
    score,
    pricingAdvice: computePricingAdvice(listing, demoListings)
  };
});

const topListing = demoListings[0]!;
export const demoDraft = createOutreachDraft({ renter: demoProfile, listing: topListing, conversationId: "conversation-demo" });
export const demoApprovals: Approval[] = [
  {
    id: "approval-draft",
    userId: "user-demo",
    type: "SEND_FIRST_MESSAGE",
    status: "PENDING",
    title: "Approve first outreach",
    body: demoDraft.body,
    payload: { draftId: demoDraft.id, listingId: topListing.id },
    riskScore: demoDraft.riskScore,
    expiresAt: "2026-05-06T12:00:00.000Z",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

const inbound = "Yes it’s available. We can show Thursday at 6pm or Saturday at 10am. Any pets?";
const parsed = parseInboundMessage(inbound);
export const demoConversation: Conversation = {
  id: "conversation-demo",
  userId: "user-demo",
  listingId: topListing.id,
  contactId: topListing.contacts[0]?.id ?? "contact-demo",
  channel: "email",
  status: "NEEDS_USER",
  lastMessageAt: nowIso(),
  createdAt: nowIso(),
  updatedAt: nowIso()
};
export const demoMessages: Message[] = [
  {
    id: "message-outbound-demo",
    conversationId: demoConversation.id,
    direction: "OUTBOUND",
    channel: "email",
    from: demoProfile.email,
    to: topListing.contacts[0]?.email ?? "leasing@example.com",
    subject: demoDraft.subject,
    body: demoDraft.body,
    normalizedBody: demoDraft.body.toLowerCase(),
    provider: "sendgrid",
    providerMessageId: "mock-email-demo",
    extracted: {},
    sentAt: nowIso(),
    createdAt: nowIso()
  },
  {
    id: "message-inbound-demo",
    conversationId: demoConversation.id,
    direction: "INBOUND",
    channel: "email",
    from: topListing.contacts[0]?.email ?? "leasing@example.com",
    to: demoProfile.email,
    body: inbound,
    normalizedBody: inbound.toLowerCase(),
    provider: "mock-inbound",
    intent: parsed.intent,
    extracted: parsed.extracted,
    receivedAt: nowIso(),
    createdAt: nowIso()
  }
];

export const demoTours: Tour[] = [
  {
    id: "tour-demo",
    userId: "user-demo",
    listingId: topListing.id,
    conversationId: demoConversation.id,
    status: "PROPOSED",
    proposedSlots: parsed.extracted.proposedTourSlots ?? [],
    location: topListing.address.raw,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const demoDocuments: ApplicationDocument[] = [
  {
    id: "doc-paystub",
    userId: "user-demo",
    type: "PAYSTUB",
    fileName: "alex-paystub.pdf",
    mimeType: "application/pdf",
    storageKey: "user-demo/alex-paystub.pdf",
    sizeBytes: 230000,
    status: "APPROVED",
    extractedFields: { monthlyIncome: 13750 },
    containsSensitiveData: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "doc-pet",
    userId: "user-demo",
    type: "PET_RECORD",
    fileName: "miso-vet-record.pdf",
    mimeType: "application/pdf",
    storageKey: "user-demo/miso-vet-record.pdf",
    sizeBytes: 84000,
    status: "APPROVED",
    containsSensitiveData: false,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const demoPacket = generateApplicationPacket({
  renter: demoProfile,
  listing: topListing,
  documents: demoDocuments,
  requestedDocuments: ["PAYSTUB", "ID", "PET_RECORD"]
});

function priorityForScore(score: number): ListingTask["priority"] {
  if (score >= 88) return "URGENT";
  if (score >= 78) return "HIGH";
  if (score >= 60) return "MEDIUM";
  return "LOW";
}

function coordinateFor(address: string) {
  const hash = parseInt(stableHash(address).slice(0, 8), 16);
  return {
    lat: 40.675 + (hash % 1050) / 10000,
    lng: -74.02 + ((hash >> 4) % 950) / 10000
  };
}

export const demoPipelineItems: ListingPipelineItem[] = demoResults.map(({ listing, score }, index) => ({
  id: `pipeline-${listing.id}`,
  userId: "user-demo",
  searchSessionId: demoSession.id,
  listingId: listing.id,
  status: index === 0 ? "TOUR_PROPOSED" : index === 1 ? "APPROVAL_PENDING" : score.recommendation === "SKIP" ? "SKIPPED" : "NEW_MATCH",
  priority: priorityForScore(score.totalScore),
  score: score.totalScore,
  recommendation: score.recommendation,
  owner: index <= 1 ? "USER" : "ARI",
  nextAction: index === 0 ? "Select tour slot and approve calendar booking." : index === 1 ? "Approve first outreach." : "Draft outreach and verify fees.",
  lastOutboundAt: index === 0 ? nowIso() : undefined,
  lastInboundAt: index === 0 ? nowIso() : undefined,
  nextFollowUpAt: index > 1 ? "2026-05-08T14:00:00.000Z" : undefined,
  riskFlags: listing.fees.brokerFeeRequired ? ["NYC_FARE_ACT_POTENTIAL_VIOLATION"] : [],
  createdAt: nowIso(),
  updatedAt: nowIso()
}));

export const demoTasks: ListingTask[] = [
  {
    id: "task-tour-demo",
    userId: "user-demo",
    listingId: topListing.id,
    conversationId: demoConversation.id,
    type: "SELECT_TOUR_SLOT",
    status: "OPEN",
    priority: "URGENT",
    dueAt: "2026-05-05T16:00:00.000Z",
    title: "Select tour slot",
    body: "The agent offered two windows. Pick one before tonight.",
    riskScore: 48,
    createdBy: "AGENT",
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "task-approval-demo",
    userId: "user-demo",
    listingId: demoListings[1]?.id,
    approvalId: "approval-draft",
    type: "APPROVE_OUTREACH",
    status: "OPEN",
    priority: "HIGH",
    dueAt: "2026-05-06T12:00:00.000Z",
    title: "Approve first outreach",
    body: demoDraft.body,
    riskScore: demoDraft.riskScore,
    createdBy: "AGENT",
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "task-account-demo",
    userId: "user-demo",
    type: "CONNECT_INTEGRATION",
    status: "OPEN",
    priority: "HIGH",
    title: "Connect Clerk for production accounts",
    body: "Enable public signup and webhook-backed session management.",
    riskScore: 60,
    createdBy: "OPS",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const demoPipelineRows: InquiryPipelineRow[] = demoPipelineItems.map((pipeline) => ({
  pipeline,
  listing: demoListings.find((listing) => listing.id === pipeline.listingId)!,
  score: demoScores.find((score) => score.listingId === pipeline.listingId),
  conversationId: pipeline.listingId === topListing.id ? demoConversation.id : undefined,
  lastMessageAt: pipeline.listingId === topListing.id ? nowIso() : undefined
}));

export const demoIntegrations: IntegrationConnection[] = [
  ["CLERK", "Account signup and identity", ["CLERK_SECRET_KEY"]],
  ["RENTCAST", "Rental listing source", []],
  ["MAPBOX", "Map search and commute estimates", ["MAPBOX_ACCESS_TOKEN"]],
  ["SENDGRID", "Email outreach", ["SENDGRID_API_KEY"]],
  ["TWILIO", "SMS fallback", ["TWILIO_AUTH_TOKEN"]],
  ["GOOGLE_CALENDAR", "Tour scheduling", ["GOOGLE_CALENDAR_CLIENT_ID"]],
  ["S3", "Application document vault", ["S3_BUCKET"]],
  ["OPENAI", "Agent reasoning", ["OPENAI_API_KEY"]],
  ["TEMPORAL", "Durable workflow engine", ["TEMPORAL_ADDRESS"]],
  ["POSTGRES", "System of record", ["DATABASE_URL"]]
].map(([provider, label, configRequired]) => ({
  id: `integration-${String(provider).toLowerCase().replaceAll("_", "-")}`,
  userId: provider === "CLERK" || provider === "GOOGLE_CALENDAR" ? "user-demo" : undefined,
  provider: provider as IntegrationConnection["provider"],
  status: (configRequired as string[]).length ? "NEEDS_CONFIG" : "CONNECTED",
  mode: (configRequired as string[]).length ? "MOCK" : "PRODUCTION",
  label: String(label),
  scopes: [],
  lastCheckedAt: nowIso(),
  lastSyncedAt: (configRequired as string[]).length ? undefined : nowIso(),
  configRequired: configRequired as string[],
  health: (configRequired as string[]).length ? { lastError: `Missing ${(configRequired as string[])[0]}` } : { latencyMs: 110, errorRate: 0 }
}));

export const demoSourceIngestions: SourceIngestion[] = [
  {
    id: "ingestion-rentcast-demo",
    provider: "RENTCAST",
    status: "SUCCEEDED",
    mode: "MOCK",
    searchSessionId: demoSession.id,
    startedAt: nowIso(),
    completedAt: nowIso(),
    rowsSeen: rentcastFixtureListings.length,
    rowsImported: demoListings.length,
    rowsRejected: 0,
    errors: []
  }
];

export const demoAccountSettings: AccountSettings = {
  id: "account-demo",
  userId: "user-demo",
  authProvider: "LOCAL_DEMO",
  legalName: demoProfile.legalName,
  email: demoProfile.email,
  phone: demoProfile.phone,
  timezone: "America/New_York",
  notificationPreferences: {
    email: true,
    sms: false,
    push: false,
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00"
  },
  security: {
    mfaEnabled: false,
    sessions: 1,
    lastLoginAt: nowIso()
  },
  dataControls: {
    allowTraining: false,
    retainApplicationDocs: true,
    redactFinancialsByDefault: true
  },
  createdAt: nowIso(),
  updatedAt: nowIso()
};

const demoMapFeatures = demoPipelineRows.map(({ pipeline, listing, score }, index) => {
  const coordinate = coordinateFor(listing.address.raw);
  return {
    id: `map-${listing.id}`,
    listingId: listing.id,
    lat: coordinate.lat,
    lng: coordinate.lng,
    status: pipeline.status,
    score: score?.totalScore ?? pipeline.score,
    price: listing.price,
    title: listing.title ?? listing.address.raw,
    neighborhood: listing.address.city,
    warningCount: pipeline.riskFlags.length,
    commuteMinutes: 18 + index * 4
  };
});

export const demoMapSearch: MapSearchResponse = {
  searchSessionId: demoSession.id,
  center: {
    lat: Number(((Math.min(...demoMapFeatures.map((feature) => feature.lat)) + Math.max(...demoMapFeatures.map((feature) => feature.lat))) / 2).toFixed(5)),
    lng: Number(((Math.min(...demoMapFeatures.map((feature) => feature.lng)) + Math.max(...demoMapFeatures.map((feature) => feature.lng))) / 2).toFixed(5))
  },
  bounds: {
    north: Math.max(...demoMapFeatures.map((feature) => feature.lat)),
    south: Math.min(...demoMapFeatures.map((feature) => feature.lat)),
    east: Math.max(...demoMapFeatures.map((feature) => feature.lng)),
    west: Math.min(...demoMapFeatures.map((feature) => feature.lng))
  },
  features: demoMapFeatures
};

export const demoDashboard = {
  user: { id: "user-demo", email: demoProfile.email, phone: demoProfile.phone, role: "RENTER", createdAt: nowIso(), updatedAt: nowIso() },
  profile: demoProfile,
  accountSettings: demoAccountSettings,
  activeSearch: demoSession,
  summary: {
    pipelineItems: demoPipelineRows.length,
    newMatches: demoPipelineItems.filter((item) => item.status === "NEW_MATCH").length,
    awaitingReply: demoPipelineItems.filter((item) => item.status === "AWAITING_REPLY").length,
    needsUser: demoPipelineItems.filter((item) => item.owner === "USER").length,
    openTasks: demoTasks.filter((task) => task.status === "OPEN").length,
    pendingApprovals: demoApprovals.length,
    tours: demoTours.length,
    applicationReady: demoDocuments.filter((document) => document.status === "APPROVED").length
  },
  pipeline: demoPipelineRows,
  tasks: demoTasks,
  approvals: demoApprovals,
  tours: demoTours,
  conversations: [{ ...demoConversation, listing: topListing, messages: demoMessages }],
  documents: demoDocuments,
  integrationConnections: demoIntegrations,
  sourceIngestions: demoSourceIngestions,
  workflowRuns: [{ id: "workflow-search-demo", workflowType: "SearchWorkflow", status: "RUNNING" }],
  providerEvents: [],
  complianceFlags: []
};
