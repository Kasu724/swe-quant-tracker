import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: ["all-the-cities"],
  webpack(config, { dev, isServer }) {
    if (!dev) {
      config.cache = false;
    }
    if (isServer) {
      config.externals.push({ "all-the-cities": "commonjs all-the-cities" });
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  },
  transpilePackages: [
    "@swe-quant/config",
    "@swe-quant/db",
    "@swe-quant/email",
    "@swe-quant/shared",
    "@swe-quant/ui"
  ]
};

export default nextConfig;
