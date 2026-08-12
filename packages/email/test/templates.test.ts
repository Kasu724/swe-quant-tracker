import { describe, expect, it } from "vitest";
import { renderImmediateAlertEmail } from "../src/templates/alerts";
import { renderVerificationEmail } from "../src/templates/verification";

describe("email templates", () => {
  it("escapes posting and saved-search values and includes a complete text alternative", () => {
    const email = renderImmediateAlertEmail({
      searchName: '<img src=x onerror="alert(1)">',
      postings: [
        {
          company: "A&B <script>alert(1)</script>",
          title: "Quant Intern",
          location: "New York > Toronto",
          applicationUrl: "https://example.com/jobs/123?source=email&campaign=alerts"
        }
      ],
      manageUrl: "https://tracker.example.com/saved-searches",
      unsubscribeUrl: "https://tracker.example.com/unsubscribe/token"
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("A&amp;B &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.html).toContain("source=email&amp;campaign=alerts");
    expect(email.text).toContain("A&B <script>alert(1)</script> · Quant Intern");
    expect(email.text).toContain("Manage saved searches: https://tracker.example.com/saved-searches");
    expect(email.text).toContain("Unsubscribe: https://tracker.example.com/unsubscribe/token");
  });

  it("does not render unsafe link protocols", () => {
    const email = renderVerificationEmail({
      verifyUrl: "javascript:alert(1)",
      name: '<Admin & "Owner">'
    });

    expect(email.html).not.toContain("javascript:");
    expect(email.html).toContain("&lt;Admin &amp; &quot;Owner&quot;&gt;");
    expect(email.text).not.toContain("javascript:");
  });
});
