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

  // PostHog reverse proxy — routes analytics through our own domain so
  // ad-blockers don't drop events. The client uses `/ingest` as its api_host.
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  // Required for the PostHog ingest API which relies on trailing slashes.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
