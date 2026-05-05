export interface SmsProvider {
  send(input: {
    from: string;
    to: string;
    body: string;
    metadata?: Record<string, string>;
  }): Promise<{ providerMessageId: string }>;
}

export class MockSmsProvider implements SmsProvider {
  async send(input: Parameters<SmsProvider["send"]>[0]) {
    return {
      providerMessageId: `mock-sms-${Buffer.from(`${input.to}:${input.body}`).toString("base64url").slice(0, 16)}`
    };
  }
}
