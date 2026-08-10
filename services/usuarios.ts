import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { mapUsuario } from "@/lib/mappers";
import type { Usuario } from "@/types/domain";

type SB = SupabaseClient<Database>;

// Lista de perfis — usada tanto na tela de Usuários (Configurações) quanto
// nos seletores de "Responsável" (só os ativos).
export async function listUsuarios(sb: SB): Promise<Usuario[]> {
  const { data, error } = await sb.from("profiles").select("*").order("nome");
  if (error) throw error;
  // "email" não existe em profiles (fica em auth.users, que o cliente
  // anônimo/autenticado comum não pode ler diretamente) — por isso a lista
  // completa com e-mail é buscada via app/api/admin/users (service role),
  // só acessível a quem já é ADMINISTRADOR. Aqui devolvemos nome/role/ativo,
  // suficiente para os seletores de responsável em obras/tarefas.
  return (data ?? []).map((row: any) => mapUsuario({ ...row, email: row.email ?? "" }));
}

export async function updateUsuario(sb: SB, id: string, patch: { nome?: string; role?: string; ativo?: boolean }) {
  const { error } = await sb.from("profiles").update(patch as any).eq("id", id);
  if (error) throw error;
}

// A criação de conta (e-mail + senha) precisa da service role key, que
// nunca deve chegar ao navegador — por isso passa pela rota server-side
// app/api/admin/users (ver esse arquivo). Esta função só chama a rota.
export async function criarUsuario(input: { nome: string; email: string; senha: string; role: string }) {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Não foi possível criar o usuário.");
  }
  return res.json();
}
