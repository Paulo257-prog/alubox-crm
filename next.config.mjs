/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Substitua pelo hostname real do seu projeto Supabase, ex:
        // "xxxxxxxxxxxx.supabase.co"
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
