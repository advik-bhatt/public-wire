import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Legacy / alternate hostnames funnel to the canonical production URL.
      // The project was originally developed as "mouthpiece", and
      // "locallens-silk" is an older Vercel alias for the same site.
      {
        source: "/:path*",
        has: [{ type: "host", value: "mouthpiece.vercel.app" }],
        destination: "https://public-wire.vercel.app/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "locallens-silk.vercel.app" }],
        destination: "https://public-wire.vercel.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
