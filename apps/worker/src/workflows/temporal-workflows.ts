export async function TemporalSearchWorkflow(input: { searchSessionId: string }) {
  return {
    workflow: "SearchWorkflow",
    searchSessionId: input.searchSessionId,
    status: "SCHEDULED"
  };
}

export async function TemporalOutreachWorkflow(input: { searchSessionId: string; listingId: string }) {
  return {
    workflow: "OutreachWorkflow",
    searchSessionId: input.searchSessionId,
    listingId: input.listingId,
    status: "SCHEDULED"
  };
}

export async function TemporalSchedulingWorkflow(input: { listingId: string; conversationId: string }) {
  return {
    workflow: "SchedulingWorkflow",
    listingId: input.listingId,
    conversationId: input.conversationId,
    status: "SCHEDULED"
  };
}

export async function TemporalApplicationWorkflow(input: { listingId: string }) {
  return {
    workflow: "ApplicationWorkflow",
    listingId: input.listingId,
    status: "SCHEDULED"
  };
}
