import { parseInboundMessage } from "@ari/agents";

export function ConversationWorkflow(input: { conversationId: string; body: string }) {
  const parsed = parseInboundMessage(input.body);
  return {
    conversationId: input.conversationId,
    parsed,
    nextAction: parsed.recommendedAction
  };
}
