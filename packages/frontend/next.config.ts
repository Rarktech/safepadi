import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: any = {
  turbopack: {
    resolveAlias: {
      '@farcaster/miniapp-sdk': './farcaster-stub.js',
    },
  },
  webpack(config: any) {
    config.resolve.alias['@farcaster/miniapp-sdk'] = path.resolve(__dirname, 'farcaster-stub.js');
    return config;
  },
  images: {
    unoptimized: true,
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

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: false,
});
