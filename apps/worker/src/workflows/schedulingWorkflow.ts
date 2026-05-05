import { createProposedTour, selectTourSlot } from "@ari/agents";
import type { ProposedSlot } from "@ari/schemas";

export function SchedulingWorkflow(input: {
  userId: string;
  listingId: string;
  conversationId: string;
  proposedSlots: ProposedSlot[];
  selectedSlotIndex?: number;
}) {
  const tour = createProposedTour(input);
  return input.selectedSlotIndex === undefined ? tour : selectTourSlot(tour, input.selectedSlotIndex);
}
