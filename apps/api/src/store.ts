import {
  classifyDocument,
  computePricingAdvice,
  createListingVersion,
  createOutreachDraft,
  createProposedTour,
  dedupeListings,
  defaultApprovalExpiry,
  evaluateFeeRules,
  generateApplicationPacket,
  nextFollowUpAt,
  normalizeListing,
  parseInboundMessage,
  rankListings,
  selectTourSlot,
  confirmTour
} from "@ari/agents";
import type {
  AgentRun,
  ApplicationDocument,
  ApplicationPacket,
  Approval,
  AccountSettings,
  AuditLog,
  AutomationPolicy,
  CanonicalListing,
  ComplianceFlag,
  Conversation,
  IntegrationConnection,
  IntegrationProvider,
  InquiryPipelineRow,
  ListingPipelineItem,
  ListingPipelineStatus,
  ListingScore,
  ListingTask,
  MapSearchResponse,
  ListingVersion,
  Message,
  MessageDraft,
  NotificationEvent,
  PipelineAction,
  ProviderEvent,
  RenterProfile,
  SearchCriteria,
  SearchSession,
  SourceIngestion,
  Tour,
  ToolCall,
  UserConsent,
  WebhookEvent
} from "@ari/schemas";
import {
  MapboxProvider,
  MockCalendarProvider,
  MockEmailProvider,
  MockObjectStorageProvider,
  MockSmsProvider,
  RentcastClient,
  mapRentcastToCanonical,
  rentcastFixtureListings
} from "@ari/integrations";
import { AUDIT_EVENTS, addDaysIso, nowIso, normalizeText, outboundMessageIdempotencyKey, stableHash } from "@ari/shared";

export type AriUser = {
  id: string;
  email: string;
  phone?: string;
  role: "RENTER" | "ADMIN" | "OPS" | "DEVELOPER";
  createdAt: string;
  updatedAt: string;
};

export type AriStore = ReturnType<typeof createAriStore>;

export function createAriStore() {
  const emailProvider = new MockEmailProvider();
  const smsProvider = new MockSmsProvider();
  const calendarProvider = new MockCalendarProvider();
  const storageProvider = new MockObjectStorageProvider();
  const rentcast = new RentcastClient();
  const mapbox = new MapboxProvider();

  const user: AriUser = {
    id: "user-demo",
    email: "alex.renter@example.com",
    phone: "+12125550118",
    role: "RENTER",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const profile: RenterProfile = {
    id: "profile-demo",
    userId: user.id,
    legalName: "Alex Morgan",
    email: user.email,
    phone: user.phone,
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

  const criteria: SearchCriteria = {
    city: "NYC",
    state: "NY",
    neighborhoods: profile.neighborhoods,
    budgetMax: profile.budgetMax!,
    budgetMin: profile.budgetMin,
    bedroomsMin: profile.bedroomsMin,
    bathroomsMin: profile.bathroomsMin,
    moveInDate: profile.moveInDate!,
    pets: profile.pets,
    mustHaves: profile.preferences.mustHaves,
    niceToHaves: profile.preferences.niceToHaves,
    dealBreakers: profile.dealBreakers,
    commuteAnchors: profile.commuteAnchors
  };

  const automationPolicy: AutomationPolicy = {
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
  };

  const sessions: SearchSession[] = [
    {
      id: "search-demo",
      userId: user.id,
      status: "ACTIVE",
      criteria,
      automationPolicy,
      startedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
  ];

  const listings: CanonicalListing[] = dedupeListings(rentcastFixtureListings.map(mapRentcastToCanonical)).map((listing) => ({
    ...listing,
    id: listing.id.replace("rentcast-", "listing-"),
    address: {
      ...listing.address,
      city: listing.address.city === "Queens" ? "LIC" : listing.address.city
    }
  }));
  const listingVersions: ListingVersion[] = listings.map((listing) => createListingVersion(listing)).filter(Boolean) as ListingVersion[];
  const scores: ListingScore[] = rankListings(listings, criteria, sessions[0]!.id);
  const consents: UserConsent[] = [
    {
      id: "consent-email",
      userId: user.id,
      type: "SEND_EMAIL_OUTREACH",
      status: "GRANTED",
      scope: "ONGOING",
      constraints: { maxMessagesPerDay: 5, allowedChannels: ["email"], requireApprovalAboveRiskScore: 0 },
      grantedAt: nowIso()
    },
    {
      id: "consent-calendar-read",
      userId: user.id,
      type: "READ_CALENDAR",
      status: "GRANTED",
      scope: "ONGOING",
      constraints: {},
      grantedAt: nowIso()
    },
    {
      id: "consent-calendar-write",
      userId: user.id,
      type: "WRITE_CALENDAR",
      status: "GRANTED",
      scope: "ONGOING",
      constraints: {},
      grantedAt: nowIso()
    }
  ];
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  const drafts: MessageDraft[] = [];
  const approvals: Approval[] = [];
  const tours: Tour[] = [];
  const documents: ApplicationDocument[] = [
    {
      id: "doc-paystub",
      userId: user.id,
      type: "PAYSTUB",
      fileName: "alex-paystub.pdf",
      mimeType: "application/pdf",
      storageKey: "user-demo/alex-paystub.pdf",
      sizeBytes: 230000,
      status: "APPROVED",
      extractedFields: { monthlyIncome: 13750 },
      containsSensitiveData: true,
      expiresAt: addDaysIso(120),
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    {
      id: "doc-pet",
      userId: user.id,
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
  const packets: ApplicationPacket[] = [];
  const agentRuns: AgentRun[] = [];
  const toolCalls: ToolCall[] = [];
  const complianceFlags: ComplianceFlag[] = [];
  const auditLogs: AuditLog[] = [];
  const workflowRuns = [
    {
      id: "workflow-search-demo",
      temporalWorkflowId: "search-demo-refresh",
      workflowType: "SearchWorkflow",
      entityType: "search_session",
      entityId: "search-demo",
      status: "RUNNING",
      startedAt: nowIso()
    }
  ];
  const authSessions = [
    {
      id: "session-demo",
      userId: user.id,
      token: "ari-demo-session-token",
      createdAt: nowIso(),
      expiresAt: addDaysIso(30)
    }
  ];
  const accountSettings: AccountSettings = {
    id: "account-demo",
    userId: user.id,
    authProvider: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_SECRET_KEY ? "CLERK" : "LOCAL_DEMO",
    clerkUserId: process.env.CLERK_DEMO_USER_ID,
    legalName: profile.legalName,
    email: user.email,
    phone: user.phone,
    timezone: "America/New_York",
    notificationPreferences: {
      email: true,
      sms: false,
      push: false,
      quietHoursStart: "21:00",
      quietHoursEnd: "08:00"
    },
    security: {
      mfaEnabled: Boolean(process.env.CLERK_SECRET_KEY),
      sessions: authSessions.length,
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
  const integrationConnections: IntegrationConnection[] = [
    createIntegrationConnection("CLERK", "Account signup and identity", "CLERK_SECRET_KEY", ["email", "profile", "session"]),
    createIntegrationConnection("RENTCAST", "Rental listing source", "RENTCAST_API_KEY", ["rental_search"]),
    createIntegrationConnection("MAPBOX", "Map search and commute estimates", "MAPBOX_ACCESS_TOKEN", ["geocoding", "matrix", "static_maps"]),
    createIntegrationConnection("SENDGRID", "Email outreach", "SENDGRID_API_KEY", ["mail.send"]),
    createIntegrationConnection("TWILIO", "SMS fallback", "TWILIO_AUTH_TOKEN", ["messages.write"]),
    createIntegrationConnection("GOOGLE_CALENDAR", "Tour scheduling", "GOOGLE_CALENDAR_CLIENT_ID", ["calendar.read", "calendar.events.write"]),
    createIntegrationConnection("S3", "Application document vault", "S3_BUCKET", ["object.write", "object.read"]),
    createIntegrationConnection("OPENAI", "Agent reasoning", "OPENAI_API_KEY", ["responses"]),
    createIntegrationConnection("TEMPORAL", "Durable workflow engine", "TEMPORAL_ADDRESS", ["workflow.start", "workflow.signal"]),
    createIntegrationConnection("POSTGRES", "System of record", "DATABASE_URL", ["read", "write"])
  ];
  const sourceIngestions: SourceIngestion[] = [
    {
      id: "ingestion-rentcast-demo",
      provider: "RENTCAST",
      status: "SUCCEEDED",
      mode: process.env.RENTCAST_API_KEY ? "PRODUCTION" : "MOCK",
      searchSessionId: sessions[0]!.id,
      startedAt: nowIso(),
      completedAt: nowIso(),
      rowsSeen: rentcastFixtureListings.length,
      rowsImported: listings.length,
      rowsRejected: 0,
      errors: []
    }
  ];
  const providerEvents: ProviderEvent[] = [];
  const webhookEvents: WebhookEvent[] = [];
  const notificationEvents: NotificationEvent[] = [];
  const pipelineItems: ListingPipelineItem[] = scores.map((score) => {
    const listing = listings.find((candidate) => candidate.id === score.listingId)!;
    return createPipelineItem(score, listing, sessions[0]!.id);
  });
  const tasks: ListingTask[] = [
    {
      id: "task-profile-gap",
      userId: user.id,
      type: "PROFILE_GAP",
      status: profile.applicationReadiness === "READY" ? "DONE" : "OPEN",
      priority: "HIGH",
      title: "Complete application packet readiness",
      body: "Add remaining ID and income verification before Ari can safely submit packets.",
      riskScore: 35,
      createdBy: "SYSTEM",
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    {
      id: "task-connect-clerk",
      userId: user.id,
      type: "CONNECT_INTEGRATION",
      status: process.env.CLERK_SECRET_KEY ? "DONE" : "OPEN",
      priority: "HIGH",
      title: "Connect Clerk for production accounts",
      body: "Configure Clerk keys and webhook verification before enabling public signup.",
      riskScore: 60,
      createdBy: "OPS",
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    ...pipelineItems
      .filter((item) => item.status === "NEW_MATCH" || item.status === "APPROVAL_PENDING")
      .slice(0, 3)
      .map<ListingTask>((item, index) => ({
        id: `task-outreach-${item.listingId}`,
        userId: user.id,
        listingId: item.listingId,
        type: item.status === "APPROVAL_PENDING" ? "APPROVE_OUTREACH" : "FOLLOW_UP",
        status: "OPEN",
        priority: index === 0 ? "URGENT" : item.priority,
        dueAt: addDaysIso(index + 1),
        title: item.status === "APPROVAL_PENDING" ? "Approve drafted outreach" : "Review high-fit match",
        body: item.nextAction,
        riskScore: item.riskFlags.length ? 72 : 24,
        createdBy: "AGENT",
        createdAt: nowIso(),
        updatedAt: nowIso()
      }))
  ];

  function createIntegrationConnection(
    provider: IntegrationProvider,
    label: string,
    requiredEnv: string,
    scopes: string[] = []
  ): IntegrationConnection {
    const configured = Boolean(process.env[requiredEnv]);
    return {
      id: `integration-${provider.toLowerCase().replaceAll("_", "-")}`,
      userId: ["CLERK", "GOOGLE_CALENDAR"].includes(provider) ? user.id : undefined,
      provider,
      status: configured ? "CONNECTED" : "NEEDS_CONFIG",
      mode: configured ? "PRODUCTION" : "MOCK",
      label,
      scopes,
      lastCheckedAt: nowIso(),
      lastSyncedAt: configured ? nowIso() : undefined,
      configRequired: configured ? [] : [requiredEnv],
      health: configured ? { latencyMs: 90 + scopes.length * 12, errorRate: 0 } : { lastError: `Missing ${requiredEnv}` }
    };
  }

  function priorityForScore(score: ListingScore): ListingTask["priority"] {
    if (score.totalScore >= 88) return "URGENT";
    if (score.totalScore >= 78) return "HIGH";
    if (score.totalScore >= 60) return "MEDIUM";
    return "LOW";
  }

  function priorityRank(priority: ListingTask["priority"]) {
    return { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }[priority];
  }

  function statusForScore(score: ListingScore, listing: CanonicalListing): ListingPipelineStatus {
    if (listing.status === "STALE") return "STALE";
    if (score.recommendation === "SKIP") return "SKIPPED";
    if (score.recommendation === "CONTACT_NOW") return "NEW_MATCH";
    if (score.recommendation === "NEEDS_USER_REVIEW") return "PAUSED";
    return "NEW_MATCH";
  }

  function createPipelineItem(score: ListingScore, listing: CanonicalListing, searchSessionId: string): ListingPipelineItem {
    const feeFlags = evaluateFeeRules(listing);
    const status = statusForScore(score, listing);
    return {
      id: stableHash(["pipeline", user.id, searchSessionId, listing.id].join(":")).slice(0, 18),
      userId: user.id,
      searchSessionId,
      listingId: listing.id,
      status,
      priority: priorityForScore(score),
      score: score.totalScore,
      recommendation: score.recommendation,
      owner: status === "PAUSED" ? "USER" : "ARI",
      nextAction:
        status === "PAUSED"
          ? "Resolve listing uncertainty before Ari contacts the agent."
          : status === "SKIPPED"
            ? "Skipped by hard criteria."
            : score.recommendation === "CONTACT_NOW"
              ? "Draft first outreach and ask availability, fees, and tour windows."
              : "Keep warm while higher-fit units are contacted.",
      riskFlags: feeFlags.map((flag) => flag.code),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  }

  function getPipelineItemOrThrow(id: string) {
    const item = pipelineItems.find((candidate) => candidate.id === id || candidate.listingId === id);
    if (!item) throw new Error(`Pipeline item not found: ${id}`);
    return item;
  }

  function syncPipelineForListing(listingId: string, patch: Partial<ListingPipelineItem>) {
    const item = pipelineItems.find((candidate) => candidate.listingId === listingId);
    if (!item) return undefined;
    Object.assign(item, patch, { updatedAt: nowIso() });
    return item;
  }

  function upsertTask(input: Omit<ListingTask, "id" | "createdAt" | "updatedAt" | "status"> & { id?: string; status?: ListingTask["status"] }) {
    const id = input.id ?? stableHash(["task", input.userId, input.type, input.listingId, input.conversationId, tasks.length].join(":")).slice(0, 18);
    const existing = tasks.find((candidate) => candidate.id === id);
    if (existing) {
      Object.assign(existing, input, { updatedAt: nowIso() });
      return existing;
    }
    const task: ListingTask = {
      ...input,
      id,
      status: input.status ?? "OPEN",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    tasks.push(task);
    return task;
  }

  function completeTasks(predicate: (task: ListingTask) => boolean) {
    for (const task of tasks.filter(predicate)) {
      if (task.status === "OPEN" || task.status === "IN_PROGRESS" || task.status === "WAITING") {
        task.status = "DONE";
        task.updatedAt = nowIso();
      }
    }
  }

  function recordProviderEvent(provider: ProviderEvent["provider"], eventType: string, entityType?: string, entityId?: string, payload: Record<string, unknown> = {}) {
    const event: ProviderEvent = {
      id: stableHash(["provider-event", provider, eventType, entityType, entityId, providerEvents.length].join(":")).slice(0, 18),
      provider,
      eventType,
      status: "PROCESSED",
      entityType,
      entityId,
      payload,
      receivedAt: nowIso(),
      processedAt: nowIso()
    };
    providerEvents.push(event);
    return event;
  }

  function stableListingCoordinate(listing: CanonicalListing) {
    if (listing.address.lat && listing.address.lng) return { lat: listing.address.lat, lng: listing.address.lng };
    const hash = parseInt(stableHash(listing.address.raw).slice(0, 8), 16);
    return {
      lat: 40.675 + (hash % 1050) / 10000,
      lng: -74.02 + ((hash >> 4) % 950) / 10000
    };
  }

  function audit(action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
    auditLogs.push({
      id: stableHash([action, entityType, entityId, nowIso(), auditLogs.length].join(":")).slice(0, 18),
      actorType: "SYSTEM",
      actorId: user.id,
      action,
      entityType,
      entityId,
      metadata,
      createdAt: nowIso()
    });
  }

  function getListingOrThrow(id: string) {
    const listing = listings.find((candidate) => candidate.id === id);
    if (!listing) throw new Error(`Listing not found: ${id}`);
    return listing;
  }

  function getSessionOrThrow(id: string) {
    const session = sessions.find((candidate) => candidate.id === id);
    if (!session) throw new Error(`Search session not found: ${id}`);
    return session;
  }

  function createApproval(input: Omit<Approval, "id" | "status" | "createdAt" | "updatedAt">) {
    const approval: Approval = {
      ...input,
      id: stableHash(["approval", input.userId, input.type, JSON.stringify(input.payload), approvals.length].join(":")).slice(0, 18),
      status: "PENDING",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    approvals.push(approval);
    return approval;
  }

  function createConversationForListing(listing: CanonicalListing, channel: "email" | "sms" | "whatsapp" = "email") {
    const contact = listing.contacts[0] ?? { id: `contact-${listing.id}`, email: "unknown@example.com" };
    const existing = conversations.find((conversation) => conversation.listingId === listing.id && conversation.contactId === contact.id);
    if (existing) return existing;
    const conversation: Conversation = {
      id: stableHash(["conversation", user.id, listing.id, contact.id].join(":")).slice(0, 18),
      userId: user.id,
      listingId: listing.id,
      contactId: contact.id,
      channel,
      status: "OPEN",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    conversations.push(conversation);
    return conversation;
  }

  return {
    user,
    profile,
    sessions,
    listings,
    listingVersions,
    scores,
    consents,
    conversations,
    messages,
    drafts,
    approvals,
    tours,
    documents,
    packets,
    agentRuns,
    toolCalls,
    complianceFlags,
    auditLogs,
    workflowRuns,
    authSessions,
    accountSettings,
    integrationConnections,
    sourceIngestions,
    providerEvents,
    webhookEvents,
    notificationEvents,
    pipelineItems,
    tasks,

    getMe() {
      return user;
    },

    registerUser(payload: { email?: string; phone?: string }) {
      if (payload.email) user.email = payload.email;
      if (payload.phone) user.phone = payload.phone;
      user.updatedAt = nowIso();
      const session = {
        id: stableHash(["session", user.id, nowIso(), authSessions.length].join(":")).slice(0, 18),
        userId: user.id,
        token: stableHash(["token", user.id, nowIso()].join(":")),
        createdAt: nowIso(),
        expiresAt: addDaysIso(30)
      };
      authSessions.push(session);
      return { user, session };
    },

    login(payload: { email?: string }) {
      if (payload.email && payload.email !== user.email) throw new Error("Invalid credentials for local demo user");
      const session = {
        id: stableHash(["session", user.id, authSessions.length].join(":")).slice(0, 18),
        userId: user.id,
        token: stableHash(["token", user.id, authSessions.length].join(":")),
        createdAt: nowIso(),
        expiresAt: addDaysIso(30)
      };
      authSessions.push(session);
      return { user, session };
    },

    getSession(token?: string) {
      return authSessions.find((session) => session.token === token) ?? authSessions.at(-1);
    },

    logout(token?: string) {
      const index = authSessions.findIndex((session) => session.token === token);
      if (index >= 0) authSessions.splice(index, 1);
      return { ok: true };
    },

    updateMe(patch: Partial<AriUser>) {
      Object.assign(user, patch, { updatedAt: nowIso() });
      return user;
    },

    grantConsent(payload: Partial<UserConsent>) {
      const consent: UserConsent = {
        id: stableHash(["consent", user.id, payload.type, consents.length].join(":")).slice(0, 18),
        userId: user.id,
        type: payload.type ?? "SEND_EMAIL_OUTREACH",
        status: "GRANTED",
        scope: payload.scope ?? "ONGOING",
        constraints: payload.constraints ?? {},
        grantedAt: nowIso()
      } as UserConsent;
      consents.push(consent);
      audit(AUDIT_EVENTS.USER_GRANTED_CONSENT, "user_consent", consent.id, { type: consent.type });
      return consent;
    },

    revokeConsent(id: string) {
      const consent = consents.find((candidate) => candidate.id === id);
      if (!consent) throw new Error("Consent not found");
      consent.status = "REVOKED";
      consent.revokedAt = nowIso();
      audit(AUDIT_EVENTS.USER_REVOKED_CONSENT, "user_consent", id);
      return consent;
    },

    getProfile() {
      return profile;
    },

    updateProfile(patch: Partial<RenterProfile>) {
      Object.assign(profile, patch, { updatedAt: nowIso() });
      return profile;
    },

    validateProfile() {
      return {
        valid: Boolean(profile.targetCity && profile.moveInDate && profile.budgetMax && (profile.neighborhoods.length || profile.commuteAnchors.length)),
        missing: [
          profile.targetCity ? undefined : "targetCity",
          profile.moveInDate ? undefined : "moveInDate",
          profile.budgetMax ? undefined : "budgetMax",
          profile.neighborhoods.length || profile.commuteAnchors.length ? undefined : "neighborhoodsOrCommuteAnchor"
        ].filter(Boolean)
      };
    },

    createSearchSession(payload: Partial<SearchSession>) {
      const session: SearchSession = {
        id: stableHash(["search", user.id, sessions.length, nowIso()].join(":")).slice(0, 18),
        userId: user.id,
        status: "DRAFT",
        criteria: payload.criteria ?? criteria,
        automationPolicy: payload.automationPolicy ?? automationPolicy,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      sessions.push(session);
      return session;
    },

    getSearchSession: getSessionOrThrow,

    updateSearchSession(id: string, patch: Partial<SearchSession>) {
      const session = getSessionOrThrow(id);
      Object.assign(session, patch, { updatedAt: nowIso() });
      return session;
    },

    startSearchSession(id: string) {
      const session = getSessionOrThrow(id);
      session.status = "ACTIVE";
      session.startedAt = nowIso();
      session.updatedAt = nowIso();
      this.refreshSearchSession(id);
      return session;
    },

    pauseSearchSession(id: string) {
      const session = getSessionOrThrow(id);
      session.status = "PAUSED";
      session.pausedAt = nowIso();
      session.updatedAt = nowIso();
      return session;
    },

    async refreshSearchSession(id: string) {
      const session = getSessionOrThrow(id);
      const imported = await rentcast.searchRentals({
        city: session.criteria.city,
        state: session.criteria.state,
        maxPrice: session.criteria.budgetMax * 1.1,
        minPrice: session.criteria.budgetMin,
        bedroomsMin: session.criteria.bedroomsMin,
        neighborhoods: session.criteria.neighborhoods,
        limit: 100
      });
      const normalized = dedupeListings(imported.map(mapRentcastToCanonical));
      for (const incoming of normalized) {
        const existingIndex = listings.findIndex((candidate) => candidate.canonicalHash === incoming.canonicalHash);
        if (existingIndex >= 0) {
          const previous = listings[existingIndex]!;
          const next = { ...previous, ...incoming, id: previous.id, lastRefreshedAt: nowIso(), lastSeenAt: nowIso() };
          const version = createListingVersion(next, previous);
          listings[existingIndex] = next;
          if (version) listingVersions.push(version);
        } else {
          listings.push(incoming);
          const version = createListingVersion(incoming);
          if (version) listingVersions.push(version);
        }
      }
      const ranked = rankListings(listings, session.criteria, session.id);
      scores.splice(0, scores.length, ...ranked);
      for (const score of ranked) {
        const listing = getListingOrThrow(score.listingId);
        const existing = pipelineItems.find((item) => item.searchSessionId === session.id && item.listingId === score.listingId);
        if (existing) {
          existing.score = score.totalScore;
          existing.priority = priorityForScore(score);
          existing.recommendation = score.recommendation;
          existing.riskFlags = evaluateFeeRules(listing).map((flag) => flag.code);
          existing.updatedAt = nowIso();
        } else {
          pipelineItems.push(createPipelineItem(score, listing, session.id));
        }
      }
      sourceIngestions.push({
        id: stableHash(["ingestion", "rentcast", session.id, sourceIngestions.length].join(":")).slice(0, 18),
        provider: "RENTCAST",
        status: "SUCCEEDED",
        mode: process.env.RENTCAST_API_KEY ? "PRODUCTION" : "MOCK",
        searchSessionId: session.id,
        startedAt: nowIso(),
        completedAt: nowIso(),
        rowsSeen: normalized.length,
        rowsImported: normalized.length,
        rowsRejected: 0,
        errors: []
      });
      recordProviderEvent("RENTCAST", "listing_refresh", "search_session", id, { imported: normalized.length, ranked: ranked.length });
      audit(AUDIT_EVENTS.LISTING_IMPORTED, "search_session", id, { imported: normalized.length });
      return { imported: normalized.length, ranked: ranked.length };
    },

    getSearchResults(id: string) {
      const sessionScores = scores.filter((score) => score.searchSessionId === id).sort((a, b) => a.rank - b.rank);
      return sessionScores.map((score) => {
        const listing = getListingOrThrow(score.listingId);
        return {
          score,
          listing,
          pricingAdvice: computePricingAdvice(listing, listings),
          feeFlags: evaluateFeeRules(listing)
        };
      });
    },

    getDashboard() {
      const openTasks = tasks.filter((task) => task.status === "OPEN" || task.status === "IN_PROGRESS");
      const activePipeline = pipelineItems.filter((item) => !["SKIPPED", "STALE"].includes(item.status));
      return {
        user,
        profile,
        accountSettings,
        activeSearch: sessions.find((session) => session.status === "ACTIVE") ?? sessions[0],
        summary: {
          pipelineItems: activePipeline.length,
          newMatches: pipelineItems.filter((item) => item.status === "NEW_MATCH").length,
          awaitingReply: pipelineItems.filter((item) => item.status === "AWAITING_REPLY").length,
          needsUser: pipelineItems.filter((item) => item.owner === "USER" && !["SKIPPED", "STALE"].includes(item.status)).length,
          openTasks: openTasks.length,
          pendingApprovals: approvals.filter((approval) => approval.status === "PENDING").length,
          tours: tours.filter((tour) => !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(tour.status)).length,
          applicationReady: documents.filter((document) => document.status === "APPROVED").length
        },
        pipeline: this.listPipeline({ limit: 8 }),
        tasks: openTasks.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority)).slice(0, 10),
        approvals: approvals.filter((approval) => approval.status === "PENDING"),
        tours,
        conversations: this.listConversations(),
        documents,
        integrationConnections,
        sourceIngestions: sourceIngestions.slice(-5),
        workflowRuns,
        providerEvents: providerEvents.slice(-10),
        complianceFlags: complianceFlags.filter((flag) => flag.status === "OPEN")
      };
    },

    listPipeline(filters: { searchSessionId?: string; status?: ListingPipelineStatus; limit?: number } = {}): InquiryPipelineRow[] {
      const rows = pipelineItems
        .filter((item) => !filters.searchSessionId || item.searchSessionId === filters.searchSessionId)
        .filter((item) => !filters.status || item.status === filters.status)
        .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || b.score - a.score)
        .map((pipeline) => {
          const conversation = conversations.find((candidate) => candidate.listingId === pipeline.listingId);
          return {
            pipeline,
            listing: getListingOrThrow(pipeline.listingId),
            score: scores.find((score) => score.listingId === pipeline.listingId && score.searchSessionId === pipeline.searchSessionId),
            conversationId: conversation?.id,
            lastMessageAt: conversation?.lastMessageAt
          };
        });
      return typeof filters.limit === "number" ? rows.slice(0, filters.limit) : rows;
    },

    getPipelineItem(id: string) {
      const pipeline = getPipelineItemOrThrow(id);
      const listing = getListingOrThrow(pipeline.listingId);
      return {
        pipeline,
        listing,
        score: scores.find((score) => score.listingId === listing.id && score.searchSessionId === pipeline.searchSessionId),
        conversation: conversations.find((conversation) => conversation.listingId === listing.id),
        tasks: tasks.filter((task) => task.listingId === listing.id),
        approvals: approvals.filter((approval) => JSON.stringify(approval.payload).includes(listing.id))
      };
    },

    async performPipelineAction(id: string, action: PipelineAction, payload: Record<string, unknown> = {}) {
      const item = getPipelineItemOrThrow(id);
      switch (action) {
        case "DRAFT_OUTREACH": {
          const draft = this.createMessageDraft(item.listingId);
          return { pipeline: getPipelineItemOrThrow(item.id), draft };
        }
        case "APPROVE_SEND": {
          let draft = drafts.find((candidate) => candidate.listingId === item.listingId && candidate.status !== "SENT");
          if (!draft) draft = this.createMessageDraft(item.listingId);
          this.approveDraft(draft.id);
          const message = await this.sendDraft(draft.id);
          return { pipeline: getPipelineItemOrThrow(item.id), message };
        }
        case "MARK_SKIPPED":
          Object.assign(item, {
            status: "SKIPPED",
            owner: "USER",
            nextAction: String(payload.reason ?? "Skipped by user."),
            updatedAt: nowIso()
          });
          return { pipeline: item };
        case "PAUSE_AUTOMATION":
          Object.assign(item, {
            status: "PAUSED",
            owner: "USER",
            nextAction: String(payload.reason ?? "Automation paused for manual review."),
            updatedAt: nowIso()
          });
          return { pipeline: item };
        case "REQUEST_TOUR":
          Object.assign(item, {
            status: "TOUR_PROPOSED",
            owner: "USER",
            nextAction: "Confirm preferred tour slots with the agent.",
            updatedAt: nowIso()
          });
          upsertTask({
            id: `task-tour-request-${item.listingId}`,
            userId: user.id,
            listingId: item.listingId,
            type: "SELECT_TOUR_SLOT",
            priority: "HIGH",
            dueAt: addDaysIso(1),
            title: "Confirm preferred tour slots",
            body: "Ari is ready to request a tour once slots are approved.",
            riskScore: 44,
            createdBy: "AGENT"
          });
          return { pipeline: item };
        case "PREPARE_PACKET": {
          const packet = this.generatePacket(item.listingId, Array.isArray(payload.requestedDocuments) ? payload.requestedDocuments.map(String) : []);
          return { pipeline: getPipelineItemOrThrow(item.id), packet };
        }
        case "SCHEDULE_FOLLOW_UP":
          Object.assign(item, {
            nextFollowUpAt: typeof payload.dueAt === "string" ? payload.dueAt : addDaysIso(2),
            nextAction: "Follow up if the agent has not replied.",
            updatedAt: nowIso()
          });
          return { pipeline: item };
        case "MARK_STALE":
          Object.assign(item, {
            status: "STALE",
            owner: "ARI",
            nextAction: "Refresh source data before taking more action.",
            updatedAt: nowIso()
          });
          return { pipeline: item };
        default:
          throw new Error(`Unsupported pipeline action: ${action}`);
      }
    },

    async getSearchMap(id: string): Promise<MapSearchResponse> {
      const rows = this.listPipeline({ searchSessionId: id });
      const features = await Promise.all(
        rows.map(async ({ pipeline, listing, score }) => {
          const coordinate = listing.address.lat && listing.address.lng ? { lat: listing.address.lat, lng: listing.address.lng } : stableListingCoordinate(listing);
          const commute = profile.commuteAnchors[0]
            ? (await mapbox.computeRouteMatrix({ origins: [listing.address.raw], destinations: [profile.commuteAnchors[0].address] })).rows[0]?.durationMinutes
            : undefined;
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
            warningCount: evaluateFeeRules(listing).length + computePricingAdvice(listing, listings).warnings.length,
            commuteMinutes: commute
          };
        })
      );
      const lats = features.map((feature) => feature.lat);
      const lngs = features.map((feature) => feature.lng);
      return {
        searchSessionId: id,
        center: {
          lat: Number(((Math.min(...lats) + Math.max(...lats)) / 2 || 40.72).toFixed(5)),
          lng: Number(((Math.min(...lngs) + Math.max(...lngs)) / 2 || -73.96).toFixed(5))
        },
        bounds: {
          north: Math.max(...lats, 40.78),
          south: Math.min(...lats, 40.65),
          east: Math.max(...lngs, -73.88),
          west: Math.min(...lngs, -74.04)
        },
        features
      };
    },

    getInquiries(searchSessionId: string) {
      return this.listPipeline({ searchSessionId });
    },

    getListing(id: string) {
      const listing = getListingOrThrow(id);
      return {
        listing,
        versions: listingVersions.filter((version) => version.listingId === id),
        score: scores.find((score) => score.listingId === id),
        pricingAdvice: computePricingAdvice(listing, listings),
        buildingRisk: {
          bucket: listing.confidence > 80 ? "LOW" : "UNKNOWN",
          signals: { dataConfidence: listing.confidence }
        },
        conversations: conversations.filter((conversation) => conversation.listingId === id)
      };
    },

    importListingUrl(sourceUrl: string) {
      const listing = normalizeListing(
        {
          id: stableHash(sourceUrl).slice(0, 10),
          url: sourceUrl,
          title: "User-submitted listing",
          address: "200 Bedford Avenue",
          unit: "3A",
          city: "Brooklyn",
          state: "NY",
          price: 3600,
          bedrooms: 1,
          bathrooms: 1,
          availableDate: profile.moveInDate,
          amenities: ["laundry"],
          cats: true,
          contactEmail: "submitted-listing@example.com",
          sourcePayload: { sourceUrl }
        },
        "USER_URL"
      );
      listings.push(listing);
      const version = createListingVersion(listing);
      if (version) listingVersions.push(version);
      const ranked = rankListings(listings, sessions[0]!.criteria, sessions[0]!.id);
      scores.splice(0, scores.length, ...ranked);
      const score = ranked.find((candidate) => candidate.listingId === listing.id);
      if (score) pipelineItems.push(createPipelineItem(score, listing, sessions[0]!.id));
      audit(AUDIT_EVENTS.LISTING_IMPORTED, "listing", listing.id, { sourceUrl });
      return listing;
    },

    createManualListing(payload: Record<string, unknown>) {
      const listing = normalizeListing(
        {
          address: String(payload.address ?? "1 Manual Way"),
          unit: typeof payload.unit === "string" ? payload.unit : undefined,
          city: String(payload.city ?? "Brooklyn"),
          state: String(payload.state ?? "NY"),
          price: Number(payload.price ?? 3500),
          bedrooms: Number(payload.bedrooms ?? 1),
          bathrooms: Number(payload.bathrooms ?? 1),
          title: typeof payload.title === "string" ? payload.title : "Admin listing",
          availableDate: typeof payload.availableDate === "string" ? payload.availableDate : profile.moveInDate,
          amenities: Array.isArray(payload.amenities) ? payload.amenities.map(String) : ["laundry"],
          contactEmail: typeof payload.contactEmail === "string" ? payload.contactEmail : "manual@example.com"
        },
        "INTERNAL_MANUAL"
      );
      listings.push(listing);
      const ranked = rankListings(listings, sessions[0]!.criteria, sessions[0]!.id);
      scores.splice(0, scores.length, ...ranked);
      const score = ranked.find((candidate) => candidate.listingId === listing.id);
      if (score) pipelineItems.push(createPipelineItem(score, listing, sessions[0]!.id));
      return listing;
    },

    saveListing(id: string, status = "SAVED") {
      const listing = getListingOrThrow(id);
      return { id: stableHash(["saved", user.id, id].join(":")).slice(0, 16), userId: user.id, listingId: listing.id, status, createdAt: nowIso() };
    },

    createMessageDraft(listingId: string) {
      const listing = getListingOrThrow(listingId);
      const conversation = createConversationForListing(listing);
      const draft = createOutreachDraft({ renter: profile, listing, conversationId: conversation.id });
      const approval = createApproval({
        userId: user.id,
        type: draft.recommendedChannel === "sms" ? "SEND_SMS" : "SEND_FIRST_MESSAGE",
        title: `Approve outreach for ${listing.title ?? listing.address.raw}`,
        body: draft.body,
        payload: { draftId: draft.id, listingId, conversationId: conversation.id },
        riskScore: draft.riskScore,
        expiresAt: defaultApprovalExpiry()
      });
      draft.approvalId = approval.id;
      drafts.push(draft);
      syncPipelineForListing(listingId, {
        status: "APPROVAL_PENDING",
        owner: "USER",
        nextAction: "Review and approve Ari's first outreach before it is sent."
      });
      upsertTask({
        id: `task-approve-${draft.id}`,
        userId: user.id,
        listingId,
        conversationId: conversation.id,
        approvalId: approval.id,
        type: "APPROVE_OUTREACH",
        priority: draft.riskScore >= 70 ? "URGENT" : "HIGH",
        title: `Approve outreach for ${listing.title ?? listing.address.raw}`,
        body: draft.body,
        riskScore: draft.riskScore,
        createdBy: "AGENT"
      });
      audit(AUDIT_EVENTS.MESSAGE_DRAFT_CREATED, "message_draft", draft.id, { listingId });
      return draft;
    },

    getDraft(id: string) {
      const draft = drafts.find((candidate) => candidate.id === id);
      if (!draft) throw new Error("Draft not found");
      return draft;
    },

    updateDraft(id: string, patch: Partial<MessageDraft>) {
      const draft = this.getDraft(id);
      Object.assign(draft, patch, { updatedAt: nowIso() });
      return draft;
    },

    approveDraft(id: string) {
      const draft = this.getDraft(id);
      draft.status = "APPROVED";
      draft.updatedAt = nowIso();
      const approval = approvals.find((candidate) => candidate.id === draft.approvalId);
      if (approval) {
        approval.status = "APPROVED";
        approval.approvedAt = nowIso();
        approval.updatedAt = nowIso();
      }
      completeTasks((task) => task.approvalId === draft.approvalId || task.id === `task-approve-${draft.id}`);
      syncPipelineForListing(draft.listingId, {
        status: "DRAFTED",
        owner: "ARI",
        nextAction: "Approved outreach is ready to send."
      });
      return draft;
    },

    async sendDraft(id: string) {
      const draft = this.getDraft(id);
      if (draft.status !== "APPROVED") throw new Error("Draft must be approved before sending");
      const listing = getListingOrThrow(draft.listingId);
      const conversation = draft.conversationId ? conversations.find((candidate) => candidate.id === draft.conversationId) ?? createConversationForListing(listing) : createConversationForListing(listing);
      const contact = listing.contacts.find((candidate) => candidate.id === conversation.contactId) ?? listing.contacts[0];
      const idempotencyKey = outboundMessageIdempotencyKey({
        userId: user.id,
        listingId: listing.id,
        contactId: contact?.id,
        templateVersion: "availability_inquiry_v1",
        body: draft.body
      });
      const providerResult =
        draft.recommendedChannel === "sms"
          ? await smsProvider.send({ from: user.phone ?? "+12125550100", to: contact?.phone ?? "+12125550101", body: draft.body })
          : await emailProvider.send({ from: user.email, to: contact?.email ?? "leasing@example.com", subject: draft.subject ?? "Apartment inquiry", text: draft.body });
      const message: Message = {
        id: stableHash(["message", idempotencyKey].join(":")).slice(0, 18),
        conversationId: conversation.id,
        direction: "OUTBOUND",
        channel: draft.recommendedChannel,
        from: user.email,
        to: contact?.email ?? contact?.phone ?? "unknown",
        subject: draft.subject,
        body: draft.body,
        normalizedBody: normalizeText(draft.body),
        provider: draft.recommendedChannel === "sms" ? "twilio" : "sendgrid",
        providerMessageId: providerResult.providerMessageId,
        extracted: {},
        sentAt: nowIso(),
        createdAt: nowIso()
      };
      messages.push(message);
      draft.status = "SENT";
      conversation.status = "AWAITING_LANDLORD";
      conversation.lastMessageAt = message.createdAt;
      conversation.nextFollowUpAt = nextFollowUpAt();
      syncPipelineForListing(listing.id, {
        status: "AWAITING_REPLY",
        owner: "LANDLORD",
        lastOutboundAt: message.sentAt,
        nextFollowUpAt: conversation.nextFollowUpAt,
        nextAction: "Wait for agent reply, then parse and route the response."
      });
      upsertTask({
        id: `task-followup-${listing.id}`,
        userId: user.id,
        listingId: listing.id,
        conversationId: conversation.id,
        type: "FOLLOW_UP",
        status: "WAITING",
        priority: "MEDIUM",
        dueAt: conversation.nextFollowUpAt,
        title: "Follow up if no reply",
        body: `Send a concise follow-up for ${listing.title ?? listing.address.raw}.`,
        riskScore: 30,
        createdBy: "AGENT"
      });
      recordProviderEvent(draft.recommendedChannel === "sms" ? "TWILIO" : "SENDGRID", "message_sent", "message", message.id, {
        providerMessageId: providerResult.providerMessageId
      });
      audit(AUDIT_EVENTS.MESSAGE_SENT, "message", message.id, { idempotencyKey });
      return message;
    },

    listConversations() {
      return conversations.map((conversation) => ({
        ...conversation,
        listing: listings.find((listing) => listing.id === conversation.listingId),
        messages: messages.filter((message) => message.conversationId === conversation.id)
      }));
    },

    getConversation(id: string) {
      const conversation = conversations.find((candidate) => candidate.id === id);
      if (!conversation) throw new Error("Conversation not found");
      return {
        ...conversation,
        listing: getListingOrThrow(conversation.listingId),
        messages: messages.filter((message) => message.conversationId === id)
      };
    },

    receiveInbound(input: { conversationId?: string; listingId?: string; from?: string; body: string }) {
      const listing = input.listingId ? getListingOrThrow(input.listingId) : listings[0]!;
      const conversation = input.conversationId
        ? conversations.find((candidate) => candidate.id === input.conversationId) ?? createConversationForListing(listing)
        : createConversationForListing(listing);
      const parsed = parseInboundMessage(input.body);
      const message: Message = {
        id: stableHash(["inbound", conversation.id, input.body, messages.length].join(":")).slice(0, 18),
        conversationId: conversation.id,
        direction: "INBOUND",
        channel: conversation.channel,
        from: input.from ?? "landlord@example.com",
        to: user.email,
        body: input.body,
        normalizedBody: normalizeText(input.body),
        provider: "mock-inbound",
        providerMessageId: stableHash(input.body).slice(0, 18),
        intent: parsed.intent,
        extracted: parsed.extracted,
        receivedAt: nowIso(),
        createdAt: nowIso()
      };
      messages.push(message);
      conversation.status = parsed.recommendedAction === "ask_user" || parsed.recommendedAction === "schedule_tour" ? "NEEDS_USER" : "OPEN";
      conversation.lastMessageAt = message.createdAt;
      syncPipelineForListing(listing.id, {
        status:
          parsed.intent === "TOUR_SLOTS_PROPOSED"
            ? "TOUR_PROPOSED"
            : parsed.intent === "APPLICATION_REQUESTED"
              ? "APPLICATION_REQUESTED"
              : "REPLIED",
        owner: parsed.recommendedAction === "ask_user" || parsed.recommendedAction === "schedule_tour" ? "USER" : "ARI",
        lastInboundAt: message.receivedAt,
        nextAction:
          parsed.intent === "TOUR_SLOTS_PROPOSED"
            ? "Select a tour slot and approve calendar booking."
            : parsed.intent === "APPLICATION_REQUESTED"
              ? "Prepare and approve an application packet."
              : parsed.recommendedAction === "skip"
                ? "Review risk and decide whether to skip."
                : "Draft the next reply."
      });
      completeTasks((task) => task.listingId === listing.id && task.type === "FOLLOW_UP");

      if (parsed.intent === "TOUR_SLOTS_PROPOSED" && parsed.extracted.proposedTourSlots?.length) {
        const tour = createProposedTour({
          userId: user.id,
          listingId: listing.id,
          conversationId: conversation.id,
          proposedSlots: parsed.extracted.proposedTourSlots,
          location: listing.address.raw
        });
        tours.push(tour);
        createApproval({
          userId: user.id,
          type: "CONFIRM_TOUR",
          title: `Select tour slot for ${listing.title ?? listing.address.raw}`,
          body: `Landlord proposed ${tour.proposedSlots.length} slots.`,
          payload: { tourId: tour.id, slots: tour.proposedSlots },
          riskScore: 48,
          expiresAt: defaultApprovalExpiry()
        });
        upsertTask({
          id: `task-tour-${tour.id}`,
          userId: user.id,
          listingId: listing.id,
          conversationId: conversation.id,
          type: "SELECT_TOUR_SLOT",
          priority: "URGENT",
          dueAt: addDaysIso(1),
          title: `Select tour slot for ${listing.title ?? listing.address.raw}`,
          body: `The agent proposed ${tour.proposedSlots.length} tour windows.`,
          riskScore: 48,
          createdBy: "AGENT"
        });
      }

      if (parsed.intent === "APPLICATION_REQUESTED") {
        const packet = generateApplicationPacket({
          renter: profile,
          listing,
          documents,
          requestedDocuments: parsed.extracted.requestedDocuments ?? []
        });
        packets.push(packet);
        if (packet.status === "READY_FOR_REVIEW") {
          createApproval({
            userId: user.id,
            type: "SHARE_APPLICATION_PACKET",
            title: `Approve application packet for ${listing.title ?? listing.address.raw}`,
            body: packet.coverMessage,
            payload: { packetId: packet.id, includedDocumentIds: packet.includedDocumentIds },
            riskScore: 88,
            expiresAt: defaultApprovalExpiry()
          });
          upsertTask({
            id: `task-packet-${packet.id}`,
            userId: user.id,
            listingId: listing.id,
            conversationId: conversation.id,
            type: "APPROVE_PACKET",
            priority: "URGENT",
            dueAt: addDaysIso(1),
            title: `Approve application packet for ${listing.title ?? listing.address.raw}`,
            body: packet.coverMessage,
            riskScore: 88,
            createdBy: "AGENT"
          });
        } else {
          upsertTask({
            id: `task-doc-gap-${packet.id}`,
            userId: user.id,
            listingId: listing.id,
            conversationId: conversation.id,
            type: "UPLOAD_DOCUMENT",
            priority: "HIGH",
            dueAt: addDaysIso(2),
            title: "Upload missing application documents",
            body: packet.checklist?.requiredItems.filter((item) => item.status !== "AVAILABLE").map((item) => item.label).join(", "),
            riskScore: 52,
            createdBy: "AGENT"
          });
        }
      }

      recordProviderEvent("SENDGRID", "inbound_message", "message", message.id, { intent: parsed.intent });
      audit(AUDIT_EVENTS.INBOUND_MESSAGE_RECEIVED, "message", message.id, { intent: parsed.intent });
      return { message, parsed };
    },

    listTours() {
      return tours;
    },

    selectTourSlot(id: string, slotIndex: number) {
      const index = tours.findIndex((candidate) => candidate.id === id);
      if (index < 0) throw new Error("Tour not found");
      tours[index] = selectTourSlot(tours[index]!, slotIndex);
      completeTasks((task) => task.id === `task-tour-${id}`);
      return tours[index]!;
    },

    async confirmTour(id: string) {
      const index = tours.findIndex((candidate) => candidate.id === id);
      if (index < 0) throw new Error("Tour not found");
      const tour = tours[index]!;
      if (!tour.selectedSlot) throw new Error("Tour slot must be selected first");
      const listing = getListingOrThrow(tour.listingId);
      const event = await calendarProvider.createEvent({
        summary: `Tour: ${listing.title ?? listing.address.raw}`,
        location: tour.location ?? listing.address.raw,
        description: "Apartment tour scheduled by Ari after user approval.",
        startDateTime: tour.selectedSlot.startDateTime,
        endDateTime: tour.selectedSlot.endDateTime,
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }] }
      });
      tours[index] = confirmTour(tour, event.eventId);
      syncPipelineForListing(tour.listingId, {
        status: "TOUR_CONFIRMED",
        owner: "USER",
        nextAction: "Attend the tour, then decide whether to apply."
      });
      recordProviderEvent("GOOGLE_CALENDAR", "tour_confirmed", "tour", id, { calendarEventId: event.eventId });
      audit(AUDIT_EVENTS.TOUR_CONFIRMED, "tour", id, { calendarEventId: event.eventId });
      return tours[index]!;
    },

    async createUploadUrl(input: { fileName: string; contentType: string }) {
      return storageProvider.createUploadUrl({ userId: user.id, fileName: input.fileName, contentType: input.contentType });
    },

    completeUpload(input: { fileName: string; mimeType: string; storageKey: string; sizeBytes: number; type?: ApplicationDocument["type"] }) {
      const type = input.type ?? classifyDocument(input.fileName);
      const document: ApplicationDocument = {
        id: stableHash(["doc", user.id, input.storageKey].join(":")).slice(0, 18),
        userId: user.id,
        type,
        fileName: input.fileName,
        mimeType: input.mimeType,
        storageKey: input.storageKey,
        sizeBytes: input.sizeBytes,
        status: type === "OTHER" ? "NEEDS_REVIEW" : "CLASSIFIED",
        extractedFields: {},
        containsSensitiveData: ["ID", "PAYSTUB", "BANK_STATEMENT", "TAX_RETURN", "W2", "CREDIT_REPORT", "BACKGROUND_CHECK"].includes(type),
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      documents.push(document);
      completeTasks((task) => task.type === "UPLOAD_DOCUMENT");
      audit(AUDIT_EVENTS.DOCUMENT_UPLOADED, "application_document", document.id, { type });
      return document;
    },

    updateDocument(id: string, patch: Partial<ApplicationDocument>) {
      const document = documents.find((candidate) => candidate.id === id);
      if (!document) throw new Error("Document not found");
      Object.assign(document, patch, { updatedAt: nowIso() });
      return document;
    },

    deleteDocument(id: string) {
      const document = this.updateDocument(id, { status: "DELETED" });
      return document;
    },

    generatePacket(listingId: string, requestedDocuments: string[] = []) {
      const packet = generateApplicationPacket({ renter: profile, listing: getListingOrThrow(listingId), documents, requestedDocuments });
      packets.push(packet);
      if (packet.status === "READY_FOR_REVIEW") {
        createApproval({
          userId: user.id,
          type: "SHARE_APPLICATION_PACKET",
          title: `Approve packet for ${getListingOrThrow(listingId).title ?? listingId}`,
          body: packet.coverMessage,
          payload: { packetId: packet.id },
          riskScore: 88,
          expiresAt: defaultApprovalExpiry()
        });
        upsertTask({
          id: `task-packet-${packet.id}`,
          userId: user.id,
          listingId,
          type: "APPROVE_PACKET",
          priority: "URGENT",
          dueAt: addDaysIso(1),
          title: `Approve packet for ${getListingOrThrow(listingId).title ?? listingId}`,
          body: packet.coverMessage,
          riskScore: 88,
          createdBy: "AGENT"
        });
      }
      syncPipelineForListing(listingId, {
        status: "APPLICATION_REQUESTED",
        owner: packet.status === "READY_FOR_REVIEW" ? "USER" : "ARI",
        nextAction: packet.status === "READY_FOR_REVIEW" ? "Approve the prepared packet before sharing." : "Collect missing documents before sharing."
      });
      return packet;
    },

    approvePacket(id: string) {
      const packet = packets.find((candidate) => candidate.id === id);
      if (!packet) throw new Error("Packet not found");
      packet.status = "APPROVED";
      packet.approvedAt = nowIso();
      packet.updatedAt = nowIso();
      const approval = approvals.find((candidate) => (candidate.payload as { packetId?: string })?.packetId === id);
      if (approval) {
        approval.status = "APPROVED";
        approval.approvedAt = nowIso();
      }
      completeTasks((task) => task.id === `task-packet-${id}` || task.approvalId === approval?.id);
      return packet;
    },

    sendPacket(id: string) {
      const packet = packets.find((candidate) => candidate.id === id);
      if (!packet) throw new Error("Packet not found");
      if (packet.status !== "APPROVED") throw new Error("Packet must be approved before sending");
      packet.status = "SENT";
      packet.sentAt = nowIso();
      packet.updatedAt = nowIso();
      syncPipelineForListing(packet.listingId, {
        status: "APPLIED",
        owner: "LANDLORD",
        nextAction: "Wait for application response and keep tour follow-ups current."
      });
      notificationEvents.push({
        id: stableHash(["notification", user.id, "packet", packet.id].join(":")).slice(0, 18),
        userId: user.id,
        channel: "in_app",
        status: "SENT",
        template: "application_packet_sent",
        entityType: "application_packet",
        entityId: packet.id,
        sentAt: nowIso(),
        createdAt: nowIso()
      });
      audit(AUDIT_EVENTS.APPLICATION_PACKET_SENT, "application_packet", packet.id, { documentCount: packet.includedDocumentIds.length });
      audit(AUDIT_EVENTS.DOCUMENT_SHARED, "application_packet", packet.id, { secureShareUrl: packet.secureShareUrl });
      return packet;
    },

    revokePacketLinks(id: string) {
      const packet = packets.find((candidate) => candidate.id === id);
      if (!packet) throw new Error("Packet not found");
      packet.secureShareUrl = undefined;
      packet.status = "WITHDRAWN";
      packet.updatedAt = nowIso();
      return packet;
    },

    approve(id: string) {
      const approval = approvals.find((candidate) => candidate.id === id);
      if (!approval) throw new Error("Approval not found");
      approval.status = "APPROVED";
      approval.approvedAt = nowIso();
      approval.updatedAt = nowIso();
      completeTasks((task) => task.approvalId === id);
      return approval;
    },

    reject(id: string) {
      const approval = approvals.find((candidate) => candidate.id === id);
      if (!approval) throw new Error("Approval not found");
      approval.status = "REJECTED";
      approval.rejectedAt = nowIso();
      approval.updatedAt = nowIso();
      for (const task of tasks.filter((candidate) => candidate.approvalId === id)) {
        task.status = "DISMISSED";
        task.updatedAt = nowIso();
      }
      return approval;
    },

    getAccountSettings() {
      return {
        user,
        accountSettings,
        consents,
        authSessions,
        integrationConnections: integrationConnections.filter((connection) => !connection.userId || connection.userId === user.id)
      };
    },

    updateAccountSettings(patch: Partial<AccountSettings>) {
      Object.assign(accountSettings, patch, { updatedAt: nowIso() });
      if (patch.email) {
        user.email = patch.email;
        profile.email = patch.email;
      }
      if (patch.phone) {
        user.phone = patch.phone;
        profile.phone = patch.phone;
      }
      user.updatedAt = nowIso();
      profile.updatedAt = nowIso();
      return accountSettings;
    },

    listIntegrations() {
      return {
        connections: integrationConnections,
        sourceIngestions: sourceIngestions.slice(-10),
        providerEvents: providerEvents.slice(-20),
        webhookEvents: webhookEvents.slice(-20)
      };
    },

    connectIntegration(provider: IntegrationProvider, payload: Record<string, unknown> = {}) {
      const connection = integrationConnections.find((candidate) => candidate.provider === provider);
      if (!connection) throw new Error(`Integration not found: ${provider}`);
      connection.status = "CONNECTED";
      connection.mode = payload.mode === "SANDBOX" ? "SANDBOX" : "PRODUCTION";
      connection.configRequired = [];
      connection.lastSyncedAt = nowIso();
      connection.lastCheckedAt = nowIso();
      connection.health = { latencyMs: 120, errorRate: 0 };
      recordProviderEvent(provider, "integration_connected", "integration_connection", connection.id, payload);
      return connection;
    },

    disconnectIntegration(provider: IntegrationProvider) {
      const connection = integrationConnections.find((candidate) => candidate.provider === provider);
      if (!connection) throw new Error(`Integration not found: ${provider}`);
      connection.status = "DISCONNECTED";
      connection.mode = "MOCK";
      connection.lastCheckedAt = nowIso();
      connection.health = { lastError: "Disconnected by user" };
      recordProviderEvent(provider, "integration_disconnected", "integration_connection", connection.id);
      return connection;
    },

    recordWebhook(provider: IntegrationProvider, eventType: string, payload: Record<string, unknown> = {}, signatureVerified = false) {
      const event: WebhookEvent = {
        id: stableHash(["webhook", provider, eventType, webhookEvents.length].join(":")).slice(0, 18),
        provider,
        signatureVerified,
        status: "PROCESSED",
        eventType,
        payload,
        receivedAt: nowIso(),
        processedAt: nowIso()
      };
      webhookEvents.push(event);
      recordProviderEvent(provider, eventType, "webhook_event", event.id, payload);
      return event;
    },

    getAdminOpsSummary() {
      return {
        totals: {
          users: 1,
          listings: listings.length,
          activeSearches: sessions.filter((session) => session.status === "ACTIVE").length,
          pipeline: pipelineItems.length,
          openTasks: tasks.filter((task) => task.status === "OPEN").length,
          pendingApprovals: approvals.filter((approval) => approval.status === "PENDING").length,
          openFlags: complianceFlags.filter((flag) => flag.status === "OPEN").length
        },
        integrations: integrationConnections,
        workflows: workflowRuns,
        ingestions: sourceIngestions.slice(-10),
        providerEvents: providerEvents.slice(-20),
        webhookEvents: webhookEvents.slice(-20),
        tasks: tasks.slice(-20),
        pipeline: this.listPipeline({ limit: 20 })
      };
    },

    resolveComplianceFlag(id: string) {
      const flag = complianceFlags.find((candidate) => candidate.id === id);
      if (!flag) throw new Error("Compliance flag not found");
      flag.status = "RESOLVED";
      flag.resolvedAt = nowIso();
      return flag;
    }
  };
}
