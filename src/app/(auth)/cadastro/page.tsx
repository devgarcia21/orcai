import type { Metadata } from "next";

import { CartaoAuth } from "@/components/auth/cartao-auth";
import { FormularioCadastro } from "@/components/auth/formulario-cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <CartaoAuth
      titulo="Crie sua conta grátis"
      descricao="Em menos de um minuto você começa a montar orçamentos profissionais."
    >
      <FormularioCadastro />
    </CartaoAuth>
  );
}
