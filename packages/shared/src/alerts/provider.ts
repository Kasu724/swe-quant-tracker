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

