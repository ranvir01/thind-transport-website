/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  reactStrictMode: true,
  // Turbopack configuration (default bundler in Next.js 16)
  turbopack: {},
  // Webpack configuration (fallback for production builds if needed)
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
