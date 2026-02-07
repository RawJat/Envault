import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default withMDX(nextConfig);
