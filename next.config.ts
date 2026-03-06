import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Empty turbopack config to opt-in to Turbopack (Next.js 16 default)
  turbopack: {},

  // WASM support for Shiki syntax highlighter (webpack fallback)
  webpack(config) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

export default nextConfig;
