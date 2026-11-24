import { somenteDigitos } from "@/lib/formatacao";
import { telefoneValido } from "@/lib/pix/chave";

/**
 * Converte um telefone brasileiro no formato do wa.me: 55 + DDD + número,
 * só dígitos. Aceita com ou sem máscara, com 0 de operadora/DDD na frente e
 * com o 55 já incluído. Devolve null se não for um telefone válido.
 */
export function normalizarTelefoneWhatsApp(
  telefone: string | null | undefined,
): string | null {
  if (!telefone) return null;
  let digitos = somenteDigitos(telefone);

  // +55 / 0055 já incluídos
  if (digitos.startsWith("0055")) digitos = digitos.slice(4);
  else if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    digitos = digitos.slice(2);
  }
  // 0 na frente do DDD (ex.: 011 98765-4321)
  if (digitos.startsWith("0")) digitos = digitos.replace(/^0+/, "");

  return telefoneValido(digitos) ? `55${digitos}` : null;
}

/**
 * Link do WhatsApp com a mensagem pronta. Sem telefone válido, abre o
 * WhatsApp para a pessoa escolher o contato.
 * encodeURIComponent codifica acentos (UTF-8) e quebras de linha (%0A).
 */
export function montarLinkWhatsApp(
  telefone: string | null | undefined,
  mensagem: string,
): string {
  const numero = normalizarTelefoneWhatsApp(telefone);
  const texto = encodeURIComponent(mensagem);
  return numero
    ? `https://wa.me/${numero}?text=${texto}`
    : `https://wa.me/?text=${texto}`;
}

type DadosMensagemEnvio = {
  nomeCliente: string;
  numero: string; // "0001"
  titulo: string;
  total: string; // "R$ 340,00"
  validoAte: string | null; // "08/12/2026"
  link: string;
  assinatura: string; // nome da empresa ou do prestador
};

/** Primeiro nome, para a saudação soar natural ("Olá, Maria!"). */
const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? "";

/** Mensagem padrão de envio do orçamento: curta, educada e com tudo o que importa. */
export function mensagemEnvioOrcamento(d: DadosMensagemEnvio): string {
  const nome = primeiroNome(d.nomeCliente);
  return [
    nome ? `Olá, ${nome}! Tudo bem?` : "Olá! Tudo bem?",
    "",
    `Segue o orçamento Nº ${d.numero} – ${d.titulo}.`,
    `Total: ${d.total}`,
    ...(d.validoAte ? [`Válido até ${d.validoAte}`] : []),
    "",
    "Veja os detalhes e aprove por aqui:",
    d.link,
    "",
    d.assinatura,
  ].join("\n");
}

/** Mensagem do cliente para o prestador ("Falar com o prestador"). */
export function mensagemContatoPrestador(numero: string, titulo: string): string {
  return `Olá! Vi o orçamento Nº ${numero} – ${titulo} e gostaria de conversar.`;
}
