import type { TipoChavePix } from "@/lib/types/database";

/** Rótulos e dicas exibidos no formulário para cada tipo de chave PIX. */
export const OPCOES_CHAVE_PIX: Record<
  TipoChavePix,
  { rotulo: string; placeholder: string }
> = {
  cpf: { rotulo: "CPF", placeholder: "000.000.000-00" },
  cnpj: { rotulo: "CNPJ", placeholder: "00.000.000/0000-00" },
  email: { rotulo: "E-mail", placeholder: "voce@exemplo.com" },
  telefone: { rotulo: "Telefone", placeholder: "(11) 98765-4321" },
  aleatoria: {
    rotulo: "Chave aleatória",
    placeholder: "123e4567-e89b-12d3-a456-426614174000",
  },
};

/** Calcula um dígito verificador de CPF/CNPJ (módulo 11). */
function digitoVerificador(base: string, pesos: number[]): number {
  const soma = base.split("").reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;
  const d1 = digitoVerificador(digitos.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(digitos.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(digitos[9]) && d2 === Number(digitos[10]);
}

export function cnpjValido(digitos: string): boolean {
  if (!/^\d{14}$/.test(digitos) || /^(\d)\1{13}$/.test(digitos)) return false;
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, ...pesos1];
  const d1 = digitoVerificador(digitos.slice(0, 12), pesos1);
  const d2 = digitoVerificador(digitos.slice(0, 13), pesos2);
  return d1 === Number(digitos[12]) && d2 === Number(digitos[13]);
}

/** Telefone brasileiro com DDD: 10 dígitos (fixo) ou 11 começando com 9 (celular). */
export function telefoneValido(digitos: string): boolean {
  return /^[1-9]{2}(?:[2-8]\d{7}|9\d{8})$/.test(digitos);
}
