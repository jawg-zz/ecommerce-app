/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Forwarded-For', value: ':remoteAddr' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
