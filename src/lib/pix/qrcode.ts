import QRCode from "qrcode";

/**
 * QR Code como um único caminho SVG ("d" de um <path>), para desenhar igual na
 * página (<svg>) e no PDF (<Svg> do react-pdf) — sem imagens intermediárias.
 *
 * Correção de erro "M" (padrão de mercado para Pix) e margem de 4 módulos
 * (a "zona silenciosa" exigida pela norma para leitura confiável).
 */
const MARGEM = 4;

export type DesenhoQrCode = {
  /** Lado do quadrado em módulos, já com as margens (viewBox "0 0 lado lado"). */
  lado: number;
  /** Comando de caminho SVG com um quadrado 1×1 por módulo escuro. */
  caminho: string;
};

export function desenharQrCode(texto: string): DesenhoQrCode {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let caminho = "";

  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!modules.get(y, x)) {
        x++;
        continue;
      }
      // Junta módulos escuros vizinhos na mesma linha num só retângulo.
      const inicio = x;
      while (x < n && modules.get(y, x)) x++;
      caminho += `M${inicio + MARGEM} ${y + MARGEM}h${x - inicio}v1h-${x - inicio}z`;
    }
  }

  return { lado: n + MARGEM * 2, caminho };
}
