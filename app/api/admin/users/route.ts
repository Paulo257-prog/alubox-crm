import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Cria uma conta nova (e-mail + senha) no Supabase Auth. Só pode ser
// chamada por quem já está logado como ADMINISTRADOR — checagem feita aqui
// no servidor (nunca confiar só no frontend esconder o botão).
//
// Esta rota é a ÚNICA parte do projeto que usa SUPABASE_SERVICE_ROLE_KEY,
// e essa chave nunca sai do servidor (não está em nenhum código que roda
// no navegador).
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Apenas administradores podem criar usuários." }, { status: 403 });
  }

  const body = await request.json();
  const { nome, email, senha, role } = body || {};
  if (!nome || !email || !senha || !role) {
    return NextResponse.json({ error: "Nome, e-mail, senha e perfil são obrigatórios." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // O trigger on_auth_user_created (migration 0001) já cria a linha em
  // profiles automaticamente com nome/role vindos de user_metadata.
  return NextResponse.json({ id: created.user?.id });
}
