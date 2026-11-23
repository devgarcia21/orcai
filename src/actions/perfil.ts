"use server";

import { revalidatePath } from "next/cache";

import { erro, erroDeValidacao, sucesso, type EstadoAcao } from "@/lib/acoes";
import { exigirUsuario } from "@/lib/dados/prestador";
import { ROTAS } from "@/lib/rotas";
import { createClient } from "@/lib/supabase/server";
import type { PrestadorAtualizacao } from "@/lib/types/database";
import { perfilSchema, validarLogo } from "@/lib/validacoes/perfil";

const BUCKET_LOGOS = "logos";
const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "");

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Envia a nova logo para logos/<usuario>/. Cada envio tem nome único para não
 * sofrer com cache de CDN/navegador.
 */
async function enviarLogo(supabase: Supabase, usuarioId: string, arquivo: File) {
  const extensao = arquivo.type === "image/png" ? "png" : "jpg";
  const caminho = `${usuarioId}/logo-${Date.now()}.${extensao}`;
  const storage = supabase.storage.from(BUCKET_LOGOS);

  const { error } = await storage.upload(caminho, arquivo, {
    contentType: arquivo.type,
    cacheControl: "31536000",
  });
  if (error) return null;

  return { caminho, url: storage.getPublicUrl(caminho).data.publicUrl };
}

/** Apaga da pasta do usuário todos os arquivos, exceto o caminho informado. */
async function limparLogos(supabase: Supabase, usuarioId: string, manter?: string) {
  const storage = supabase.storage.from(BUCKET_LOGOS);
  const { data: arquivos } = await storage.list(usuarioId);
  const paraApagar = (arquivos ?? [])
    .map((obj) => `${usuarioId}/${obj.name}`)
    .filter((caminho) => caminho !== manter);
  if (paraApagar.length > 0) await storage.remove(paraApagar);
}

export async function salvarPerfil(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();

  const parsed = perfilSchema.safeParse({
    nome: texto(formData, "nome"),
    nome_empresa: texto(formData, "nome_empresa"),
    telefone: texto(formData, "telefone"),
    cidade: texto(formData, "cidade"),
    tipo_chave_pix: texto(formData, "tipo_chave_pix"),
    chave_pix: texto(formData, "chave_pix"),
  });
  if (!parsed.success) return erroDeValidacao(parsed.error);

  const logo = formData.get("logo");
  const temLogoNova = logo instanceof File && logo.size > 0;
  if (temLogoNova) {
    const problema = validarLogo(logo);
    if (problema) return erro(problema, { logo: [problema] });
  }

  const supabase = await createClient();
  const atualizacao: PrestadorAtualizacao = { ...parsed.data };

  let logoNova: { caminho: string; url: string } | null = null;
  if (temLogoNova) {
    logoNova = await enviarLogo(supabase, usuario.id, logo);
    if (!logoNova) {
      const mensagem = "Não foi possível enviar a logo. Tente novamente.";
      return erro(mensagem, { logo: [mensagem] });
    }
    atualizacao.logo_url = logoNova.url;
  }

  const { error } = await supabase
    .from("prestadores")
    .update(atualizacao)
    .eq("id", usuario.id);

  if (error) {
    // Desfaz o envio para não deixar arquivo órfão.
    if (logoNova) await supabase.storage.from(BUCKET_LOGOS).remove([logoNova.caminho]);
    return erro("Não foi possível salvar seu perfil. Tente novamente.");
  }

  // Só agora, com o banco apontando para a logo nova, apagamos as antigas.
  if (logoNova) await limparLogos(supabase, usuario.id, logoNova.caminho);

  revalidatePath(ROTAS.painel, "layout");
  return sucesso("Perfil salvo com sucesso!");
}
