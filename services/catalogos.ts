import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type SB = SupabaseClient<Database>;

// ============================================================================
// Listagens usadas pelos seletores/pickers do resto do sistema — só trazem
// os registros ATIVOS (um catálogo desativado não deve mais aparecer como
// opção em "+ Novo" nem nos formulários de obra).
// ============================================================================

export async function listFornecedores(sb: SB) {
  const { data, error } = await sb.from("fornecedores").select("*").eq("ativo", true).is("deleted_at", null).order("nome");
  if (error) throw error;
  return (data ?? []).map((f: any) => ({ id: f.id, nome: f.nome, cpfCnpj: f.cpf_cnpj ?? "", telefone: f.telefone ?? "", cidade: f.cidade ?? "", observacoes: f.observacoes ?? "", ativo: f.ativo }));
}

export async function findFornecedorPorDocumento(sb: SB, cpfCnpj: string) {
  const clean = cpfCnpj.replace(/\D/g, "");
  if (!clean) return null;
  const { data, error } = await sb.from("fornecedores").select("*").eq("cpf_cnpj", cpfCnpj).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, nome: data.nome, cpfCnpj: data.cpf_cnpj ?? "" } : null;
}

export async function createFornecedor(sb: SB, input: { nome: string; cpfCnpj?: string; telefone?: string; cidade?: string; observacoes?: string }) {
  const { data, error } = await sb
    .from("fornecedores")
    .insert({ nome: input.nome, cpf_cnpj: input.cpfCnpj || null, telefone: input.telefone, cidade: input.cidade, observacoes: input.observacoes } as any)
    .select("*")
    .single();
  if (error) throw error;
  return { id: data.id, nome: data.nome };
}

export async function listMateriaisCatalogo(sb: SB) {
  const { data, error } = await sb.from("materiais_catalogo").select("*, categorias_materiais(nome)").eq("ativo", true).order("nome");
  if (error) throw error;
  return (data ?? []).map((m: any) => ({ id: m.id, nome: m.nome, categoria: m.categorias_materiais?.nome ?? "", categoriaId: m.categoria_id ?? null, unidade: m.unidade ?? "un", ativo: m.ativo }));
}

export async function createMaterialCatalogo(sb: SB, input: { nome: string; categoria?: string; unidade?: string }) {
  const categoriaId = input.categoria ? await getOrCreate(sb, "categorias_materiais", input.categoria) : null;
  const { data, error } = await sb
    .from("materiais_catalogo")
    .insert({ nome: input.nome, categoria_id: categoriaId, unidade: input.unidade || "un" } as any)
    .select("*")
    .single();
  if (error) throw error;
  return { id: data.id, nome: data.nome, categoria: input.categoria || "", unidade: data.unidade };
}

export async function listServicos(sb: SB) {
  const { data, error } = await sb.from("servicos_catalogo").select("*").eq("ativo", true).order("nome");
  if (error) throw error;
  return (data ?? []).map((s: any) => ({ id: s.id, nome: s.nome, categoria: s.categoria ?? "", valorPadrao: s.valor_padrao ?? "", ativo: s.ativo }));
}

export async function createServico(sb: SB, input: { nome: string; categoria?: string; valorPadrao?: number }) {
  const { data, error } = await sb
    .from("servicos_catalogo")
    .insert({ nome: input.nome, categoria: input.categoria, valor_padrao: input.valorPadrao ?? null } as any)
    .select("*")
    .single();
  if (error) throw error;
  return { id: data.id, nome: data.nome };
}

export async function listCategoriasFinanceiro(sb: SB) {
  const { data, error } = await sb.from("categorias_financeiro").select("*").eq("ativo", true).order("nome");
  if (error) throw error;
  return (data ?? []).map((c: any) => c.nome as string);
}

export async function listCategoriasMateriais(sb: SB) {
  const { data, error } = await sb.from("categorias_materiais").select("*").eq("ativo", true).order("nome");
  if (error) throw error;
  return (data ?? []).map((c: any) => c.nome as string);
}

export async function listEspecialidades(sb: SB) {
  const { data, error } = await sb.from("especialidades").select("*").eq("ativo", true).order("nome");
  if (error) throw error;
  return (data ?? []).map((c: any) => c.nome as string);
}

// Helper genérico "achar pelo nome ou criar" para as tabelas de categoria
// simples (nome único) — usado pelos botões "+ Novo"/"+ Nova" da UI e para
// resolver o texto digitado em categoria_id na hora de salvar um material
// ou um lançamento financeiro.
export async function getOrCreate(sb: SB, table: "categorias_materiais" | "categorias_financeiro" | "especialidades", nome: string): Promise<string> {
  const { data: existing } = await sb.from(table).select("id").eq("nome", nome).maybeSingle();
  if (existing) return (existing as any).id;
  const { data, error } = await sb.from(table).insert({ nome } as any).select("id").single();
  if (error) throw error;
  return (data as any).id;
}

// ============================================================================
// Gestão completa (tela Configurações → Catálogos) — traz TODOS os
// registros, ativos e inativos, para quem administra o catálogo.
// ============================================================================

export type CatalogoSimples = "categorias_materiais" | "categorias_financeiro" | "especialidades";

export async function listCatalogoSimplesTodos(sb: SB, table: CatalogoSimples) {
  const { data, error } = await sb.from(table).select("*").order("nome");
  if (error) throw error;
  return (data ?? []).map((c: any) => ({ id: c.id, nome: c.nome, ativo: c.ativo }));
}

export async function renameCatalogoSimples(sb: SB, table: CatalogoSimples, id: string, nome: string) {
  const { error } = await sb.from(table).update({ nome } as any).eq("id", id);
  if (error) throw error;
}

export async function toggleAtivoCatalogoSimples(sb: SB, table: CatalogoSimples, id: string, ativo: boolean) {
  const { error } = await sb.from(table).update({ ativo } as any).eq("id", id);
  if (error) throw error;
}

// Tenta excluir de verdade; se o registro estiver em uso (violação de
// chave estrangeira), devolve um erro amigável em vez de deixar vazar o
// erro cru do Postgres — a tela deve sugerir desativar em vez de excluir.
export async function excluirCatalogoSimplesSeguro(sb: SB, table: CatalogoSimples, id: string) {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) {
    if ((error as any).code === "23503") {
      throw new Error("Este registro está em uso em uma ou mais obras e não pode ser excluído. Desative-o em vez de excluir.");
    }
    throw error;
  }
}

export async function listFornecedoresTodos(sb: SB) {
  const { data, error } = await sb.from("fornecedores").select("*").is("deleted_at", null).order("nome");
  if (error) throw error;
  return (data ?? []).map((f: any) => ({ id: f.id, nome: f.nome, cpfCnpj: f.cpf_cnpj ?? "", telefone: f.telefone ?? "", cidade: f.cidade ?? "", observacoes: f.observacoes ?? "", ativo: f.ativo }));
}

export async function updateFornecedor(sb: SB, id: string, patch: Record<string, any>) {
  const { error } = await sb.from("fornecedores").update(patch).eq("id", id);
  if (error) throw error;
}

export async function toggleAtivoFornecedor(sb: SB, id: string, ativo: boolean) {
  const { error } = await sb.from("fornecedores").update({ ativo } as any).eq("id", id);
  if (error) throw error;
}

export async function excluirFornecedorSeguro(sb: SB, id: string) {
  const { error } = await sb.from("fornecedores").delete().eq("id", id);
  if (error) {
    if ((error as any).code === "23503") throw new Error("Este fornecedor está em uso em uma ou mais obras e não pode ser excluído. Desative-o em vez de excluir.");
    throw error;
  }
}

export async function listMateriaisCatalogoTodos(sb: SB) {
  const { data, error } = await sb.from("materiais_catalogo").select("*, categorias_materiais(nome)").order("nome");
  if (error) throw error;
  return (data ?? []).map((m: any) => ({ id: m.id, nome: m.nome, categoria: m.categorias_materiais?.nome ?? "", categoriaId: m.categoria_id ?? null, unidade: m.unidade ?? "un", ativo: m.ativo }));
}

export async function updateMaterialCatalogo(sb: SB, id: string, input: { nome?: string; categoria?: string; unidade?: string }) {
  const patch: Record<string, any> = { nome: input.nome, unidade: input.unidade };
  if (input.categoria !== undefined) patch.categoria_id = input.categoria ? await getOrCreate(sb, "categorias_materiais", input.categoria) : null;
  const { error } = await sb.from("materiais_catalogo").update(patch).eq("id", id);
  if (error) throw error;
}

export async function toggleAtivoMaterialCatalogo(sb: SB, id: string, ativo: boolean) {
  const { error } = await sb.from("materiais_catalogo").update({ ativo } as any).eq("id", id);
  if (error) throw error;
}

export async function excluirMaterialCatalogoSeguro(sb: SB, id: string) {
  const { error } = await sb.from("materiais_catalogo").delete().eq("id", id);
  if (error) {
    if ((error as any).code === "23503") throw new Error("Este material está em uso em uma ou mais obras e não pode ser excluído. Desative-o em vez de excluir.");
    throw error;
  }
}

export async function listServicosTodos(sb: SB) {
  const { data, error } = await sb.from("servicos_catalogo").select("*").order("nome");
  if (error) throw error;
  return (data ?? []).map((s: any) => ({ id: s.id, nome: s.nome, categoria: s.categoria ?? "", valorPadrao: s.valor_padrao ?? "", ativo: s.ativo }));
}

export async function updateServico(sb: SB, id: string, patch: Record<string, any>) {
  const { error } = await sb.from("servicos_catalogo").update(patch).eq("id", id);
  if (error) throw error;
}

export async function toggleAtivoServico(sb: SB, id: string, ativo: boolean) {
  const { error } = await sb.from("servicos_catalogo").update({ ativo } as any).eq("id", id);
  if (error) throw error;
}

export async function excluirServicoSeguro(sb: SB, id: string) {
  const { error } = await sb.from("servicos_catalogo").delete().eq("id", id);
  if (error) {
    if ((error as any).code === "23503") throw new Error("Este serviço está em uso em uma ou mais tarefas e não pode ser excluído. Desative-o em vez de excluir.");
    throw error;
  }
}
