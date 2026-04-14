import type { SourceTypeValue } from "../types";
import { AshbyAdapter } from "./ashby";
import { CustomApiAdapter } from "./custom-api";
import { CustomHtmlAdapter } from "./custom-html";
import { GreenhouseAdapter } from "./greenhouse";
import { LeverAdapter } from "./lever";

export { type SourceAdapter } from "./base";
export { AshbyAdapter } from "./ashby";
export { CustomApiAdapter } from "./custom-api";
export { CustomHtmlAdapter } from "./custom-html";
export { GreenhouseAdapter } from "./greenhouse";
export { LeverAdapter } from "./lever";

const adapters = [
  new GreenhouseAdapter(),
  new LeverAdapter(),
  new AshbyAdapter(),
  new CustomApiAdapter(),
  new CustomHtmlAdapter()
];

export function getAdapter(type: SourceTypeValue) {
  const adapter = adapters.find((entry) => entry.type === type);

  if (!adapter) {
    throw new Error(`No adapter registered for source type: ${type}`);
  }

  return adapter;
}
