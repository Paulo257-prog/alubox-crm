-- ============================================================================
-- ALUBOX CRM — Migration 0004: catálogos com Ativo/Inativo
-- ============================================================================
-- Adiciona a coluna "ativo" aos catálogos (fornecedores, materiais, serviços,
-- categorias, especialidades) para permitir desativar um registro em vez de
-- excluí-lo — pedido explícito: "não permitir exclusão destrutiva de
-- registros vinculados a obras/tarefas/financeiro; preferir Ativo/Inativo".
--
-- A proteção contra exclusão destrutiva de registros EM USO já existe desde
-- a migration 0001: as colunas de referência (ex: obra_materiais.
-- fornecedor_id) não têm "on delete cascade", então o Postgres recusa a
-- exclusão de um fornecedor/material/serviço/categoria que esteja vinculado
-- a qualquer obra — a aplicação (services/catalogos.ts) trata esse erro e
-- sugere desativar em vez de excluir.
-- ============================================================================

alter table fornecedores          add column if not exists ativo boolean not null default true;
alter table materiais_catalogo    add column if not exists ativo boolean not null default true;
alter table servicos_catalogo     add column if not exists ativo boolean not null default true;
alter table categorias_materiais  add column if not exists ativo boolean not null default true;
alter table categorias_financeiro add column if not exists ativo boolean not null default true;
alter table especialidades        add column if not exists ativo boolean not null default true;

-- Políticas de UPDATE que faltavam (só existiam insert/delete) — necessárias
-- para editar nome/categoria e alternar ativo/inativo. Mesmo critério das
-- políticas de escrita já existentes para catálogos: ADMINISTRADOR e GESTOR.
create policy "materiais_catalogo: update" on materiais_catalogo for update
  using (public.current_role() in ('ADMINISTRADOR','GESTOR'));

create policy "servicos_catalogo: update" on servicos_catalogo for update
  using (public.current_role() in ('ADMINISTRADOR','GESTOR'));

create policy "categorias_materiais: update" on categorias_materiais for update
  using (public.current_role() in ('ADMINISTRADOR','GESTOR'));

create policy "categorias_financeiro: update" on categorias_financeiro for update
  using (public.current_role() in ('ADMINISTRADOR','GESTOR'));
