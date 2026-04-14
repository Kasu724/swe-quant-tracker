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

    return {
      messageId: result.data?.id
    };
  }
}

