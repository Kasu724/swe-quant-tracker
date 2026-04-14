export type MailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

export type MailSendResult = {
  messageId?: string;
};

export interface MailProvider {
  send(message: MailMessage): Promise<MailSendResult>;
}

