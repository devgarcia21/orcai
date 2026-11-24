import { headers } from "next/headers";

/**
 * Endereço base do app para montar links enviados aos clientes.
 * Usa NEXT_PUBLIC_APP_URL; se faltar, cai para o endereço da própria
 * requisição (para o link nunca sair quebrado em desenvolvimento).
 */
export async function urlDoApp(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configurada) return configurada.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}
