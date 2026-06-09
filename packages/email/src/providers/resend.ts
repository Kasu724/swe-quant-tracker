import { Resend } from "resend";
import type { MailMessage, MailProvider, MailSendResult } from "./base";

export class ResendMailProvider implements MailProvider {
  constructor(
    private readonly client: Resend,
    private readonly fromAddress: string
  ) {}

  async send(message: MailMessage): Promise<MailSendResult> {
    const result = await this.client.emails.send({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text
    });

    if (result.error) {
      throw new Error(`Resend email delivery failed: ${result.error.message}`);
    }

    return {
      messageId: result.data?.id
    };
  }
}

