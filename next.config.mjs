/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  reactStrictMode: true,
  // Server-only packages the bundler must not try to compile (IMAP client
  // pulls in pino/thread-stream worker files that break webpack).
  serverExternalPackages: ['imapflow', 'mailparser', 'web-push'],
  // The migrate cron reads migrations/hub/*.sql at runtime — force them into
  // the serverless bundle (fs reads are invisible to static tracing).
  outputFileTracingIncludes: {
    '/api/hub/cron/[job]': ['./migrations/hub/**'],
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
