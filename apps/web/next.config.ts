import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@school-system/shared'],
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
