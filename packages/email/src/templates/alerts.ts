import { renderEmailLayout } from "./layout";

type AlertPosting = {
  company: string;
  title: string;
  location?: string | null;
  applicationUrl: string;
};

function renderPostingList(postings: AlertPosting[]): string {
  return postings
    .map(
      (posting) => `
        <li style="margin-bottom:14px;">
          <div style="font-weight:700;">${posting.company} · ${posting.title}</div>
          <div style="color:#667085;">${posting.location ?? "Location not listed"}</div>
          <a href="${posting.applicationUrl}">${posting.applicationUrl}</a>
        </li>
      `
    )
    .join("");
}

export function renderImmediateAlertEmail(input: {
  searchName: string;
  postings: AlertPosting[];
  manageUrl: string;
  unsubscribeUrl: string;
}) {
  const bodyHtml = `
    <p>Your saved search <strong>${input.searchName}</strong> matched ${input.postings.length} new internship posting(s).</p>
    <ul style="padding-left:18px;">${renderPostingList(input.postings)}</ul>
    <p><a href="${input.manageUrl}">Manage saved searches</a> · <a href="${input.unsubscribeUrl}">Unsubscribe</a></p>
  `;

  return {
    subject: `${input.postings.length} new internship match${input.postings.length === 1 ? "" : "es"}`,
    ...renderEmailLayout({
      eyebrow: "Immediate Alert",
      title: "New internship matches",
      intro: "A newly discovered role matched one of your saved searches.",
      bodyHtml,
      footerText: "Adjust cadence or unsubscribe anytime."
    })
  };
}

export function renderDailyDigestEmail(input: {
  postings: AlertPosting[];
  manageUrl: string;
  unsubscribeUrl: string;
}) {
  const bodyHtml = `
    <p>Here is your latest internship digest.</p>
    <ul style="padding-left:18px;">${renderPostingList(input.postings)}</ul>
    <p><a href="${input.manageUrl}">Manage saved searches</a> · <a href="${input.unsubscribeUrl}">Unsubscribe</a></p>
  `;

  return {
    subject: `Daily internship digest: ${input.postings.length} new matches`,
    ...renderEmailLayout({
      eyebrow: "Daily Digest",
      title: "Today’s internship digest",
      intro: "Fresh roles that matched your saved searches.",
      bodyHtml,
      footerText: "You’re receiving this because at least one saved search is set to daily."
    })
  };
}

