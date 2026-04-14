import { renderEmailLayout } from "./layout";

export function renderVerificationEmail(input: { verifyUrl: string; name?: string | null }) {
  const greeting = input.name ? `${input.name},` : "there,";
  const bodyHtml = `
    <p>Hi ${greeting}</p>
    <p>Confirm your email address to activate internship alerts and saved searches.</p>
    <p>
      <a href="${input.verifyUrl}" style="display:inline-block;background:#1f58cc;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
        Verify email
      </a>
    </p>
    <p>If you did not create an account, you can ignore this email.</p>
  `;

  return {
    subject: "Verify your Internship Tracker email",
    ...renderEmailLayout({
      eyebrow: "Account Security",
      title: "Verify your email",
      intro: "One click finishes setup.",
      bodyHtml,
      footerText: "This verification link expires in 24 hours."
    })
  };
}

