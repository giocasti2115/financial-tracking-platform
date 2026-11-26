const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1"

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isCapacitorBuild
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
