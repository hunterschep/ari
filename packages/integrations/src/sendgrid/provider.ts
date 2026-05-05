export interface EmailProvider {
  send(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
    metadata?: Record<string, string>;
  }): Promise<{ providerMessageId: string }>;
}

export class MockEmailProvider implements EmailProvider {
  async send(input: Parameters<EmailProvider["send"]>[0]) {
    return {
      providerMessageId: `mock-email-${Buffer.from(`${input.to}:${input.subject}`).toString("base64url").slice(0, 16)}`
    };
  }
}
