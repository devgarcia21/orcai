import { desenharQrCode } from "@/lib/pix/qrcode";
import { cn } from "@/lib/utils";

/**
 * QR Code desenhado no servidor como SVG (sem imagem, sem JavaScript no
 * navegador). Fundo branco e "crispEdges" para leitura confiável na câmera.
 */
export function QrCode({
  conteudo,
  rotulo,
  className,
}: {
  conteudo: string;
  rotulo: string;
  className?: string;
}) {
  const { lado, caminho } = desenharQrCode(conteudo);
  return (
    <svg
      viewBox={`0 0 ${lado} ${lado}`}
      role="img"
      aria-label={rotulo}
      shapeRendering="crispEdges"
      className={cn("aspect-square h-auto w-full rounded-lg bg-white", className)}
    >
      <rect width={lado} height={lado} fill="#ffffff" />
      <path d={caminho} fill="#000000" />
    </svg>
  );
}
