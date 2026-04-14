import type { AlertChannelValue } from "../types";

export type AlertSendRequest = {
  to: string;
  subject: string;
  html: string;
  text: string;
  metadata?: Record<string, string>;
};

export type AlertSendResult = {
  providerMessageId?: string;
  skipped?: boolean;
};

export interface AlertProvider {
  readonly channel: AlertChannelValue;
  send(message: AlertSendRequest): Promise<AlertSendResult>;
}

export class DiscordWebhookProvider implements AlertProvider {
  readonly channel = "DISCORD" as const;

  async send(): Promise<AlertSendResult> {
    throw new Error("Discord delivery is not implemented yet. Plug in a webhook sender later.");
  }
}

