import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://3.36.223.36/api/:path*",
      },
      {
        source: "/proxy-mosaic/:path*",
        destination: "http://3.36.223.36/api/mosaic/:path*",
      },
    ];
  },
};

export default nextConfig;
