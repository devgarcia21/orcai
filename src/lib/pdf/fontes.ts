import path from "node:path";

import { Font } from "@react-pdf/renderer";

/**
 * Fonte Inter (subconjunto latino: acentos, "ç", travessão, sinal de menos),
 * a mesma do app. Arquivos WOFF em ./fontes (licença OFL em OFL.txt).
 *
 * O caminho parte de process.cwd() (raiz do projeto em dev, build e testes);
 * em produção, next.config.ts inclui a pasta no pacote da rota do PDF.
 */
const PASTA_FONTES = path.join(process.cwd(), "src", "lib", "pdf", "fontes");

export const FONTE_PDF = "Inter";

let registrada = false;

export function registrarFontes() {
  if (registrada) return;
  Font.register({
    family: FONTE_PDF,
    fonts: ([400, 500, 600, 700] as const).map((peso) => ({
      src: path.join(PASTA_FONTES, `Inter-${peso}.woff`),
      fontWeight: peso,
    })),
  });
  // Sem hifenização automática: o padrão é inglês e quebraria palavras em português.
  Font.registerHyphenationCallback((palavra) => [palavra]);
  registrada = true;
}
