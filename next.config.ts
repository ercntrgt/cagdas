import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // package-lock.json üst dizinde olduğu için kökü açıkça belirt
  turbopack: { root: __dirname },
}

export default nextConfig
