import { generateApplicationPacket } from "@ari/agents";
import type { ApplicationDocument, CanonicalListing, RenterProfile } from "@ari/schemas";

export function ApplicationWorkflow(input: {
  listing: CanonicalListing;
  renter: RenterProfile;
  documents: ApplicationDocument[];
  requestedDocuments: string[];
}) {
  const packet = generateApplicationPacket(input);
  return {
    packet,
    requiresApproval: true,
    missingItems: packet.checklist?.requiredItems.filter((item) => item.status === "MISSING") ?? []
  };
}
