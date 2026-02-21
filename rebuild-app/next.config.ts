import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep config minimal for Netlify Next runtime compatibility.
  eslint: {
    // Our ESLint flat-config setup is still in flux; do not block prod builds/deploys on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
