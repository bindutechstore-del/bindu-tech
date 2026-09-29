import type { NextConfig } from "next";

/**
 * Supabase Storage lives on `<project-ref>.supabase.co`. We derive the allowed
 * remote image host from the public URL instead of hardcoding a project ref so
 * the same config works across local / staging / production.
 */
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Title, description, canonical and Open Graph tags always go in <head>.
  // Next 16 otherwise streams them into the body for ordinary browsers, and
  // Lighthouse, Facebook, WhatsApp and some crawlers only read the head.
  htmlLimitedBots: /.*/,
  images: {
    formats: ["image/avif", "image/webp"],
    // Storefront grid asks for 1x/2x of a ~300px card, PDP asks for ~900px.
    deviceSizes: [360, 420, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 192, 256, 320, 420, 640],
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // Seed/demo imagery. Remove once every product has an uploaded asset.
      { protocol: "https" as const, hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            /*
             * `geolocation=()` disabled it for EVERYONE including us, so the
             * checkout map's "Use my location" was blocked by the browser
             * without ever prompting — it just returned PERMISSION_DENIED,
             * which looked like the customer had refused.
             *
             * `(self)` allows our own origin and still blocks any third-party
             * iframe. Camera and microphone stay fully off; nothing here needs
             * them.
             */
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
