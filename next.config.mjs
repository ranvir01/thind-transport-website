const serverActionAllowedOrigins = (process.env.NEXT_SERVER_ACTION_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  reactStrictMode: true,
  experimental: {
    serverActions: serverActionAllowedOrigins.length
      ? {
          allowedOrigins: serverActionAllowedOrigins,
        }
      : undefined,
  },
  // Turbopack configuration (default bundler in Next.js 16)
  turbopack: {},
  // Webpack configuration (fallback for production builds if needed)
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
