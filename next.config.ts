import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Old routes from before the app shell (milestone 2).
    return [
      { source: "/dashboard", destination: "/repositories", permanent: false },
      { source: "/repos/:id", destination: "/repositories/:id", permanent: false },
    ];
  },
};

export default nextConfig;
