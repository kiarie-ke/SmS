export interface SmsProvider {
  send(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class MockSmsProvider implements SmsProvider {
  async send(to: string, message: string) {
    // eslint-disable-next-line no-console
    console.log(`[SMS mock] to=${to} msg=${message}`);
    return { success: true, messageId: `mock-${Date.now()}` };
  }
}

export class AfricasTalkingSmsProvider implements SmsProvider {
  constructor(private readonly username: string, private readonly apiKey: string, private readonly senderId?: string) {}
  async send(to: string, message: string) {
    try {
      const body = new URLSearchParams({
        username: this.username,
        to,
        message,
        ...(this.senderId ? { from: this.senderId } : {}),
      });
      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          apiKey: this.apiKey,
        },
        body: body.toString(),
      });
      const json = (await res.json()) as any;
      const recipient = json?.SMSMessageData?.Recipients?.[0];
      return { success: recipient?.status === 'Success', messageId: recipient?.messageId, error: recipient?.status };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }
}
