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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Tamanho máximo de uma chave e-mail no DICT (Manual do Pix). */
const EMAIL_MAXIMO = 77;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ResultadoChave = { ok: true; chave: string } | { ok: false; erro: string };

/**
 * Normaliza e valida uma chave PIX conforme o tipo — regra ÚNICA, usada no
 * Perfil (ao salvar) e no gerador do BR Code (ao montar o QR Code):
 * - CPF/CNPJ: só números, com dígitos verificadores válidos;
 * - telefone: +55DDDNUMERO (aceita com ou sem máscara e com ou sem +55);
 * - e-mail: minúsculas;
 * - aleatória (EVP): formato UUID, mantida como está (sem espaços em volta).
 */
export function normalizarChavePix(tipo: TipoChavePix, valor: string): ResultadoChave {
  const bruta = valor.trim();
  if (!bruta) return { ok: false, erro: "Informe a chave PIX." };

  switch (tipo) {
    case "cpf": {
      const chave = bruta.replace(/\D/g, "");
      return cpfValido(chave)
        ? { ok: true, chave }
        : { ok: false, erro: "CPF inválido. Confira os números." };
    }
    case "cnpj": {
      const chave = bruta.replace(/\D/g, "");
      return cnpjValido(chave)
        ? { ok: true, chave }
        : { ok: false, erro: "CNPJ inválido. Confira os números." };
    }
    case "telefone": {
      const digitos = bruta.replace(/^\+55/, "").replace(/\D/g, "");
      return telefoneValido(digitos)
        ? { ok: true, chave: `+55${digitos}` }
        : { ok: false, erro: "Digite um telefone válido com DDD." };
    }
    case "email": {
      const chave = bruta.toLowerCase();
      return EMAIL.test(chave) && chave.length <= EMAIL_MAXIMO
        ? { ok: true, chave }
        : { ok: false, erro: "Digite um e-mail válido." };
    }
    case "aleatoria":
      return UUID.test(bruta)
        ? { ok: true, chave: bruta }
        : {
            ok: false,
            erro: "A chave aleatória tem 32 letras e números separados por hífens.",
          };
  }
}
