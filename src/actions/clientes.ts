"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { erro, erroDeValidacao, sucesso, type EstadoAcao } from "@/lib/acoes";
import { exigirUsuario } from "@/lib/dados/prestador";
import { idValido } from "@/lib/dados/util";
import { ROTAS } from "@/lib/rotas";
import { traduzirErroBanco, violouChaveEstrangeira } from "@/lib/supabase/erros";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/types/database";
import { clienteSchema } from "@/lib/validacoes/cliente";

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "");

/** Cria (sem "id") ou atualiza (com "id") um cliente. Devolve o cliente salvo. */
export async function salvarCliente(
  _anterior: EstadoAcao<Cliente>,
  formData: FormData,
): Promise<EstadoAcao<Cliente>> {
  const usuario = await exigirUsuario();
  const id = texto(formData, "id");
  if (id && !idValido(id)) return erro("Cliente inválido.");

  const parsed = clienteSchema.safeParse({
    nome: texto(formData, "nome"),
    telefone: texto(formData, "telefone"),
    email: texto(formData, "email"),
    endereco: texto(formData, "endereco"),
    observacoes: texto(formData, "observacoes"),
  });
  if (!parsed.success) return erroDeValidacao(parsed.error);

  const supabase = await createClient();
  const consulta = id
    ? supabase
        .from("clientes")
        .update(parsed.data)
        .eq("id", id)
        .eq("prestador_id", usuario.id)
    : supabase.from("clientes").insert(parsed.data);

  const { data, error } = await consulta.select().single<Cliente>();
  if (error || !data) {
    return erro(
      error
        ? traduzirErroBanco(error, "Não foi possível salvar o cliente. Tente novamente.")
        : "Cliente não encontrado.",
    );
  }

  revalidatePath(ROTAS.painel, "layout");
  return sucesso(id ? "Cliente atualizado!" : "Cliente cadastrado!", data);
}

/**
 * Exclui um cliente. Clientes com orçamentos não podem ser excluídos
 * (a FK com "on delete restrict" garante isso também no banco).
 */
export async function excluirCliente(id: string): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!idValido(id)) return erro("Cliente inválido.");
  const supabase = await createClient();

  const { count } = await supabase
    .from("orcamentos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id);

  if (count && count > 0) {
    return erro(
      `Este cliente tem ${count} ${count === 1 ? "orçamento" : "orçamentos"} e não pode ser excluído. Exclua os orçamentos dele antes.`,
    );
  }

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id)
    .eq("prestador_id", usuario.id);

  if (error) {
    return erro(
      violouChaveEstrangeira(error)
        ? "Este cliente tem orçamentos e não pode ser excluído. Exclua os orçamentos dele antes."
        : "Não foi possível excluir o cliente. Tente novamente.",
    );
  }

  revalidatePath(ROTAS.painel, "layout");
  return sucesso("Cliente excluído.");
}

/** Exclui e volta para a lista (usado na página do cliente). */
export async function excluirClienteEVoltar(id: string): Promise<EstadoAcao> {
  const resultado = await excluirCliente(id);
  if (resultado.status === "sucesso") redirect(ROTAS.clientes);
  return resultado;
}
