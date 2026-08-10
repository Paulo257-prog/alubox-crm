import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AluboxProvider } from "@/components/alubox/AluboxProvider";
import { AppShell } from "@/components/alubox/AppShell";

// Server Component: roda no servidor a cada navegação, então nunca expõe
// dados de outra pessoa antes de confirmar quem está logado. O middleware
// já bloqueia quem não tem sessão — aqui também checamos porque o
// middleware pode, em alguns casos de cache, não cobrir 100% (defesa em
// profundidade, mesmo princípio das políticas de RLS no banco).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!profile || !profile.ativo) {
    // Conta existe no Auth mas não tem profile ativo (ex: foi desativada
    // por um administrador) — não deixa entrar no sistema.
    redirect("/login?erro=conta-inativa");
  }

  const currentUser = { id: user.id, nome: profile.nome, email: user.email ?? "", role: profile.role, ativo: profile.ativo };

  return (
    <AluboxProvider currentUser={currentUser}>
      <AppShell>{children}</AppShell>
    </AluboxProvider>
  );
}
