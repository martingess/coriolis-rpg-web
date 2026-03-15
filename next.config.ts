import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const rootDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://127.0.0.1:3100"],
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
