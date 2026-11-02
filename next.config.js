/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'puppeteer-core'],
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
