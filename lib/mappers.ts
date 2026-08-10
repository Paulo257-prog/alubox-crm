// Converte as linhas vindas do Supabase (snake_case, uma tabela por
// entidade) para o formato "achatado" que a UI portada do protótipo espera
// (camelCase, obra já com tarefas/materiais/financeiro/fotos/documentos/
// histórico embutidos). Manter essa conversão isolada aqui é o que permite
// trocar o formato do banco sem tocar nos componentes de tela.

import type { Obra, Tarefa, Material, Lancamento, Foto, Documento, HistoricoItem, Cliente, Prestador, Usuario } from "@/types/domain";

export function mapUsuario(row: any): Usuario {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email ?? "",
    role: row.role,
    ativo: row.ativo,
  };
}

export function mapCliente(row: any): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    cpfCnpj: row.cpf_cnpj ?? "",
    telefone: row.telefone ?? "",
    whatsapp: row.whatsapp ?? "",
    email: row.email ?? "",
    endereco: row.endereco ?? "",
    cidade: row.cidade ?? "",
    observacoes: row.observacoes ?? "",
    timeline: (row.cliente_interacoes ?? [])
      .map((t: any) => ({ id: t.id, texto: t.texto, data: t.created_at }))
      .sort((a: any, b: any) => (a.data < b.data ? 1 : -1)),
  };
}

export function mapPrestador(row: any): Prestador {
  const aval = Array.isArray(row.prestador_avaliacoes) ? row.prestador_avaliacoes[0] : row.prestador_avaliacoes;
  return {
    id: row.id,
    nome: row.nome,
    cpfCnpj: row.cpf_cnpj ?? "",
    telefone: row.telefone ?? "",
    whatsapp: row.whatsapp ?? "",
    email: row.email ?? "",
    cidade: row.cidade ?? "",
    endereco: row.endereco ?? "",
    especialidade: row.especialidades?.nome ?? "",
    especialidadeId: row.especialidade_id ?? null,
    status: row.status,
    valorDiaria: row.valor_diaria ?? "",
    valorHora: row.valor_hora ?? "",
    observacoes: row.observacoes ?? "",
    avaliacoes: {
      qualidade: aval?.qualidade ?? 0,
      prazo: aval?.prazo ?? 0,
      organizacao: aval?.organizacao ?? 0,
      comunicacao: aval?.comunicacao ?? 0,
      custoBeneficio: aval?.custo_beneficio ?? 0,
    },
  };
}

function mapTarefa(row: any): Tarefa {
  return {
    id: row.id,
    nome: row.nome,
    responsavel: row.responsavel?.nome ?? "",
    responsavelId: row.responsavel_id,
    prestadorId: row.prestador_id ?? "",
    dataIni: row.data_inicio ?? "",
    dataFim: row.data_termino ?? "",
    status: row.status,
    prioridade: row.prioridade,
    valor: row.valor ?? "",
    observacoes: row.observacoes ?? "",
  };
}

function mapMaterial(row: any): Material {
  return {
    id: row.id,
    material: row.nome,
    materialCatalogoId: row.material_catalogo_id ?? null,
    categoria: row.categorias_materiais?.nome ?? "",
    categoriaId: row.categoria_id ?? null,
    quantidade: row.quantidade ?? "",
    unidade: row.unidade ?? "",
    fornecedor: row.fornecedores?.nome ?? "",
    fornecedorId: row.fornecedor_id ?? null,
    valorPrevisto: row.valor_previsto ?? "",
    valorComprado: row.valor_comprado ?? "",
    dataCompra: row.data_compra ?? "",
    status: row.status ?? "Previsto",
  };
}

function mapLancamento(row: any): Lancamento {
  return {
    id: row.id,
    tipo: row.tipo,
    descricao: row.descricao ?? "",
    categoria: row.categorias_financeiro?.nome ?? "",
    categoriaId: row.categoria_id ?? null,
    valor: row.valor,
    data: row.data,
  };
}

function mapFoto(row: any): Foto {
  return { id: row.id, url: row.url, storageKey: row.storage_key, categoria: row.categoria, legenda: row.legenda ?? "" };
}

function mapDocumento(row: any): Documento {
  return { id: row.id, nome: row.nome, tipo: row.tipo ?? "", url: row.url, storageKey: row.storage_key, data: row.data };
}

function mapHistorico(row: any): HistoricoItem {
  const autor = row.profiles?.nome ? ` (${row.profiles.nome})` : "";
  return { id: row.id, texto: row.texto + autor, data: row.created_at };
}

// `row` aqui já vem com os relacionamentos embutidos pela query do
// Supabase (ver services/obras.ts) — select com sintaxe de embedding do
// PostgREST, ex: `tarefas(*), obra_materiais(*), ...`.
export function mapObra(row: any): Obra {
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    clienteId: row.cliente_id ?? "",
    endereco: row.endereco ?? "",
    cidade: row.cidade ?? "",
    tipoImovel: row.tipo_imovel ?? "",
    responsavel: row.responsavel?.nome ?? "",
    responsavelId: row.responsavel_id,
    dataCadastro: row.data_cadastro,
    dataPrevIni: row.data_prev_inicio ?? "",
    dataPrevFim: row.data_prev_termino ?? "",
    dataRealIni: row.data_real_inicio ?? "",
    dataRealFim: row.data_real_termino ?? "",
    status: row.status,
    valorOrcamento: row.valor_orcamento ?? "",
    valorContratado: row.valor_contratado ?? "",
    custoEstimado: row.custo_estimado ?? "",
    descricao: row.descricao ?? "",
    observacoes: row.observacoes ?? "",
    tarefas: (row.tarefas ?? []).map(mapTarefa),
    prestadoresIds: (row.obra_prestadores ?? []).map((p: any) => p.prestador_id),
    materiais: (row.obra_materiais ?? []).map(mapMaterial),
    financeiro: (row.obra_financeiro ?? []).map(mapLancamento),
    fotos: (row.obra_fotos ?? []).map(mapFoto),
    documentos: (row.obra_documentos ?? []).map(mapDocumento),
    historico: (row.obra_historico ?? []).map(mapHistorico).sort((a: any, b: any) => (a.data < b.data ? 1 : -1)),
  };
}
