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
  AuditLog,
  AutomationPolicy,
  CanonicalListing,
  ComplianceFlag,
  Conversation,
  ListingScore,
  ListingVersion,
  Message,
  MessageDraft,
  RenterProfile,
  SearchCriteria,
  SearchSession,
  Tour,
  ToolCall,
  UserConsent
} from "@ari/schemas";
import {
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
        }
      }

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
      }
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
      return packet;
    },

    sendPacket(id: string) {
      const packet = packets.find((candidate) => candidate.id === id);
      if (!packet) throw new Error("Packet not found");
      if (packet.status !== "APPROVED") throw new Error("Packet must be approved before sending");
      packet.status = "SENT";
      packet.sentAt = nowIso();
      packet.updatedAt = nowIso();
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
      return approval;
    },

    reject(id: string) {
      const approval = approvals.find((candidate) => candidate.id === id);
      if (!approval) throw new Error("Approval not found");
      approval.status = "REJECTED";
      approval.rejectedAt = nowIso();
      approval.updatedAt = nowIso();
      return approval;
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
