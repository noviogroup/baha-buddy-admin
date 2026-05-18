/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── Security ─────────────────────────────────────────────────────
  // Remove the X-Powered-By: Next.js header. Don't advertise the stack.
  poweredByHeader: false,

  // Don't ship browser-readable source maps to production. Internal admin
  // panel — no debugging from the browser DevTools in the wild.
  productionBrowserSourceMaps: false,

  // ─── Build behavior ───────────────────────────────────────────────
  reactStrictMode: true,

  // Skip lint during build — caught in CI/PR. Speeds up Netlify builds.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript errors must still block builds — they catch real bugs.
  typescript: {
    ignoreBuildErrors: false,
  },

  // ─── Images ───────────────────────────────────────────────────────
  // We don't currently serve user-uploaded images from this app, but
  // Sanity images and Supabase storage might appear in future surfaces.
  // Whitelist those origins now to avoid a future scramble.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

module.exports = nextConfig;
