import { stableHash } from "./hash";
import { normalizeText } from "./normalize";

export function outboundMessageIdempotencyKey(input: {
  userId: string;
  listingId: string;
  contactId?: string;
  templateVersion: string;
  body: string;
}): string {
  return stableHash([
    input.userId,
    input.listingId,
    input.contactId ?? "unknown-contact",
    input.templateVersion,
    normalizeText(input.body)
  ].join(":"));
}
