import { escapeHtml, renderEmailLayout } from "./layout";

type AlertPosting = {
  company: string;
  title: string;
  location?: string | null;
  applicationUrl: string;
};

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

function renderPostingList(postings: AlertPosting[]): string {
  return postings
    .map((posting) => {
      const applicationUrl = normalizeHttpUrl(posting.applicationUrl);

      return `
        <li style="margin-bottom:14px;">
          <div style="font-weight:700;">${escapeHtml(posting.company)} · ${escapeHtml(posting.title)}</div>
          <div style="color:#667085;">${escapeHtml(posting.location ?? "Location not listed")}</div>
          ${applicationUrl ? `<a href="${escapeHtml(applicationUrl)}">${escapeHtml(applicationUrl)}</a>` : ""}
        </li>
      `;
    })
    .join("");
}

function renderPostingListText(postings: AlertPosting[]): string {
  return postings
    .map((posting) => {
      const lines = [
        `- ${posting.company} · ${posting.title}`,
        `  ${posting.location ?? "Location not listed"}`
      ];
      const applicationUrl = normalizeHttpUrl(posting.applicationUrl);

      if (applicationUrl) {
        lines.push(`  ${applicationUrl}`);
      }

      return lines.join("\n");
    })
    .join("\n");
}

function renderActionLinks(manageUrl?: string, unsubscribeUrl?: string): string {
  return [
    manageUrl ? `<a href="${escapeHtml(manageUrl)}">Manage saved searches</a>` : "",
    unsubscribeUrl ? `<a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a>` : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

function renderActionLinksText(manageUrl?: string, unsubscribeUrl?: string): string {
  return [
    manageUrl ? `Manage saved searches: ${manageUrl}` : "",
    unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderImmediateAlertEmail(input: {
  searchName: string;
  postings: AlertPosting[];
  manageUrl: string;
  unsubscribeUrl: string;
}) {
  const manageUrl = normalizeHttpUrl(input.manageUrl);
  const unsubscribeUrl = normalizeHttpUrl(input.unsubscribeUrl);
  const bodyHtml = `
    <p>Your saved search <strong>${escapeHtml(input.searchName)}</strong> matched ${input.postings.length} new internship posting(s).</p>
    <ul style="padding-left:18px;">${renderPostingList(input.postings)}</ul>
    <p>${renderActionLinks(manageUrl, unsubscribeUrl)}</p>
  `;
  const bodyText = [
    `Your saved search "${input.searchName}" matched ${input.postings.length} new internship posting(s).`,
    "",
    renderPostingListText(input.postings),
    "",
    renderActionLinksText(manageUrl, unsubscribeUrl)
  ].join("\n");

  return {
    subject: `${input.postings.length} new internship match${input.postings.length === 1 ? "" : "es"}`,
    ...renderEmailLayout({
      eyebrow: "Immediate Alert",
      title: "New internship matches",
      intro: "A newly discovered role matched one of your saved searches.",
      bodyHtml,
      bodyText,
      footerText: "Adjust cadence or unsubscribe anytime."
    })
  };
}

export function renderDailyDigestEmail(input: {
  postings: AlertPosting[];
  manageUrl: string;
  unsubscribeUrl: string;
}) {
  const manageUrl = normalizeHttpUrl(input.manageUrl);
  const unsubscribeUrl = normalizeHttpUrl(input.unsubscribeUrl);
  const bodyHtml = `
    <p>Here is your latest internship digest.</p>
    <ul style="padding-left:18px;">${renderPostingList(input.postings)}</ul>
    <p>${renderActionLinks(manageUrl, unsubscribeUrl)}</p>
  `;
  const bodyText = [
    "Here is your latest internship digest.",
    "",
    renderPostingListText(input.postings),
    "",
    renderActionLinksText(manageUrl, unsubscribeUrl)
  ].join("\n");

  return {
    subject: `Daily internship digest: ${input.postings.length} new matches`,
    ...renderEmailLayout({
      eyebrow: "Daily Digest",
      title: "Today’s internship digest",
      intro: "Fresh roles that matched your saved searches.",
      bodyHtml,
      bodyText,
      footerText: "You’re receiving this because at least one saved search is set to daily."
    })
  };
}
