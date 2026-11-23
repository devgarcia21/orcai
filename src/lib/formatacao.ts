import type { TipoChavePix } from "@/lib/types/database";

/** Mantém só os dígitos de um texto. */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Máscara de telefone brasileiro, aplicada enquanto a pessoa digita:
 * (11) 3456-7890 (fixo) ou (11) 98765-4321 (celular).
 */
export function formatarTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 000.000.000-00 */
export function formatarCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/** 00.000.000/0000-00 */
export function formatarCnpj(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Aplica a máscara adequada à chave PIX conforme o tipo escolhido. */
export function formatarChavePix(tipo: TipoChavePix | "", valor: string): string {
  switch (tipo) {
    case "cpf":
      return formatarCpf(valor);
    case "cnpj":
      return formatarCnpj(valor);
    case "telefone":
      // Chaves de telefone são salvas como +55DDDNUMERO; exibimos sem o +55.
      return formatarTelefone(valor.startsWith("+55") ? valor.slice(3) : valor);
    default:
      return valor;
  }
}
