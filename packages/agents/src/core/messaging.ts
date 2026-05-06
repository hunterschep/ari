import type { CanonicalListing, InboundMessageParse, MessageDraft, RenterProfile } from "@ari/schemas";
import { addDaysIso, addHoursIso, nowIso, stableHash } from "@ari/shared";

export function createOutreachDraft(input: {
  renter: RenterProfile;
  listing: CanonicalListing;
  conversationId?: string;
  contactId?: string;
}): MessageDraft {
  const firstName = firstNameOf(input.renter.legalName ?? input.renter.email);
  const tourWindows = "Tue/Thu evening or Saturday morning";
  const addressOrTitle = input.listing.title ?? input.listing.address.normalized ?? input.listing.address.raw;
  const body = [
    `Hi${input.listing.contacts[0]?.name ? ` ${input.listing.contacts[0].name}` : ""},`,
    "",
    `I’m interested in ${addressOrTitle}. Is it still available for a ${input.renter.moveInDate ?? "near-term"} move-in?`,
    "",
    "I’m available to tour:",
    tourWindows,
    "",
    "Thanks,",
    firstName
  ].join("\n");

  return {
    id: stableHash(["draft", input.renter.userId, input.listing.id, body].join(":")).slice(0, 16),
    conversationId: input.conversationId,
    listingId: input.listing.id,
    contactId: input.contactId ?? input.listing.contacts[0]?.id,
    body,
    subject: `Availability for ${addressOrTitle}`,
    status: "PENDING_APPROVAL",
    riskScore: 24,
    includedSensitiveInfo: false,
    recommendedChannel: input.listing.contacts[0]?.email ? "email" : "sms",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function createFollowUpDraft(input: {
  renter: RenterProfile;
  listing: CanonicalListing;
  conversationId: string;
}): MessageDraft {
  const body = `Hi, just checking whether ${input.listing.title ?? input.listing.address.raw} is still available and whether there is a time to tour. Thanks, ${firstNameOf(input.renter.legalName ?? input.renter.email)}`;
  return {
    id: stableHash(["follow-up", input.renter.userId, input.listing.id, body].join(":")).slice(0, 16),
    conversationId: input.conversationId,
    listingId: input.listing.id,
    body,
    status: "PENDING_APPROVAL",
    riskScore: 32,
    includedSensitiveInfo: false,
    recommendedChannel: "email",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function parseInboundMessage(body: string, referenceDate = new Date("2026-05-05T12:00:00-04:00")): InboundMessageParse {
  const text = body.toLowerCase();
  if (looksLikePromptInjectionOrSensitiveExfiltration(text)) {
    return {
      intent: "SCAM_RISK",
      extracted: {
        questionsForUser: ["Landlord message contains system-style instructions, approval claims, or sensitive data requests."]
      },
      confidence: 96,
      recommendedAction: "escalate"
    };
  }
  const proposedTourSlots = extractTourSlots(body, referenceDate);
  const requestedDocuments = [
    text.includes("proof of income") ? "PAYSTUB" : undefined,
    text.includes("paystub") ? "PAYSTUB" : undefined,
    text.includes("id") ? "ID" : undefined,
    text.includes("pet") ? "PET_RECORD" : undefined,
    text.includes("bank") ? "BANK_STATEMENT" : undefined
  ].filter(Boolean) as string[];

  if (text.includes("wire") || text.includes("gift card") || text.includes("crypto") || text.includes("deposit before tour")) {
    return {
      intent: "SCAM_RISK",
      extracted: {},
      confidence: 92,
      recommendedAction: "escalate"
    };
  }

  if (proposedTourSlots.length > 0) {
    return {
      intent: "TOUR_SLOTS_PROPOSED",
      extracted: {
        proposedTourSlots,
        questionsForUser: text.includes("pet") || text.includes("pets") ? ["Confirm pet details"] : undefined
      },
      confidence: 88,
      recommendedAction: "schedule_tour"
    };
  }

  if (requestedDocuments.length > 0 || text.includes("application")) {
    return {
      intent: "APPLICATION_REQUESTED",
      extracted: { requestedDocuments },
      confidence: 84,
      recommendedAction: "prepare_application"
    };
  }

  if (text.includes("broker fee") || text.includes("application fee") || text.includes("deposit")) {
    return {
      intent: "FEE_DISCLOSURE",
      extracted: {
        fees: extractFees(body)
      },
      confidence: 79,
      recommendedAction: "ask_user"
    };
  }

  if (text.includes("available") || text.includes("yes")) {
    return {
      intent: "AVAILABLE",
      extracted: {},
      confidence: 74,
      recommendedAction: "reply"
    };
  }

  if (text.includes("unavailable") || text.includes("rented") || text.includes("taken")) {
    return {
      intent: "UNAVAILABLE",
      extracted: {},
      confidence: 82,
      recommendedAction: "skip"
    };
  }

  return {
    intent: "OTHER",
    extracted: {},
    confidence: 45,
    recommendedAction: "ask_user"
  };
}

function looksLikePromptInjectionOrSensitiveExfiltration(text: string) {
  const systemStyleInstruction =
    /ignore (all )?(previous|prior) instructions/.test(text) ||
    /system notice\s*:/.test(text) ||
    /developer message\s*:/.test(text);
  const falseApprovalClaim = /renter already approved/.test(text) || /already approved (the )?application/.test(text);
  const automaticActionInstruction = /confirm automatically/.test(text) || /submit all documents/.test(text);
  const sensitiveDataRequest =
    /send me .*?(paystub|pay stub|bank statement|tax doc|tax return|id document|passport|license|all documents)/.test(text) ||
    /text me .*?(phone number|income|employer|paystub|bank statement)/.test(text) ||
    (/verify you are human/.test(text) && /(phone number|income|employer|paystub|bank statement)/.test(text));
  return systemStyleInstruction || falseApprovalClaim || automaticActionInstruction || sensitiveDataRequest;
}

function extractTourSlots(body: string, referenceDate: Date) {
  const slots = [];
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const regex = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b(?:\s+at)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body))) {
    const weekday = weekdays.indexOf(match[1]!.toLowerCase());
    const hour12 = Number(match[2]);
    const minutes = Number(match[3] ?? 0);
    const hour = (hour12 % 12) + (match[4]!.toLowerCase() === "pm" ? 12 : 0);
    const start = nextWeekday(referenceDate, weekday);
    start.setHours(hour, minutes, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    slots.push({
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      timezone: "America/New_York",
      sourceText: match[0]
    });
  }
  return slots;
}

function extractFees(body: string) {
  const fees = [];
  const applicationFee = body.match(/application fee[^\d$]*(?:\$)?(\d+)/i);
  const brokerFee = body.match(/broker fee[^\d$]*(?:\$)?(\d+)/i);
  if (applicationFee) fees.push({ label: "Application fee", amount: Number(applicationFee[1]), required: true });
  if (brokerFee) fees.push({ label: "Broker fee", amount: Number(brokerFee[1]), required: true });
  return fees;
}

function nextWeekday(referenceDate: Date, weekday: number): Date {
  const result = new Date(referenceDate);
  const delta = (weekday + 7 - result.getDay()) % 7 || 7;
  result.setDate(result.getDate() + delta);
  return result;
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "Ari renter";
}

export function nextFollowUpAt(): string {
  return addDaysIso(2);
}

export function defaultApprovalExpiry(): string {
  return addHoursIso(24);
}
