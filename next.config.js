/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
