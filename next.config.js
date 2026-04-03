/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config) => {
    // Exclude file-type from webpack processing (use dynamic import instead)
    config.externals = config.externals || [];
    config.externals.push({
      'file-type': 'commonjs file-type',
    });
    return config;
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
