import { escapeHtml, renderEmailLayout } from "./layout";

function normalizeHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function renderVerificationEmail(input: { verifyUrl: string; name?: string | null }) {
  const greeting = input.name ? `${input.name},` : "there,";
  const verifyUrl = normalizeHttpUrl(input.verifyUrl);
  const bodyHtml = `
    <p>Hi ${escapeHtml(greeting)}</p>
    <p>Confirm your email address to activate internship alerts and saved searches.</p>
    <p>
      ${verifyUrl ? `<a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:#1f58cc;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">` : ""}
        Verify email
      ${verifyUrl ? "</a>" : ""}
    </p>
    <p>If you did not create an account, you can ignore this email.</p>
  `;
  const bodyText = [
    `Hi ${greeting}`,
    "",
    "Confirm your email address to activate internship alerts and saved searches.",
    verifyUrl ? `Verify email: ${verifyUrl}` : "",
    "",
    "If you did not create an account, you can ignore this email."
  ]
    .filter((line, index, lines) => line || lines[index - 1])
    .join("\n");

  return {
    subject: "Verify your SWE + Quant Internship Tracker email",
    ...renderEmailLayout({
      eyebrow: "Account Security",
      title: "Verify your email",
      intro: "One click finishes setup.",
      bodyHtml,
      bodyText,
      footerText: "This verification link expires in 24 hours."
    })
  };
}
