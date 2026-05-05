import type { AgentRun, ToolCall } from "@ari/schemas";
import { nowIso, stableHash } from "@ari/shared";
import { evaluatePolicy } from "../policies/policyGuard";
import type { ToolDefinition, ToolExecutionContext } from "../tool-registry/registry";

export async function runAgentWithTools<T>(params: {
  agentName: string;
  userId?: string;
  listingId?: string;
  searchSessionId?: string;
  input: unknown;
  tools: ToolDefinition<Record<string, unknown>, unknown>[];
  maxSteps?: number;
  plan: (step: number, previousOutputs: unknown[]) => Array<{ toolName: string; input: Record<string, unknown> }> | T;
  context: ToolExecutionContext;
}): Promise<{ agentRun: AgentRun; toolCalls: ToolCall[]; output: T }> {
  const startedAt = nowIso();
  const agentRun: AgentRun = {
    id: stableHash([params.agentName, startedAt, JSON.stringify(params.input)].join(":")).slice(0, 18),
    agentName: params.agentName,
    userId: params.userId,
    listingId: params.listingId,
    searchSessionId: params.searchSessionId,
    status: "RUNNING",
    input: params.input,
    model: "deterministic-mvp",
    promptVersion: "v1",
    startedAt
  };
  const toolCalls: ToolCall[] = [];
  const outputs: unknown[] = [];

  for (let step = 0; step < (params.maxSteps ?? 4); step++) {
    const planned = params.plan(step, outputs);
    if (!Array.isArray(planned)) {
      const completed: AgentRun = {
        ...agentRun,
        status: "SUCCEEDED",
        output: planned,
        completedAt: nowIso()
      };
      return { agentRun: completed, toolCalls, output: planned };
    }

    for (const call of planned) {
      const tool = params.tools.find((candidate) => candidate.name === call.toolName);
      if (!tool) throw new Error(`Tool not registered: ${call.toolName}`);
      const parsedInput = tool.inputSchema.parse(call.input);
      const policy = evaluatePolicy({
        toolName: tool.name,
        riskLevel: tool.riskLevel,
        input: parsedInput,
        automationPolicy: params.context.automationPolicy,
        consents: params.context.consents
      });
      const toolCall: ToolCall = {
        id: stableHash([agentRun.id, tool.name, JSON.stringify(parsedInput)].join(":")).slice(0, 18),
        agentRunId: agentRun.id,
        toolName: tool.name,
        input: parsedInput,
        status: policy.allowed ? "PENDING" : "BLOCKED",
        riskScore: policy.riskScore,
        idempotencyKey: stableHash([tool.name, JSON.stringify(parsedInput)].join(":")),
        createdAt: nowIso()
      };

      if (!policy.allowed || policy.requiresApproval || tool.requiresApproval) {
        toolCalls.push({
          ...toolCall,
          status: policy.allowed ? "APPROVED" : "BLOCKED",
          approvalId: policy.requiresApproval ? stableHash(["approval", toolCall.id].join(":")).slice(0, 18) : undefined
        });
        continue;
      }

      const output = await tool.execute(parsedInput, params.context);
      tool.outputSchema.parse(output);
      outputs.push(output);
      toolCalls.push({
        ...toolCall,
        output,
        status: "EXECUTED",
        executedAt: nowIso()
      });
    }
  }

  throw new Error("Agent exceeded max steps");
}
