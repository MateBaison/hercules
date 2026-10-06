import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.HERCULES_TEST_BUILD === "1" ? ".next-test" : ".next",
};

export default nextConfig;
