import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tells Next.js to build a static HTML/CSS/JS version of your app
  output: 'export',
  
  // Required for static exports when using the Next.js <Image> component
  images: {
    unoptimized: true,
  },
};

export default nextConfig;