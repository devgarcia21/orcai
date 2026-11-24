import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // A logo pode ter até 2 MB; a folga cobre o overhead do multipart/form-data.
      bodySizeLimit: "3mb",
    },
  },
  // As fontes do PDF são lidas do disco em tempo de execução; garante que
  // entrem no pacote da rota em produção (ex.: Vercel).
  outputFileTracingIncludes: {
    "/painel/orcamentos/*/pdf": ["./src/lib/pdf/fontes/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
