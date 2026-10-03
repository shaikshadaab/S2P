/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vintha/shared"],
  experimental: {
    serverComponentsExternalPackages: ["crypto"],
  },
};

module.exports = nextConfig;
