import { headers } from "next/headers";

/** Endereço usado no desenvolvimento quando NEXT_PUBLIC_SITE_URL não está definida. */
export const URL_SITE_DESENVOLVIMENTO = "http://localhost:3000";

type Ambiente = Record<string, string | undefined>;

const semBarraNoFim = (url: string) => url.trim().replace(/\/+$/, "");

/**
 * Regra (pura) do endereço público do site, usado nos links enviados aos
 * clientes (orçamento, WhatsApp) e no link de confirmação de e-mail:
 *
 * 1. NEXT_PUBLIC_SITE_URL, se definida (ex.: https://orcai.vercel.app);
 * 2. em produção, sem a variável:
 *    - Netlify: o endereço do site gravado no build (NETLIFY_SITE_URL, ver next.config.ts);
 *    - Vercel: o domínio de produção do projeto (VERCEL_PROJECT_PRODUCTION_URL);
 *    - outro lugar: `null` → usa o endereço da requisição (nunca localhost);
 * 3. em desenvolvimento: http://localhost:3000.
 */
export function resolverUrlDoSite(ambiente: Ambiente): string | null {
  const configurada = ambiente.NEXT_PUBLIC_SITE_URL?.trim();
  if (configurada) return semBarraNoFim(configurada);

  if (ambiente.NODE_ENV === "production") {
    const netlify = ambiente.NETLIFY_SITE_URL?.trim();
    if (netlify) return semBarraNoFim(netlify);
    const vercel = ambiente.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    return vercel ? `https://${semBarraNoFim(vercel)}` : null;
  }
  return URL_SITE_DESENVOLVIMENTO;
}

/** Endereço público do site, sem barra no fim. Só no servidor. */
export async function urlDoSite(): Promise<string> {
  const resolvida = resolverUrlDoSite({
    // Acessos literais: o Next embute NEXT_PUBLIC_* no build.
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NETLIFY_SITE_URL: process.env.NETLIFY_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });
  if (resolvida) return resolvida;

  // Último recurso (produção sem variável nem plataforma conhecida): o host da requisição.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return URL_SITE_DESENVOLVIMENTO;
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}
