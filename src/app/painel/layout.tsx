import { CabecalhoPainel } from "@/components/painel/cabecalho-painel";
import { NavegacaoInferior } from "@/components/painel/navegacao";

/**
 * Layout do painel: cabeçalho e navegação ficam montados entre as páginas.
 *
 * Não há <Suspense> em volta de {children} de propósito: numa navegação, só o
 * que está abaixo deste layout re-renderiza, e um fallback do layout (já
 * revelado) não reaparece — a troca de página ficaria esperando os dados.
 * Por isso cada página tem casca síncrona e seus próprios <Suspense>.
 */
export default function PainelLayout({ children }: LayoutProps<"/painel">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <CabecalhoPainel />
      {/* pb extra no celular para o conteúdo não ficar atrás da barra inferior */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:pt-10 md:pb-12">
        {children}
      </main>
      <NavegacaoInferior />
    </div>
  );
}
