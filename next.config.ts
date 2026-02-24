import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/signals',
        destination: 'http://127.0.0.1:8080/api/signals',
      },
      {
        source: '/api/investor',
        destination: 'http://127.0.0.1:8080/api/investor',
      },
      {
        source: '/api/scan/:path*',
        destination: 'http://127.0.0.1:8080/api/scan/:path*',
      },
    ];
  },
};

export default nextConfig;
