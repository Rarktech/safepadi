import type { NextConfig } from "next";

const nextConfig: any = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  allowedDevOrigins: ['4db5-105-120-129-107.ngrok-free.app', 'localhost:3001', '*.ngrok-free.app'],
  async rewrites() {
    const apiDest = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace('/api', '');
    return [
      {
        source: '/api/:path*',
        destination: `${apiDest}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
