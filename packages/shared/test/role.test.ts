import { describe, expect, it } from "vitest";
import { categorizeRole } from "../src/normalization/role";

describe("categorizeRole", () => {
  it("categorizes quant research roles", () => {
    expect(categorizeRole("Quantitative Research Intern", "Alpha research")).toBe("QUANT_RESEARCH");
  });

  it("categorizes infrastructure roles", () => {
    expect(categorizeRole("Platform Engineering Intern", "Distributed systems and SRE")).toBe("INFRA_SYSTEMS");
  });

  it("categorizes product roles", () => {
    expect(categorizeRole("Product Manager Intern", "")).toBe("PRODUCT_PM");
  });
});

