import type { Transporter } from "nodemailer";
import { describe, expect, it, vi } from "vitest";
import { SmtpMailProvider } from "../src/providers/smtp";

describe("SMTP provider", () => {
  it("passes only the supported message fields to Nodemailer", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "smtp-message-123" });
    const transporter = { sendMail } as unknown as Transporter;
    const provider = new SmtpMailProvider(
      "smtp://user:password@example.com:587",
      "Tracker <tracker@example.com>",
      transporter
    );

    await expect(
      provider.send({
        to: ["first@example.com", "second@example.com"],
        subject: "New internships",
        html: "<p>Two matches</p>",
        text: "Two matches"
      })
    ).resolves.toEqual({ messageId: "smtp-message-123" });

    expect(sendMail).toHaveBeenCalledWith({
      from: "Tracker <tracker@example.com>",
      to: ["first@example.com", "second@example.com"],
      subject: "New internships",
      html: "<p>Two matches</p>",
      text: "Two matches"
    });
  });
});
