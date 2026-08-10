import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Cliente } from "@/types/domain";
import { mapCliente } from "@/lib/mappers";

type SB = SupabaseClient<Database>;

const CLIENTE_SELECT = `*, cliente_interacoes(*)`;

export async function listClientes(sb: SB): Promise<Cliente[]> {
  const { data, error } = await sb.from("clientes").select(CLIENTE_SELECT).is("deleted_at", null).order("nome");
  if (error) throw error;
  return (data ?? []).map(mapCliente);
}

// Verifica duplicidade por CPF/CNPJ — mesma regra do protótipo (+Novo com
// checagem antes de criar), agora validada contra o banco de verdade.
export async function findClientePorDocumento(sb: SB, cpfCnpj: string, excludeId?: string) {
  const clean = cpfCnpj.replace(/\D/g, "");
  if (!clean) return null;
  let query = sb.from("clientes").select("*").eq("cpf_cnpj", cpfCnpj).is("deleted_at", null);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapCliente(data as any) : null;
}

export async function createCliente(sb: SB, input: Record<string, any>, userId: string): Promise<Cliente> {
  const { data, error } = await sb
    .from("clientes")
    .insert({
      nome: input.nome,
      cpf_cnpj: input.cpfCnpj || null,
      telefone: input.telefone,
      whatsapp: input.whatsapp,
      email: input.email,
      endereco: input.endereco,
      cidade: input.cidade,
      observacoes: input.observacoes,
      created_by: userId,
    } as any)
    .select(CLIENTE_SELECT)
    .single();
  if (error) throw error;
  return mapCliente(data);
}

export async function updateCliente(sb: SB, id: string, patch: Record<string, any>) {
  const { error } = await sb.from("clientes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCliente(sb: SB, id: string) {
  const { error } = await sb.from("clientes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function addInteracao(sb: SB, clienteId: string, texto: string, userId: string) {
  const { error } = await sb.from("cliente_interacoes").insert({ cliente_id: clienteId, texto, created_by: userId } as any);
  if (error) throw error;
}
