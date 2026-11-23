import { SearchX } from "lucide-react";

import { EstadoVazio } from "@/components/comum/estado-vazio";
import { BotaoNovoOrcamento } from "@/components/orcamentos/botao-novo-orcamento";

export default function PainelNaoEncontrado() {
  return (
    <EstadoVazio
      icone={SearchX}
      titulo="Não encontramos esta página"
      descricao="O item pode ter sido excluído ou o link está incorreto."
      acao={<BotaoNovoOrcamento className="w-full" />}
    />
  );
}
