import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SKU Blob uploads allow 2 MB files; multipart FormData needs headroom
  // above the default 1 MB Server Action body limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
