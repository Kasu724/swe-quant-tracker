import { z } from "zod";

const applicationStates = ["NONE", "APPLIED", "HIDDEN"] as const;
const sourceTypes = [
  "GREENHOUSE",
  "LEVER",
  "ASHBY",
  "WORKDAY",
  "CUSTOM_HTML",
  "CUSTOM_API",
  "BROWSER_AUTOMATION"
] as const;

export const postingIdSchema = z.string().trim().min(1).max(64);

export const applicationStateSchema = z.enum(applicationStates);

export const savedSearchInputSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  alertsEnabled: z.boolean().optional(),
  alertCadence: z.enum(["IMMEDIATE", "DAILY"]).optional()
});

export const companySourceInputSchema = z.object({
  companyId: z.string().trim().min(1).max(64),
  sourceType: z.enum(sourceTypes),
  sourceIdentifier: z.string().trim().min(1).max(255),
  sourceUrl: z.string().trim().url().max(2048).refine(isHttpUrl, "Source URL must use HTTP or HTTPS"),
  priority: z.coerce.number().int().min(0).max(10_000),
  sourceName: z.string().trim().min(1).max(255)
});

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function safeExternalUrl(value: string | null | undefined): string | null {
  return value && isHttpUrl(value) ? value : null;
}

export function safeInternalPath(value: FormDataEntryValue | null | undefined, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }

  return value;
}

export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 100) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
