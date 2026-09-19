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

  it.each([
    ["Software Development Engineer Intern", "SWE"],
    ["Backend Software Engineer", "SWE"],
    ["Quant Developer Intern", "QUANT_DEV"],
    ["Quantitative Software Engineer", "QUANT_DEV"],
    ["Trading Systems Intern", "QUANT_DEV"],
    ["Low Latency Trading Engineer", "QUANT_DEV"],
    ["Execution Trader Intern", "TRADING"],
    ["Machine Learning Engineer Intern", "ML_AI"],
    ["AI Research Scientist", "ML_AI"],
    ["Data Scientist Intern", "DATA"],
    ["Data Engineer, New Grad", "DATA"],
    ["Business Intelligence Analyst", "DATA"],
    ["Security Software Engineer", "SECURITY"],
    ["Site Reliability Engineer", "INFRA_SYSTEMS"],
    ["Low Latency Systems Engineer", "INFRA_SYSTEMS"],
    ["Data Center Infrastructure Engineer", "INFRA_SYSTEMS"],
    ["FPGA Engineer Intern", "HARDWARE_EMBEDDED"],
    ["Embedded Firmware Engineer", "HARDWARE_EMBEDDED"],
    ["Hardware Systems Engineer", "HARDWARE_EMBEDDED"],
    ["Engineering Intern", "ENGINEERING"],
    ["Mechanical Engineering Co-op", "ENGINEERING"],
    ["Technical Program Manager Intern", "PRODUCT_PM"],
    ["Summer Business Analyst", "OTHER"]
  ] as const)("categorizes %s as %s", (title, category) => {
    expect(categorizeRole(title)).toBe(category);
  });

  it("does not let description keywords override the actual title", () => {
    expect(categorizeRole("Software Engineer Intern", "FPGA, hardware, low latency, and trading systems teams")).toBe("SWE");
    expect(categorizeRole("Engineering Intern", "Collaborate with embedded hardware and AI teams")).toBe("ENGINEERING");
    expect(categorizeRole("Data Analyst Intern", "Support machine learning researchers")).toBe("DATA");
    expect(categorizeRole("Research Scientist Intern", "Quant research colleagues on the team")).toBe("OTHER");
  });
});
