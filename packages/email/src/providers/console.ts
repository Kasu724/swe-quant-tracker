import type { MailMessage, MailProvider, MailSendResult } from "./base";

export class ConsoleMailProvider implements MailProvider {
  async send(message: MailMessage): Promise<MailSendResult> {
    console.info("[mail:console]", JSON.stringify(message, null, 2));

    return {
      messageId: `console-${Date.now()}`
    };
  }
}

