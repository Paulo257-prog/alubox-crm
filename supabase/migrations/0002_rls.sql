-- ============================================================================
-- ALUBOX CRM — Migration 0002: Row Level Security (RLS)
-- ============================================================================
-- Espelha a matriz de alubox-permissoes.md / lib/permissions.ts, mas
-- aplicada no banco — mesmo que alguém adultere o app no navegador, o
-- Postgres recusa a operação. Rodar depois de 0001_init.sql.
-- ============================================================================

-- Função auxiliar: qual o papel do usuário autenticado na requisição atual.
-- security definer + search_path fixo evitam que a função seja usada para
-- escalar privilégio (recomendação oficial do Supabase para esse padrão).
create or replace function public.current_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid() and ativo = true;
$$;

create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and ativo = true);
$$;

-- ============================================================================
-- PROFILES
-- ============================================================================
alter table profiles enable row level security;

-- Qualquer pessoa logada e ativa pode ver a lista básica de perfis (precisa
-- disso pra preencher os seletores de "Responsável" em obras/tarefas).
create policy "profiles: leitura para autenticados ativos"
  on profiles for select
  using (public.is_active_user());

-- Só ADMINISTRADOR pode alterar papel/status de outras contas.
create policy "profiles: admin gerencia usuarios"
  on profiles for update
  using (public.current_role() = 'ADMINISTRADOR');

-- Qualquer usuário pode atualizar o PRÓPRIO nome (não o próprio papel).
create policy "profiles: usuario edita o proprio nome"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================================
-- CLIENTES / PRESTADORES / CATÁLOGOS — leitura ampla, escrita por papel
-- ============================================================================

alter table clientes enable row level security;
alter table cliente_interacoes enable row level security;
alter table prestadores enable row level security;
alter table prestador_avaliacoes enable row level security;
alter table especialidades enable row level security;
alter table fornecedores enable row level security;
alter table categorias_materiais enable row level security;
alter table categorias_financeiro enable row level security;
alter table materiais_catalogo enable row level security;
alter table servicos_catalogo enable row level security;

-- Leitura: qualquer usuário ativo (inclusive VISUALIZACAO).
create policy "clientes: leitura" on clientes for select using (public.is_active_user());
create policy "cliente_interacoes: leitura" on cliente_interacoes for select using (public.is_active_user());
create policy "prestadores: leitura" on prestadores for select using (public.is_active_user());
create policy "prestador_avaliacoes: leitura" on prestador_avaliacoes for select using (public.is_active_user());
create policy "especialidades: leitura" on especialidades for select using (public.is_active_user());
create policy "fornecedores: leitura" on fornecedores for select using (public.is_active_user());
create policy "categorias_materiais: leitura" on categorias_materiais for select using (public.is_active_user());
create policy "categorias_financeiro: leitura" on categorias_financeiro for select using (public.is_active_user());
create policy "materiais_catalogo: leitura" on materiais_catalogo for select using (public.is_active_user());
create policy "servicos_catalogo: leitura" on servicos_catalogo for select using (public.is_active_user());

-- Criar/editar: ADMINISTRADOR, GESTOR, OPERACIONAL (matriz: "Criar/editar
-- clientes e prestadores" ✅ para os três).
create policy "clientes: criar/editar" on clientes for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "clientes: update" on clientes for update using (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "cliente_interacoes: criar" on cliente_interacoes for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "prestadores: criar/editar" on prestadores for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "prestadores: update" on prestadores for update using (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "prestador_avaliacoes: upsert" on prestador_avaliacoes for all using (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));

-- Excluir: só ADMINISTRADOR e GESTOR (matriz).
create policy "clientes: excluir" on clientes for delete using (public.current_role() in ('ADMINISTRADOR','GESTOR'));
create policy "prestadores: excluir" on prestadores for delete using (public.current_role() in ('ADMINISTRADOR','GESTOR'));

-- Catálogos (fornecedor, material, serviço, categorias, especialidade):
-- gerenciar é ADMINISTRADOR/GESTOR (matriz: "Gerenciar catálogos"), mas o
-- "+ Novo" dentro de um formulário de obra é usado por qualquer papel que
-- pode criar/editar — por isso o INSERT fica liberado para os três papéis
-- operacionais também (criar um fornecedor novo ao registrar um material,
-- por exemplo), e só UPDATE/DELETE ficam restritos a admin/gestor.
create policy "especialidades: insert" on especialidades for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "especialidades: update/delete" on especialidades for all using (public.current_role() in ('ADMINISTRADOR','GESTOR'));
create policy "fornecedores: insert" on fornecedores for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "fornecedores: update" on fornecedores for update using (public.current_role() in ('ADMINISTRADOR','GESTOR'));
create policy "fornecedores: delete" on fornecedores for delete using (public.current_role() in ('ADMINISTRADOR','GESTOR'));
create policy "categorias_materiais: insert" on categorias_materiais for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "categorias_materiais: delete" on categorias_materiais for delete using (public.current_role() in ('ADMINISTRADOR','GESTOR'));
create policy "categorias_financeiro: insert" on categorias_financeiro for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR'));
create policy "categorias_financeiro: delete" on categorias_financeiro for delete using (public.current_role() in ('ADMINISTRADOR','GESTOR'));
create policy "materiais_catalogo: insert" on materiais_catalogo for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "materiais_catalogo: delete" on materiais_catalogo for delete using (public.current_role() in ('ADMINISTRADOR','GESTOR'));
create policy "servicos_catalogo: insert" on servicos_catalogo for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "servicos_catalogo: delete" on servicos_catalogo for delete using (public.current_role() in ('ADMINISTRADOR','GESTOR'));

-- ============================================================================
-- OBRAS e tabelas filhas
-- ============================================================================

alter table obras enable row level security;
alter table obra_prestadores enable row level security;
alter table tarefas enable row level security;
alter table obra_materiais enable row level security;
alter table obra_financeiro enable row level security;
alter table obra_fotos enable row level security;
alter table obra_documentos enable row level security;
alter table obra_historico enable row level security;

-- Leitura ampla (todo usuário ativo vê todas as obras — é uma empresa
-- pequena, sem necessidade de segmentar por dono).
create policy "obras: leitura" on obras for select using (public.is_active_user());
create policy "obra_prestadores: leitura" on obra_prestadores for select using (public.is_active_user());
create policy "tarefas: leitura" on tarefas for select using (public.is_active_user());
create policy "obra_materiais: leitura" on obra_materiais for select using (public.is_active_user());
create policy "obra_financeiro: leitura" on obra_financeiro for select using (public.is_active_user());
create policy "obra_fotos: leitura" on obra_fotos for select using (public.is_active_user());
create policy "obra_documentos: leitura" on obra_documentos for select using (public.is_active_user());
create policy "obra_historico: leitura" on obra_historico for select using (public.is_active_user());

-- Criar/editar obra, tarefas, materiais, fotos, documentos, vínculo de
-- prestador: ADMINISTRADOR, GESTOR, OPERACIONAL.
create policy "obras: criar" on obras for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "obras: editar" on obras for update using (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "obra_prestadores: vincular" on obra_prestadores for all using (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "tarefas: criar/editar" on tarefas for all using (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "obra_materiais: criar/editar" on obra_materiais for all using (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "obra_fotos: criar" on obra_fotos for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "obra_fotos: excluir" on obra_fotos for delete using (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "obra_documentos: criar" on obra_documentos for insert with check (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "obra_documentos: excluir" on obra_documentos for delete using (public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL'));
create policy "obra_historico: criar" on obra_historico for insert with check (public.is_active_user());

-- Excluir obra: só ADMINISTRADOR e GESTOR.
create policy "obras: excluir" on obras for delete using (public.current_role() in ('ADMINISTRADOR','GESTOR'));

-- Financeiro: lançar/editar/excluir é só ADMINISTRADOR e GESTOR (matriz —
-- "Lançar financeiro" ❌ para OPERACIONAL). VISUALIZACAO só lê (já coberto
-- pela policy de leitura ampla acima).
create policy "obra_financeiro: criar/editar/excluir" on obra_financeiro for all
  using (public.current_role() in ('ADMINISTRADOR','GESTOR'))
  with check (public.current_role() in ('ADMINISTRADOR','GESTOR'));
