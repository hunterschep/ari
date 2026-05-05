import { createOutreachDraft } from "@ari/agents";
import type { CanonicalListing, RenterProfile, SearchSession } from "@ari/schemas";

export function OutreachWorkflow(input: { searchSession: SearchSession; listing: CanonicalListing; renter: RenterProfile }) {
  const draft = createOutreachDraft({ renter: input.renter, listing: input.listing });
  return {
    draft,
    requiresApproval: input.searchSession.automationPolicy.requireApprovalFor.firstMessage || draft.riskScore > 0,
    followUpTimerHours: 48
  };
}
