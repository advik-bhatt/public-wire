import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The project was originally developed as "mouthpiece" before being
      // renamed to "public-wire". Forward the old deployment to the canonical
      // production URL so every host resolves to the same place.
      {
        source: "/:path*",
        has: [{ type: "host", value: "mouthpiece.vercel.app" }],
        destination: "https://public-wire.vercel.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
