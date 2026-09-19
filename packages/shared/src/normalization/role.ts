import type { RoleCategoryValue } from "../types";
import { canonicalizeText } from "./text";

type RoleRule = [RoleCategoryValue, RegExp[]];

// A description can mention technologies or collaborating teams from several
// disciplines. The title is the reliable signal for the role being hired.
const TITLE_RULES: RoleRule[] = [
  ["QUANT_RESEARCH", [
    /\bquant(?:itative)? (?:research(?:er)?|analyst|scientist)\b/,
    /\balpha research(?:er)?\b/
  ]],
  ["QUANT_DEV", [
    /\bquant(?:itative)? (?:developer|engineer|dev|software (?:developer|engineer))\b/,
    /\b(?:trading|market making) (?:systems? )?(?:software )?(?:developer|engineer)\b/,
    /\b(?:trading|execution) systems?\b/,
    /\b(?:low latency|execution) (?:trading|quant)\b/,
    /\b(?:trading|quant) (?:execution|low latency)\b/,
    /\bstrats? (?:developer|engineer)\b/
  ]],
  ["TRADING", [
    /\b(?:trader|trading analyst|trading intern|market maker|market making analyst|execution trader)\b/
  ]],
  ["ML_AI", [
    /\b(?:machine learning|deep learning|artificial intelligence|generative ai|gen ai|ml|ai)\b/,
    /\b(?:applied scientist|nlp|computer vision)\b/
  ]],
  ["DATA", [
    /\bdata (?:scientist|science|engineer|engineering|analyst|analytics|architect)\b/,
    /\b(?:analytics engineer|business intelligence|bi analyst|data platform)\b/
  ]],
  ["SECURITY", [
    /\b(?:security|cybersecurity|cyber security|appsec|infosec|threat intelligence|penetration test(?:er|ing)|red team)\b/
  ]],
  ["HARDWARE_EMBEDDED", [
    /\b(?:fpga|asic|firmware|embedded(?: systems| software)?|hardware|electrical engineer|electrical engineering|vlsi|semiconductor|chip design|circuit design)\b/
  ]],
  ["INFRA_SYSTEMS", [
    /\b(?:infrastructure|site reliability|sre|devops|platform engineering|platform engineer|distributed systems|cloud engineer|cloud infrastructure|network engineer|network engineering|systems engineer|systems engineering|low latency)\b/,
    /\bdata center (?:engineer|engineering|infrastructure)\b/
  ]],
  ["PRODUCT_PM", [
    /\b(?:product (?:manager|management)|technical (?:program|product) manager|program manager|technical pm|product owner)\b/
  ]],
  ["SWE", [
    /\b(?:software (?:engineer|engineering|developer|development)|full stack|frontend|front end|backend|back end|web developer|web engineer|mobile developer|mobile engineer|ios developer|android developer|swe|sde)\b/
  ]],
  ["ENGINEERING", [
    /\b(?:engineer|engineering|mechanical|manufacturing|industrial|civil|chemical|aerospace|robotics)\b/
  ]]
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

export function categorizeRole(title: string, _description?: string | null): RoleCategoryValue {
  const normalizedTitle = canonicalizeText(title);

  for (const [category, patterns] of TITLE_RULES) {
    if (patterns.some((pattern) => pattern.test(normalizedTitle))) {
      return category;
    }
  }

  return "OTHER";
}
