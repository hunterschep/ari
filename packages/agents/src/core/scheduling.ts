import type { ProposedSlot, Tour } from "@ari/schemas";
import { nowIso, stableHash } from "@ari/shared";

export function createProposedTour(input: {
  userId: string;
  listingId: string;
  conversationId?: string;
  proposedSlots: ProposedSlot[];
  location?: string;
}): Tour {
  return {
    id: stableHash(["tour", input.userId, input.listingId, JSON.stringify(input.proposedSlots)].join(":")).slice(0, 16),
    userId: input.userId,
    listingId: input.listingId,
    conversationId: input.conversationId,
    status: "PROPOSED",
    proposedSlots: rankTourSlots(input.proposedSlots),
    location: input.location,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function rankTourSlots(slots: ProposedSlot[]): ProposedSlot[] {
  return [...slots].sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
}

export function selectTourSlot(tour: Tour, slotIndex: number): Tour {
  const selectedSlot = tour.proposedSlots[slotIndex];
  if (!selectedSlot) throw new Error("Tour slot not found");
  return {
    ...tour,
    status: "USER_APPROVED",
    selectedSlot,
    updatedAt: nowIso()
  };
}

export function confirmTour(tour: Tour, calendarEventId?: string): Tour {
  return {
    ...tour,
    status: calendarEventId ? "CONFIRMED" : "CONFIRMED_CALENDAR_FAILED",
    calendarEventId,
    updatedAt: nowIso()
  };
}
