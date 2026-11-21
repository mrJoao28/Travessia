import type { NextConfig } from "next";
import { resolve } from "node:path";

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/v1/missions/:id/material-assets/:assetId/pdf",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};
export default config;
