/**
 * Copia um texto para a área de transferência. Devolve true se deu certo.
 *
 * A API moderna (navigator.clipboard) só existe em HTTPS ou localhost; no
 * celular acessando o computador por http://192.168.x.x ela não existe, então
 * caímos para o método antigo (textarea + execCommand), que funciona desde que
 * seja chamado direto no clique.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // segue para o método antigo
    }
  }

  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.opacity = "0";
  document.body.appendChild(campo);
  campo.select();
  campo.setSelectionRange(0, texto.length); // iOS
  let copiou = false;
  try {
    copiou = document.execCommand("copy");
  } catch {
    copiou = false;
  }
  campo.remove();
  return copiou;
}
