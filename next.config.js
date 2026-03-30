/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Node-only WebSocket client; keep out of edge/browser bundles for API routes
  serverExternalPackages: ['ws'],
  transpilePackages: ['react-markdown', 'remark-gfm'],
}

module.exports = nextConfig
