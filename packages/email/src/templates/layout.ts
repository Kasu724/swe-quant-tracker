function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailLayout(input: {
  eyebrow: string;
  title: string;
  intro: string;
  bodyHtml: string;
  footerText?: string;
}): { html: string; text: string } {
  const footerText = input.footerText ?? "Internship Tracker";
  const text = [input.eyebrow, input.title, "", input.intro, "", footerText].join("\n");

  return {
    text,
    html: `
      <div style="background:#f4f7fb;padding:32px;font-family:Arial,sans-serif;color:#101828;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;padding:32px;border:1px solid #e4e7ec;">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#1f58cc;font-weight:700;">
            ${escapeHtml(input.eyebrow)}
          </div>
          <h1 style="font-size:28px;line-height:1.2;margin:12px 0 16px;">${escapeHtml(input.title)}</h1>
          <p style="font-size:16px;line-height:1.6;color:#344054;margin:0 0 20px;">${escapeHtml(input.intro)}</p>
          <div style="font-size:15px;line-height:1.6;color:#101828;">${input.bodyHtml}</div>
          <hr style="border:none;border-top:1px solid #eaecf0;margin:28px 0;" />
          <p style="font-size:13px;color:#667085;margin:0;">${escapeHtml(footerText)}</p>
        </div>
      </div>
    `
  };
}

