import { z } from "zod";

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface LlmProvider {
  generateStructured<T>(input: {
    system: string;
    messages: LlmMessage[];
    schema: z.ZodSchema<T>;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<T>;
}

export class DeterministicLlmProvider implements LlmProvider {
  async generateStructured<T>(input: { schema: z.ZodSchema<T> }): Promise<T> {
    return input.schema.parse({});
  }
}
