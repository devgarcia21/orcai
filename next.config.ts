import type { NextConfig } from "next";

/**
 * Netlify: o endereço do site (URL / DEPLOY_PRIME_URL) só existe com certeza
 * durante o BUILD. Embutimos aqui para o servidor usar como reserva quando
 * NEXT_PUBLIC_SITE_URL não estiver cadastrada (ver lib/url-site.ts).
 */
const urlNetlify =
  process.env.NETLIFY === "true"
    ? ((process.env.CONTEXT === "production"
        ? process.env.URL
        : process.env.DEPLOY_PRIME_URL) ?? "")
    : "";

const nextConfig: NextConfig = {
  env: { NETLIFY_SITE_URL: urlNetlify },
  // Só em desenvolvimento: permite abrir o app no celular pela rede Wi-Fi
  // (http://192.168.x.x:3000). Sem isso o Next 16 bloqueia os arquivos de dev.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
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
  // entrem no pacote das DUAS rotas de PDF em produção (ex.: Vercel).
  outputFileTracingIncludes: {
    "/painel/orcamentos/*/pdf": ["./src/lib/pdf/fontes/**/*"],
    "/o/*/pdf": ["./src/lib/pdf/fontes/**/*"],
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
