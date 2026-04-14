import type { RoleCategoryValue } from "../types";
import { canonicalizeText } from "./text";

const CATEGORY_RULES: Array<[RoleCategoryValue, RegExp[]]> = [
  [
    "HARDWARE_FPGA_LOW_LATENCY",
    [/\bfpga\b/i, /\bhardware\b/i, /\bembedded\b/i, /\blow latency\b/i]
  ],
  [
    "QUANT_RESEARCH",
    [/\bquant(itative)? research/i, /\bresearch scientist\b/i, /\balpha research\b/i]
  ],
  [
    "QUANT_DEV",
    [/\bquant(itative)? developer\b/i, /\btrading systems\b/i, /\bstrats?\b/i]
  ],
  [
    "TRADING",
    [/\btrader\b/i, /\btrading\b/i, /\bexecution\b/i, /\bmarket making\b/i]
  ],
  [
    "DATA_ML_AI",
    [/\bmachine learning\b/i, /\bml\b/i, /\bartificial intelligence\b/i, /\bdata science\b/i, /\bapplied scientist\b/i]
  ],
  [
    "SECURITY",
    [/\bsecurity\b/i, /\bappsec\b/i, /\bcyber\b/i, /\bthreat\b/i, /\bred team\b/i]
  ],
  [
    "INFRA_SYSTEMS",
    [/\binfrastructure\b/i, /\bsite reliability\b/i, /\bsre\b/i, /\bplatform\b/i, /\bdistributed systems\b/i, /\bdevops\b/i, /\bnetwork\b/i]
  ],
  [
    "PRODUCT_PM",
    [/\bproduct manager\b/i, /\bproduct management\b/i, /\btechnical pm\b/i]
  ],
  [
    "SWE",
    [/\bsoftware engineer\b/i, /\bsoftware developer\b/i, /\bfull stack\b/i, /\bfrontend\b/i, /\bbackend\b/i, /\bweb developer\b/i]
  ]
];

export function normalizeTitle(title: string): string {
  return canonicalizeText(title)
    .replace(/\bengineering\b/g, " engineer ")
    .replace(/\bengineers?\b/g, " engineer ")
    .replace(/\bdevelopers?\b/g, " developer ")
    .replace(/\bintern(ship)?\b/g, " ")
    .replace(/\bsummer\b/g, " ")
    .replace(/\bfall\b/g, " ")
    .replace(/\bspring\b/g, " ")
    .replace(/\bwinter\b/g, " ")
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function categorizeRole(title: string, description?: string | null): RoleCategoryValue {
  const combined = `${title} ${description ?? ""}`;

  for (const [category, patterns] of CATEGORY_RULES) {
    if (patterns.some((pattern) => pattern.test(combined))) {
      return category;
    }
  }

  return "OTHER";
}
