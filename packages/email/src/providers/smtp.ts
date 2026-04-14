import nodemailer, { type Transporter } from "nodemailer";
import type { MailMessage, MailProvider, MailSendResult } from "./base";

export class SmtpMailProvider implements MailProvider {
  private readonly transporter: Transporter;

  constructor(
    smtpUrl: string,
    private readonly fromAddress: string
  ) {
    this.transporter = nodemailer.createTransport(smtpUrl);
  }

  async send(message: MailMessage): Promise<MailSendResult> {
    const result = await this.transporter.sendMail({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text
    });

    return {
      messageId: result.messageId
    };
  }
}

