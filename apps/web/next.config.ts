import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@school-system/shared'],
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
