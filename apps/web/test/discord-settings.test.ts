import { beforeEach, describe, expect, it, vi } from "vitest";
import { listingFilterSchema } from "@swe-quant/shared";
import { parseListingFilterForm, parseListingFilters } from "../lib/listing-filter-params";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), upsert: vi.fn(), transaction: vi.fn(), revalidate: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("../lib/local-profile", () => ({
  getLocalProfile: async () => ({ id: "local-user" }),
  LOCAL_PROFILE_EMAIL: "local@example.invalid",
  isPlaceholderLocalEmail: () => false
}));
vi.mock("@swe-quant/db", () => ({
  Prisma: { DbNull: null },
  prisma: { $transaction: mocks.transaction }
}));

import { saveDiscordSettingsAction } from "../lib/actions";
import { portableDataSchema } from "../lib/portable-data";

function notificationForm() {
  const form = new FormData();
  for (const [key, value] of [
    ["discordEnabled", "on"], ["company", "amazon"], ["company", "google"],
    ["category", "SWE"], ["bucket", "FAANG"], ["season", "SUMMER"],
    ["year", "2027"], ["q", "engineer"], ["location", "Seattle"],
    ["remote", "HYBRID"], ["payKnown", "known"], ["minimumPay", "50"],
    ["activeOnly", "false"], ["activeOnly", "on"],
    ["includeMissingPay", "false"], ["includeMissingLocation", "false"]
  ]) form.append(key!, value!);
  return form;
}

describe("Discord notification settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue({ webhookUrl: "https://discord.com/api/webhooks/saved/token" });
    mocks.transaction.mockImplementation(async (callback) => callback({
      discordDestination: { findUnique: mocks.findUnique, upsert: mocks.upsert }
    }));
  });

  it("parses notification controls exactly like feed parameters, including repeated checkboxes", () => {
    const form = notificationForm();
    const params = Object.fromEntries(Array.from(new Set(form.keys()), (key) => [key, form.getAll(key).map(String)]));
    expect(parseListingFilterForm(form)).toEqual(parseListingFilters(params));
    expect(parseListingFilterForm(form)).toMatchObject({
      companySlugs: ["amazon", "google"], roleCategories: ["SWE"], minimumPay: 50,
      activeOnly: true, includeMissingPay: false, includeMissingLocation: false
    });
  });

  it("persists an independent filter configuration while keeping the saved webhook", async () => {
    const form = notificationForm();
    await saveDiscordSettingsAction(form);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "local-user" },
      update: expect.objectContaining({ filterJson: parseListingFilterForm(form) }),
      create: expect.objectContaining({
        webhookUrl: "https://discord.com/api/webhooks/saved/token",
        filterJson: parseListingFilterForm(form)
      })
    }));
    expect(mocks.revalidate).toHaveBeenCalledExactlyOnceWith("/settings");
  });

  it("saves defaults with no company restriction for a new destination", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const form = new FormData();
    form.set("discordWebhookUrl", "https://discord.com/api/webhooks/new/token");
    form.set("discordEnabled", "on");
    await saveDiscordSettingsAction(form);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ filterJson: listingFilterSchema.parse({}), enabled: true })
    }));
  });

  it("rejects invalid filters before changing saved settings", async () => {
    const form = notificationForm();
    form.set("minimumPay", "-5");
    await saveDiscordSettingsAction(form);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("preserves notification filters in portable backups and accepts older backups", () => {
    const legacy = {
      format: "swe-quant-tracker-backup", version: 1, exportedAt: new Date().toISOString(),
      settings: { notificationEmail: null, alertEmailsEnabled: false, digestTimezone: "America/New_York" },
      discord: { enabled: true, companySlugs: ["amazon"] }, savedSearches: [], jobs: [], companies: []
    };
    expect(portableDataSchema.parse(legacy).discord?.filters).toBeUndefined();
    const filters = parseListingFilterForm(notificationForm());
    const backup = { ...legacy, discord: { ...legacy.discord, filters } };
    expect(portableDataSchema.parse(JSON.parse(JSON.stringify(backup))).discord?.filters).toEqual(filters);
  });
});
