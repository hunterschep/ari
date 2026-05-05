import type { ApplicationChecklist, ApplicationDocument, ApplicationPacket, CanonicalListing, RenterProfile } from "@ari/schemas";
import { addDaysIso, nowIso, stableHash } from "@ari/shared";

export function generateApplicationChecklist(input: {
  requestedDocuments: string[];
  documents: ApplicationDocument[];
}): ApplicationChecklist {
  const requested = input.requestedDocuments.length > 0 ? input.requestedDocuments : ["ID", "PAYSTUB", "PET_RECORD"];
  const requiredItems = [...new Set(requested)].map((documentType) => {
    const doc = input.documents.find((candidate) => candidate.type === documentType && candidate.status !== "DELETED");
    return {
      label: labelForDocument(documentType),
      status: doc ? ("AVAILABLE" as const) : ("MISSING" as const),
      documentType: documentType as ApplicationDocument["type"]
    };
  });

  return {
    requiredItems,
    warnings: input.documents.some((doc) => doc.containsSensitiveData)
      ? ["Sensitive documents require explicit approval and expiring share links."]
      : [],
    readyToSubmit: requiredItems.every((item) => item.status === "AVAILABLE")
  };
}

export function generateApplicationPacket(input: {
  renter: RenterProfile;
  listing: CanonicalListing;
  documents: ApplicationDocument[];
  requestedDocuments: string[];
}): ApplicationPacket {
  const checklist = generateApplicationChecklist({
    requestedDocuments: input.requestedDocuments,
    documents: input.documents
  });
  const includedDocumentIds = input.documents
    .filter((document) => checklist.requiredItems.some((item) => item.documentType === document.type && item.status === "AVAILABLE"))
    .map((document) => document.id);
  const firstName = input.renter.legalName?.split(/\s+/)[0] ?? "the renter";
  const renterSummary = [
    input.renter.legalName ? `Applicant: ${input.renter.legalName}` : "Applicant name pending",
    input.renter.income?.annualIncome ? `Income: $${input.renter.income.annualIncome.toLocaleString()} annual` : "Income: not disclosed until user approval",
    input.renter.employment?.employer ? `Employment: ${input.renter.employment.employer}` : "Employment: pending",
    input.renter.pets.length ? `Pets: ${input.renter.pets.map((pet) => pet.type).join(", ")}` : "Pets: none listed"
  ].join("\n");

  return {
    id: stableHash(["packet", input.renter.userId, input.listing.id, includedDocumentIds.join(",")].join(":")).slice(0, 16),
    userId: input.renter.userId,
    listingId: input.listing.id,
    status: checklist.readyToSubmit ? "READY_FOR_REVIEW" : "MISSING_INFO",
    renterSummary,
    coverMessage: `Hi, ${firstName} is interested in applying for ${input.listing.title ?? input.listing.address.raw}. Please use the secure packet link after approval to review the renter summary and requested documents.`,
    includedDocumentIds,
    secureShareUrl: checklist.readyToSubmit ? `https://ari.local/share/${stableHash(includedDocumentIds).slice(0, 24)}` : undefined,
    expiresAt: checklist.readyToSubmit ? addDaysIso(7) : undefined,
    checklist,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function classifyDocument(fileName: string): ApplicationDocument["type"] {
  const lower = fileName.toLowerCase();
  if (lower.includes("id") || lower.includes("license") || lower.includes("passport")) return "ID";
  if (lower.includes("paystub") || lower.includes("pay-stub")) return "PAYSTUB";
  if (lower.includes("bank")) return "BANK_STATEMENT";
  if (lower.includes("employment")) return "EMPLOYMENT_LETTER";
  if (lower.includes("tax")) return "TAX_RETURN";
  if (lower.includes("w2")) return "W2";
  if (lower.includes("credit")) return "CREDIT_REPORT";
  if (lower.includes("background")) return "BACKGROUND_CHECK";
  if (lower.includes("pet") || lower.includes("vet")) return "PET_RECORD";
  if (lower.includes("guarantor")) return "GUARANTOR_DOC";
  return "OTHER";
}

function labelForDocument(documentType: string): string {
  return documentType
    .toLowerCase()
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}
