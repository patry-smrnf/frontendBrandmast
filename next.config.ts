import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://whispering-cynthia-brandmast-9a13ee72.koyeb.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;
