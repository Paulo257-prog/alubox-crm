import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Obra, ObraStatus as _unused } from "@/types/domain";
import { mapObra } from "@/lib/mappers";

type SB = SupabaseClient<Database>;

// Select único, reaproveitado em list/get, trazendo a obra já com todos os
// sub-recursos embutidos (PostgREST resolve isso em uma única ida ao banco).
const OBRA_SELECT = `
  *,
  responsavel:profiles!obras_responsavel_id_fkey(nome),
  tarefas(*, responsavel:profiles!tarefas_responsavel_id_fkey(nome)),
  obra_materiais(*, categorias_materiais(nome), fornecedores(nome)),
  obra_financeiro(*, categorias_financeiro(nome)),
  obra_fotos(*),
  obra_documentos(*),
  obra_historico(*, profiles(nome)),
  obra_prestadores(prestador_id)
`;

export async function listObras(sb: SB): Promise<Obra[]> {
  const { data, error } = await sb
    .from("obras")
    .select(OBRA_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapObra);
}

export async function getObra(sb: SB, id: string): Promise<Obra | null> {
  const { data, error } = await sb.from("obras").select(OBRA_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapObra(data) : null;
}

export async function createObra(
  sb: SB,
  input: {
    nome: string;
    clienteId?: string | null;
    endereco?: string;
    cidade?: string;
    tipoImovel?: string;
    responsavelId?: string | null;
    dataPrevIni?: string | null;
    dataPrevFim?: string | null;
    valorOrcamento?: number | null;
    valorContratado?: number | null;
    custoEstimado?: number | null;
    descricao?: string;
    observacoes?: string;
  },
  userId: string
): Promise<Obra> {
  const { data, error } = await sb
    .from("obras")
    .insert({
      codigo: "", // gerado automaticamente pelo trigger (ver migration 0001)
      nome: input.nome,
      cliente_id: input.clienteId || null,
      endereco: input.endereco,
      cidade: input.cidade,
      tipo_imovel: input.tipoImovel,
      responsavel_id: input.responsavelId || null,
      data_prev_inicio: input.dataPrevIni || null,
      data_prev_termino: input.dataPrevFim || null,
      valor_orcamento: input.valorOrcamento ?? null,
      valor_contratado: input.valorContratado ?? null,
      custo_estimado: input.custoEstimado ?? null,
      descricao: input.descricao,
      observacoes: input.observacoes,
      created_by: userId,
    } as any)
    .select("id")
    .single();
  if (error) throw error;

  await addHistorico(sb, data.id, "Obra cadastrada.", userId);
  const obra = await getObra(sb, data.id);
  if (!obra) throw new Error("Falha ao carregar a obra recém-criada.");
  return obra;
}

export async function updateObra(sb: SB, id: string, patch: Record<string, any>) {
  const { error } = await sb.from("obras").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteObra(sb: SB, id: string) {
  // Exclusão lógica — preserva o histórico para relatórios já emitidos.
  const { error } = await sb.from("obras").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function moveObraStage(sb: SB, id: string, novoStatus: string, userId: string, textoHistorico: string) {
  const patch: Record<string, any> = { status: novoStatus };
  if (novoStatus === "EXECUCAO") patch.data_real_inicio = patch.data_real_inicio ?? new Date().toISOString().slice(0, 10);
  if (novoStatus === "FINALIZADO") patch.data_real_termino = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from("obras").update(patch).eq("id", id);
  if (error) throw error;
  await addHistorico(sb, id, textoHistorico, userId);
}

export async function addHistorico(sb: SB, obraId: string, texto: string, userId: string) {
  const { error } = await sb.from("obra_historico").insert({ obra_id: obraId, texto, created_by: userId } as any);
  if (error) throw error;
}

// ---------------- Tarefas ----------------

export async function upsertTarefa(sb: SB, obraId: string, tarefa: Record<string, any>) {
  const payload = { ...tarefa, obra_id: obraId };
  const { error } = await sb.from("tarefas").upsert(payload);
  if (error) throw error;
}

export async function deleteTarefa(sb: SB, id: string) {
  const { error } = await sb.from("tarefas").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Materiais ----------------

export async function upsertMaterial(sb: SB, obraId: string, material: Record<string, any>) {
  const payload = { ...material, obra_id: obraId };
  const { error } = await sb.from("obra_materiais").upsert(payload);
  if (error) throw error;
}

export async function deleteMaterial(sb: SB, id: string) {
  const { error } = await sb.from("obra_materiais").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Financeiro ----------------

export async function createLancamento(sb: SB, obraId: string, lancamento: Record<string, any>, userId: string) {
  const { error } = await sb.from("obra_financeiro").insert({ ...lancamento, obra_id: obraId, created_by: userId } as any);
  if (error) throw error;
}

export async function deleteLancamento(sb: SB, id: string) {
  const { error } = await sb.from("obra_financeiro").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Vínculo com prestadores ----------------

export async function vincularPrestador(sb: SB, obraId: string, prestadorId: string) {
  const { error } = await sb.from("obra_prestadores").upsert({ obra_id: obraId, prestador_id: prestadorId } as any);
  if (error) throw error;
}

export async function desvincularPrestador(sb: SB, obraId: string, prestadorId: string) {
  const { error } = await sb.from("obra_prestadores").delete().eq("obra_id", obraId).eq("prestador_id", prestadorId);
  if (error) throw error;
}
