import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/signals',
        destination: `${backendUrl}/api/signals`,
      },
      {
        source: '/api/investor',
        destination: `${backendUrl}/api/investor`,
      },
      {
        source: '/api/scan/:path*',
        destination: `${backendUrl}/api/scan/:path*`,
      },
    ];
  },
};

export default nextConfig;
