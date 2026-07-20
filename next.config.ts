import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack(config) {
    config.resolve ||= {};
    config.resolve.alias ||= {};
    
    // Handle WASM imports - mark them as external for the browser
    config.resolve.fallback ||= {};
    config.resolve.fallback["arcjet:js-req/bot-identifier"] = false;
    config.resolve.fallback["arcjet:js-req/email-validator-overrides"] = false;
    config.resolve.fallback["arcjet:js-req/filter-overrides"] = false;
    config.resolve.fallback["arcjet:js-req/sensitive-information-identifier"] = false;
    config.resolve.fallback["arcjet:js-req/verify-bot"] = false;

    config.experiments ||= {};
    config.experiments.asyncWebAssembly = true;
    config.experiments.topLevelAwait = true;

    return config;
  },
  serverExternalPackages:[
    "@cline/sdk",
    "@cline/core",
    "@cline/agents",
    "@cline/llms",
    "@cline/shared"
  ]
};

export default nextConfig;