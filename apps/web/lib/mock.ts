import { computePricingAdvice, createOutreachDraft, dedupeListings, generateApplicationPacket, parseInboundMessage, rankListings } from "@ari/agents";
import { mapRentcastToCanonical, rentcastFixtureListings } from "@ari/integrations";
import type { ApplicationDocument, Approval, Conversation, Message, RenterProfile, SearchSession, Tour } from "@ari/schemas";
import { nowIso } from "@ari/shared";

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
