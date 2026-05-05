import { z } from "zod";
import type { AutomationPolicy, UserConsent } from "@ari/schemas";

export type ToolExecutionContext = {
  userId?: string;
  automationPolicy?: AutomationPolicy;
  consents?: UserConsent[];
  services?: Record<string, unknown>;
};

export type ToolDefinition<I extends Record<string, unknown>, O> = {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<I>;
  outputSchema: z.ZodSchema<O>;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresApproval: boolean;
  execute: (input: I, ctx: ToolExecutionContext) => Promise<O>;
};

export const coreToolSchemas = {
  searchListings: z.object({ searchSessionId: z.string() }),
  getListingDetails: z.object({ listingId: z.string() }),
  enrichBuilding: z.object({ listingId: z.string() }),
  computeCommute: z.object({ listingId: z.string() }),
  scoreListing: z.object({ listingId: z.string(), searchSessionId: z.string() }),
  createMessageDraft: z.object({ listingId: z.string(), conversationId: z.string().optional() }),
  sendEmail: z.object({ to: z.string(), subject: z.string(), text: z.string() }),
  sendSms: z.object({ to: z.string(), body: z.string() }),
  parseInboundMessage: z.object({ body: z.string() }),
  proposeTourSlots: z.object({ conversationId: z.string() }),
  createCalendarEvent: z.object({ tourId: z.string() }),
  generateApplicationPacket: z.object({ listingId: z.string(), requestedDocuments: z.array(z.string()).default([]) }),
  createSecureDocumentLink: z.object({ documentIds: z.array(z.string()), recipient: z.string() }),
  flagComplianceIssue: z.object({ flagType: z.string(), details: z.record(z.unknown()).default({}) }),
  escalateToHuman: z.object({ reason: z.string() })
};

export function createToolRegistry(overrides: Partial<Record<keyof typeof coreToolSchemas, ToolDefinition<Record<string, unknown>, unknown>>> = {}) {
  const fallback = (name: keyof typeof coreToolSchemas, riskLevel: ToolDefinition<Record<string, unknown>, unknown>["riskLevel"], requiresApproval = false): ToolDefinition<Record<string, unknown>, unknown> => ({
    name,
    description: `${name} tool`,
    inputSchema: coreToolSchemas[name] as z.ZodSchema<Record<string, unknown>>,
    outputSchema: z.record(z.unknown()),
    riskLevel,
    requiresApproval,
    execute: async (input) => ({ ok: true, input })
  });

  return {
    searchListings: overrides.searchListings ?? fallback("searchListings", "LOW"),
    getListingDetails: overrides.getListingDetails ?? fallback("getListingDetails", "LOW"),
    enrichBuilding: overrides.enrichBuilding ?? fallback("enrichBuilding", "LOW"),
    computeCommute: overrides.computeCommute ?? fallback("computeCommute", "LOW"),
    scoreListing: overrides.scoreListing ?? fallback("scoreListing", "LOW"),
    createMessageDraft: overrides.createMessageDraft ?? fallback("createMessageDraft", "LOW"),
    sendEmail: overrides.sendEmail ?? fallback("sendEmail", "MEDIUM", true),
    sendSms: overrides.sendSms ?? fallback("sendSms", "HIGH", true),
    parseInboundMessage: overrides.parseInboundMessage ?? fallback("parseInboundMessage", "LOW"),
    proposeTourSlots: overrides.proposeTourSlots ?? fallback("proposeTourSlots", "LOW"),
    createCalendarEvent: overrides.createCalendarEvent ?? fallback("createCalendarEvent", "MEDIUM"),
    generateApplicationPacket: overrides.generateApplicationPacket ?? fallback("generateApplicationPacket", "LOW"),
    createSecureDocumentLink: overrides.createSecureDocumentLink ?? fallback("createSecureDocumentLink", "HIGH", true),
    flagComplianceIssue: overrides.flagComplianceIssue ?? fallback("flagComplianceIssue", "LOW"),
    escalateToHuman: overrides.escalateToHuman ?? fallback("escalateToHuman", "LOW")
  };
}
