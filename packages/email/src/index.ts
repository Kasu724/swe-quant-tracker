import { Resend } from "resend";
import { readBaseEnv } from "@faang-quant/config";
import type { AlertProvider, AlertSendRequest, AlertSendResult } from "@faang-quant/shared";
import { ConsoleMailProvider } from "./providers/console";
import type { MailProvider } from "./providers/base";
import { ResendMailProvider } from "./providers/resend";
import { SmtpMailProvider } from "./providers/smtp";

export * from "./providers/base";
export * from "./providers/console";
export * from "./providers/resend";
export * from "./providers/smtp";
export * from "./templates/alerts";
export * from "./templates/verification";

export function createMailProvider(): MailProvider {
  const env = readBaseEnv();

  switch (env.EMAIL_PROVIDER) {
    case "resend":
      if (!env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
      }

      return new ResendMailProvider(new Resend(env.RESEND_API_KEY), env.EMAIL_FROM);
    case "smtp":
      if (!env.SMTP_URL) {
        throw new Error("SMTP_URL is required when EMAIL_PROVIDER=smtp");
      }

      return new SmtpMailProvider(env.SMTP_URL, env.EMAIL_FROM);
    case "console":
    default:
      return new ConsoleMailProvider();
  }
}

export class EmailAlertProvider implements AlertProvider {
  readonly channel = "EMAIL" as const;

  constructor(private readonly mailProvider: MailProvider = createMailProvider()) {}

  async send(message: AlertSendRequest): Promise<AlertSendResult> {
    const result = await this.mailProvider.send({
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text
    });

    return {
      providerMessageId: result.messageId
    };
  }
}
