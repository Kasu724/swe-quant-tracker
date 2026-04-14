import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@faang-quant/config",
    "@faang-quant/db",
    "@faang-quant/email",
    "@faang-quant/shared",
    "@faang-quant/ui"
  ]
};

export default nextConfig;
