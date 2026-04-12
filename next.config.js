const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Node-only WebSocket client; keep out of edge/browser bundles for API routes
  serverExternalPackages: ['ws'],
  transpilePackages: ['react-markdown', 'remark-gfm'],
  // A lockfile in a parent folder (e.g. ~/Documents/pnpm-lock.yaml) can make Turbopack
  // pick the wrong workspace root so imports from this app's node_modules fail.
  turbopack: {
    root: path.resolve(__dirname),
  },
}

module.exports = nextConfig

