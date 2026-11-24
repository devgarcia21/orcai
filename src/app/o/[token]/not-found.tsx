import { SearchX } from "lucide-react";

import { EstadoVazio } from "@/components/comum/estado-vazio";

/** Token inválido ou orçamento ainda em rascunho. */
export default function OrcamentoPublicoNaoEncontrado() {
  return (
    <EstadoVazio
      icone={SearchX}
      titulo="Orçamento não encontrado"
      descricao="Este link não existe ou não está mais disponível. Confira se ele foi copiado por inteiro ou peça um novo link ao prestador."
      className="mt-10"
    />
  );
}
