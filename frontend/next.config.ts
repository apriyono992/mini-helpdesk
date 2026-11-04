import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import type { NextConfig } from "next";

// Load root .env when running locally
const envCandidates = [
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), ".env"),
];
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
      break;
    } catch {
      // ignore
    }
  }
}

const isDev = process.env.NODE_ENV !== "production";
const backendOrigin = process.env.BACKEND_URL ?? "http://localhost:8000";
const defaultWs = isDev ? "ws://localhost:8000" : "";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? (isDev ? "http://localhost:8000" : "/api"),
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? defaultWs,
  },
  async rewrites() {
    if (!isDev) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
