/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  output: 'standalone',
  compress: false, // Apache handles compression
  
  // Security headers (Apache also sets these, but good to have as fallback)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Trust proxy headers from Apache
  async rewrites() {
    return [
      // Handle health check endpoint
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
  
  // Environment-specific settings
  env: {
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://levantai.colab.duke.edu',
  },
  
  // Asset optimization
  images: {
    domains: [
      'levantai.colab.duke.edu',
      'www.levantai.colab.duke.edu',
      'localhost',
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Performance optimizations
  experimental: {
    optimizeServerReact: true,
    optimizeCss: true,
  },
  
  // Webpack optimizations for production
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Production client-side optimizations
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      };
    }
    
    return config;
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Generate etags for better caching
  generateEtags: true,
  
  // Gzip compression disabled (Apache handles it)
  compress: false,
  
  // Static file serving optimization
  trailingSlash: false,
  
  // React strict mode for better error detection
  reactStrictMode: true,
  
  // Bundle analyzer for production debugging (optional)
  // Uncomment if you want to analyze bundle size
  // bundleAnalyzer: {
  //   enabled: process.env.ANALYZE === 'true',
  // },
};

export default nextConfig; 