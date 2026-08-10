import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Prestador } from "@/types/domain";
import { mapPrestador } from "@/lib/mappers";

type SB = SupabaseClient<Database>;

const PRESTADOR_SELECT = `*, especialidades(nome), prestador_avaliacoes(*)`;

export async function listPrestadores(sb: SB): Promise<Prestador[]> {
  const { data, error } = await sb.from("prestadores").select(PRESTADOR_SELECT).is("deleted_at", null).order("nome");
  if (error) throw error;
  return (data ?? []).map(mapPrestador);
}

export async function findPrestadorPorDocumento(sb: SB, cpfCnpj: string, excludeId?: string) {
  const clean = cpfCnpj.replace(/\D/g, "");
  if (!clean) return null;
  let query = sb.from("prestadores").select(PRESTADOR_SELECT).eq("cpf_cnpj", cpfCnpj).is("deleted_at", null);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapPrestador(data) : null;
}

export async function getOrCreateEspecialidadeId(sb: SB, nome: string): Promise<string> {
  const { data: existing } = await sb.from("especialidades").select("id").eq("nome", nome).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await sb.from("especialidades").insert({ nome } as any).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function createPrestador(sb: SB, input: Record<string, any>, userId: string): Promise<Prestador> {
  const especialidadeId = input.especialidade ? await getOrCreateEspecialidadeId(sb, input.especialidade) : null;
  const { data, error } = await sb
    .from("prestadores")
    .insert({
      nome: input.nome,
      cpf_cnpj: input.cpfCnpj || null,
      telefone: input.telefone,
      whatsapp: input.whatsapp,
      email: input.email,
      cidade: input.cidade,
      endereco: input.endereco,
      especialidade_id: especialidadeId,
      status: input.status || "Ativo",
      valor_diaria: input.valorDiaria || null,
      valor_hora: input.valorHora || null,
      observacoes: input.observacoes,
      created_by: userId,
    } as any)
    .select(PRESTADOR_SELECT)
    .single();
  if (error) throw error;
  await sb.from("prestador_avaliacoes").insert({ prestador_id: data.id } as any);
  return mapPrestador(data);
}

// BUG CORRIGIDO: antes, editar um prestador não salvava a especialidade —
// o patch ia direto pro banco sem resolver o nome digitado/selecionado
// (ex: "Eletricista") para o especialidade_id que a coluna realmente
// espera. Agora, se o patch trouxer `especialidade` (nome), ela é resolvida
// (ou criada, se ainda não existir) e convertida em especialidade_id antes
// de salvar — mesma lógica que já era usada na criação.
export async function updatePrestador(sb: SB, id: string, patch: Record<string, any>) {
  const finalPatch: Record<string, any> = { ...patch };
  if (Object.prototype.hasOwnProperty.call(finalPatch, "especialidade")) {
    const nome = finalPatch.especialidade;
    delete finalPatch.especialidade;
    finalPatch.especialidade_id = nome ? await getOrCreateEspecialidadeId(sb, nome) : null;
  }
  const { error } = await sb.from("prestadores").update(finalPatch).eq("id", id);
  if (error) throw error;
}

export async function deletePrestador(sb: SB, id: string) {
  const { error } = await sb.from("prestadores").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function updateAvaliacao(sb: SB, prestadorId: string, campo: string, valor: number) {
  const { error } = await sb.from("prestador_avaliacoes").update({ [campo]: valor } as any).eq("prestador_id", prestadorId);
  if (error) throw error;
}
