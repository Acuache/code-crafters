import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Portadas de los cursos (`courses.image_url`), servidas por el CDN de Thinkific de DevTalles.
    remotePatterns: [new URL("https://import.cdn.thinkific.com/**")],
  },
};

export default nextConfig;
