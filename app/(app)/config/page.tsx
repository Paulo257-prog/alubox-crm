import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfigView } from "@/components/alubox/Config";

// Checagem redundante no servidor: mesmo que alguém force a URL /config,
// só ADMINISTRADOR e GESTOR conseguem ver a página (matriz de permissões:
// "Gerenciar catálogos" é permitido para os dois; "Configurações gerais/
// usuários" fica restrito a ADMINISTRADOR — essa distinção é feita dentro
// do próprio ConfigView, escondendo a seção de Usuários para quem não é
// admin). A policy de RLS também barra escrita indevida no banco.
export default async function ConfigPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "ADMINISTRADOR" && profile?.role !== "GESTOR") redirect("/dashboard");
  return <ConfigView />;
}
