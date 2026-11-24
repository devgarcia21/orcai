import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatarData } from "@/lib/datas";
import { formatarChavePix, formatarTelefone } from "@/lib/formatacao";
import { formatarMoeda, formatarQuantidade } from "@/lib/moeda";
import { calcularResumo, totalItem } from "@/lib/orcamento/calculos";
import { numeroComZeros, ROTULOS_UNIDADE } from "@/lib/orcamento/regras";
import { OPCOES_CHAVE_PIX } from "@/lib/pix";
import { nomeDeExibicao } from "@/lib/prestador";
import type { OrcamentoDocumento, Prestador } from "@/lib/types/database";

import { FONTE_PDF, registrarFontes } from "./fontes";

/**
 * Documento A4 do orçamento. Componente puro: recebe tudo por props (sem
 * banco, sem rede), o que permite testá-lo no Vitest. Todos os valores vêm
 * do módulo de cálculos e dos helpers de formatação do app.
 */

export type LogoPdf = { data: Buffer; format: "png" | "jpg" };

export type DadosPdfOrcamento = {
  prestador: Pick<
    Prestador,
    "nome" | "nome_empresa" | "telefone" | "cidade" | "tipo_chave_pix" | "chave_pix"
  >;
  /** Serve tanto para o painel (OrcamentoCompleto) quanto para o link público. */
  orcamento: OrcamentoDocumento;
  logo: LogoPdf | null;
};

// Identidade visual do app (cores convertidas de globals.css).
const COR = {
  primaria: "#0a5cd6",
  primariaSuave: "#eaf1fd",
  texto: "#0a0a0a",
  textoSuave: "#737373",
  borda: "#e5e5e5",
  linhaAlternada: "#f7f9fc",
};

const MARGEM = 40;

const estilos = StyleSheet.create({
  pagina: {
    fontFamily: FONTE_PDF,
    fontSize: 9.5,
    color: COR.texto,
    paddingTop: MARGEM,
    paddingHorizontal: MARGEM,
    paddingBottom: MARGEM + 24, // espaço do rodapé
    // ATENÇÃO: não use lineHeight neste documento. Com a fonte Inter, qualquer
    // lineHeight faz o react-pdf (4.9) sumir com o rodapé fixo. O espaçamento
    // padrão da Inter (~1,2) já é confortável. Coberto por teste.
  },

  // Cabeçalho
  cabecalho: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  empresa: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  logo: { width: 56, height: 56, objectFit: "contain" },
  nomeEmpresa: { fontSize: 15, fontWeight: 700, marginBottom: 3 },
  textoSuave: { color: COR.textoSuave },
  caixaNumero: {
    borderWidth: 1,
    borderColor: COR.borda,
    borderRadius: 6,
    padding: 10,
    minWidth: 150,
  },
  rotuloDocumento: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1,
    color: COR.primaria,
  },
  numero: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  linhaInfo: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  divisor: { height: 2, backgroundColor: COR.primaria, marginVertical: 16 },

  // Seções
  rotuloSecao: {
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 0.8,
    color: COR.textoSuave,
    marginBottom: 3,
  },
  nomeCliente: { fontSize: 11, fontWeight: 600, marginBottom: 2 },
  titulo: { fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 10 },

  // Tabela
  // Sem borda externa: ao quebrar de página, ela desceria pelo espaço vazio.
  tabela: { borderTopWidth: 1, borderTopColor: COR.borda },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: COR.primariaSuave,
    borderBottomWidth: 1,
    borderBottomColor: COR.borda,
    fontWeight: 600,
    fontSize: 8,
    color: COR.primaria,
  },
  linha: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COR.borda },
  linhaPar: { backgroundColor: COR.linhaAlternada },
  celula: { paddingVertical: 6, paddingHorizontal: 6 },
  colNumero: { width: "6%", textAlign: "center" },
  colDescricao: { width: "40%" },
  colQuantidade: { width: "10%", textAlign: "right" },
  colUnidade: { width: "10%" },
  colUnitario: { width: "17%", textAlign: "right" },
  colTotal: { width: "17%", textAlign: "right", fontWeight: 600 },

  // Resumo
  resumo: { marginTop: 12, marginLeft: "auto", width: "45%" },
  linhaResumo: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COR.primaria,
    color: "#ffffff",
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginTop: 4,
    fontSize: 12,
    fontWeight: 700,
  },
  sinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COR.primariaSuave,
    color: COR.primaria,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 4,
    fontWeight: 600,
  },

  // Blocos de texto e PIX
  bloco: { marginTop: 16 },
  caixaPix: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: COR.primaria,
    borderRadius: 6,
    padding: 10,
  },
  tituloPix: { fontSize: 10, fontWeight: 700, color: COR.primaria, marginBottom: 4 },

  // Rodapé
  rodape: {
    position: "absolute",
    bottom: MARGEM - 8,
    left: MARGEM,
    right: MARGEM,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COR.borda,
    paddingTop: 6,
    fontSize: 7.5,
    color: COR.textoSuave,
  },
});

function Cabecalho({ prestador, orcamento, logo }: DadosPdfOrcamento) {
  const contato = [
    prestador.telefone && formatarTelefone(prestador.telefone),
    prestador.cidade,
  ].filter(Boolean);

  return (
    <View style={estilos.cabecalho}>
      <View style={estilos.empresa}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não tem alt */}
        {logo && <Image src={logo} style={estilos.logo} />}
        <View style={{ flex: 1 }}>
          <Text style={estilos.nomeEmpresa}>{nomeDeExibicao(prestador)}</Text>
          {prestador.nome_empresa && <Text>{prestador.nome}</Text>}
          {contato.length > 0 && (
            <Text style={estilos.textoSuave}>{contato.join("  ·  ")}</Text>
          )}
        </View>
      </View>

      <View style={estilos.caixaNumero}>
        <Text style={estilos.rotuloDocumento}>ORÇAMENTO</Text>
        <Text style={estilos.numero}>Nº {numeroComZeros(orcamento.numero)}</Text>
        <View style={estilos.linhaInfo}>
          <Text style={estilos.textoSuave}>Emissão</Text>
          <Text>{formatarData(orcamento.created_at)}</Text>
        </View>
        {orcamento.valido_ate && (
          <View style={estilos.linhaInfo}>
            <Text style={estilos.textoSuave}>Válido até</Text>
            <Text style={{ fontWeight: 600 }}>{formatarData(orcamento.valido_ate)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function DadosCliente({ cliente }: Pick<OrcamentoDocumento, "cliente">) {
  return (
    <View>
      <Text style={estilos.rotuloSecao}>CLIENTE</Text>
      <Text style={estilos.nomeCliente}>{cliente.nome}</Text>
      {cliente.telefone && <Text>{formatarTelefone(cliente.telefone)}</Text>}
      {cliente.email && <Text>{cliente.email}</Text>}
      {cliente.endereco && <Text style={estilos.textoSuave}>{cliente.endereco}</Text>}
    </View>
  );
}

function TabelaItens({ itens }: Pick<OrcamentoDocumento, "itens">) {
  return (
    <View style={estilos.tabela}>
      {/* fixed: repete o cabeçalho em cada página por onde a tabela continuar */}
      <View style={estilos.linhaCabecalho} fixed>
        <Text style={[estilos.celula, estilos.colNumero]}>Nº</Text>
        <Text style={[estilos.celula, estilos.colDescricao]}>DESCRIÇÃO</Text>
        <Text style={[estilos.celula, estilos.colQuantidade]}>QTD.</Text>
        <Text style={[estilos.celula, estilos.colUnidade]}>UN.</Text>
        <Text style={[estilos.celula, estilos.colUnitario]}>VALOR UNIT.</Text>
        <Text style={[estilos.celula, estilos.colTotal]}>TOTAL</Text>
      </View>
      {itens.map((item, i) => (
        // wrap={false}: uma linha nunca é cortada ao meio entre páginas
        <View
          // A ordem dos itens é fixa no documento; a versão pública não tem ids.
          key={i}
          style={[estilos.linha, i % 2 === 1 ? estilos.linhaPar : {}]}
          wrap={false}
        >
          <Text style={[estilos.celula, estilos.colNumero, estilos.textoSuave]}>
            {i + 1}
          </Text>
          <Text style={[estilos.celula, estilos.colDescricao]}>{item.descricao}</Text>
          <Text style={[estilos.celula, estilos.colQuantidade]}>
            {formatarQuantidade(item.quantidade)}
          </Text>
          <Text style={[estilos.celula, estilos.colUnidade]}>
            {ROTULOS_UNIDADE[item.unidade].curto}
          </Text>
          <Text style={[estilos.celula, estilos.colUnitario]}>
            {formatarMoeda(item.valor_unitario_centavos)}
          </Text>
          <Text style={[estilos.celula, estilos.colTotal]}>
            {formatarMoeda(totalItem(item))}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Resumo({ orcamento }: Pick<DadosPdfOrcamento, "orcamento">) {
  const resumo = calcularResumo(
    orcamento.itens,
    orcamento.desconto_centavos,
    orcamento.percentual_sinal,
  );

  return (
    <View style={estilos.resumo} wrap={false}>
      <View style={estilos.linhaResumo}>
        <Text style={estilos.textoSuave}>Subtotal</Text>
        <Text>{formatarMoeda(resumo.subtotal)}</Text>
      </View>
      {resumo.desconto > 0 && (
        <View style={estilos.linhaResumo}>
          <Text style={estilos.textoSuave}>Desconto</Text>
          <Text>− {formatarMoeda(resumo.desconto)}</Text>
        </View>
      )}
      <View style={estilos.total}>
        <Text>TOTAL</Text>
        <Text>{formatarMoeda(resumo.total)}</Text>
      </View>
      {resumo.percentualSinal > 0 && (
        <View style={estilos.sinal}>
          <Text>Sinal ({resumo.percentualSinal}%)</Text>
          <Text>{formatarMoeda(resumo.sinal)}</Text>
        </View>
      )}
    </View>
  );
}

function BlocoTexto({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    // minPresenceAhead: não deixa o título sozinho no fim da página
    <View style={estilos.bloco}>
      <Text style={estilos.rotuloSecao} minPresenceAhead={24}>
        {titulo.toUpperCase()}
      </Text>
      <Text>{texto}</Text>
    </View>
  );
}

function Pix({ prestador }: Pick<DadosPdfOrcamento, "prestador">) {
  if (!prestador.tipo_chave_pix || !prestador.chave_pix) return null;
  return (
    <View style={estilos.caixaPix} wrap={false}>
      <Text style={estilos.tituloPix}>Pagamento via PIX</Text>
      <Text>
        <Text style={estilos.textoSuave}>
          Chave ({OPCOES_CHAVE_PIX[prestador.tipo_chave_pix].rotulo}):{" "}
        </Text>
        <Text style={{ fontWeight: 600 }}>
          {formatarChavePix(prestador.tipo_chave_pix, prestador.chave_pix)}
        </Text>
      </Text>
    </View>
  );
}

export function DocumentoOrcamento(dados: DadosPdfOrcamento) {
  registrarFontes();
  const { orcamento, prestador } = dados;
  const numero = numeroComZeros(orcamento.numero);

  return (
    <Document
      title={`Orçamento ${numero} — ${orcamento.titulo}`}
      author={nomeDeExibicao(prestador)}
      subject={`Orçamento para ${orcamento.cliente.nome}`}
      creator="Orçaí"
      producer="Orçaí"
      language="pt-BR"
    >
      <Page size="A4" style={estilos.pagina}>
        {/* Rodapé primeiro: no react-pdf, um elemento "fixed" só se repete nas
            páginas a partir do ponto em que aparece no documento. */}
        <View style={estilos.rodape} fixed>
          <Text>Gerado com Orçaí</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
        <Cabecalho {...dados} />
        <View style={estilos.divisor} />
        <DadosCliente cliente={orcamento.cliente} />
        <Text style={estilos.titulo}>{orcamento.titulo}</Text>
        <TabelaItens itens={orcamento.itens} />
        <Resumo orcamento={orcamento} />
        <BlocoTexto
          titulo="Condições de pagamento"
          texto={orcamento.condicoes_pagamento}
        />
        <BlocoTexto titulo="Observações" texto={orcamento.observacoes} />
        <Pix prestador={prestador} />
      </Page>
    </Document>
  );
}
