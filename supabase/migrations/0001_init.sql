-- ============================================================================
-- ALUBOX CRM — Migration 0001: schema inicial (Supabase)
-- ============================================================================
-- Diferença em relação ao alubox-schema.sql genérico entregue antes:
-- aqui não existe mais uma tabela "users" com senha — quem cuida de conta,
-- senha e sessão é o Supabase Auth (schema auth.*, já existe por padrão).
-- Criamos apenas uma tabela "profiles" com 1 linha por usuário do Auth,
-- guardando nome/role/status — dados que o Auth não tem.
--
-- Como aplicar: Supabase Dashboard → SQL Editor → colar e rodar, na ordem
-- (0001, depois 0002, depois 0003). Ou via CLI: supabase db push.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PERFIS (1:1 com auth.users)
-- ============================================================================

create type user_role as enum ('ADMINISTRADOR', 'GESTOR', 'OPERACIONAL', 'VISUALIZACAO');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  role        user_role not null default 'OPERACIONAL',
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Cria automaticamente um profile quando alguém é criado no Supabase Auth
-- (ex: pelo Dashboard, ou via app/api/admin/users). O nome inicial vem dos
-- metadados passados na criação; o papel inicial é OPERACIONAL por padrão
-- (o administrador ajusta depois em Configurações → Usuários).
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'OPERACIONAL')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 2. CLIENTES
-- ============================================================================

create table clientes (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  cpf_cnpj     text,
  telefone     text,
  whatsapp     text,
  email        text,
  endereco     text,
  cidade       text,
  observacoes  text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create unique index clientes_cpf_cnpj_uq on clientes (cpf_cnpj) where cpf_cnpj is not null and deleted_at is null;

create table cliente_interacoes (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  texto       text not null,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 3. PRESTADORES
-- ============================================================================

create table especialidades (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique
);

create table prestadores (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  cpf_cnpj          text,
  telefone          text,
  whatsapp          text,
  email             text,
  cidade            text,
  endereco          text,
  especialidade_id  uuid references especialidades(id),
  status            text not null default 'Ativo',
  valor_diaria      numeric(12,2),
  valor_hora        numeric(12,2),
  observacoes       text,
  created_by        uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create unique index prestadores_cpf_cnpj_uq on prestadores (cpf_cnpj) where cpf_cnpj is not null and deleted_at is null;

create table prestador_avaliacoes (
  id               uuid primary key default gen_random_uuid(),
  prestador_id     uuid not null references prestadores(id) on delete cascade,
  qualidade        smallint check (qualidade between 0 and 5),
  prazo            smallint check (prazo between 0 and 5),
  organizacao      smallint check (organizacao between 0 and 5),
  comunicacao      smallint check (comunicacao between 0 and 5),
  custo_beneficio  smallint check (custo_beneficio between 0 and 5),
  updated_at       timestamptz not null default now(),
  unique (prestador_id)
);

-- ============================================================================
-- 4. FORNECEDORES E CATÁLOGOS
-- ============================================================================

create table fornecedores (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  cpf_cnpj     text,
  telefone     text,
  cidade       text,
  observacoes  text,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create unique index fornecedores_cpf_cnpj_uq on fornecedores (cpf_cnpj) where cpf_cnpj is not null and deleted_at is null;

create table categorias_materiais (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique
);

create table categorias_financeiro (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique
);

create table materiais_catalogo (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  categoria_id  uuid references categorias_materiais(id),
  unidade       text default 'un',
  created_at    timestamptz not null default now()
);

create table servicos_catalogo (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  categoria     text,
  valor_padrao  numeric(12,2),
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- 5. OBRAS
-- ============================================================================

create type obra_status as enum ('ORCAMENTO', 'PLANEJAMENTO', 'EXECUCAO', 'FINALIZADO');

create table obras (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique,
  nome               text not null,
  cliente_id         uuid references clientes(id),
  endereco           text,
  cidade             text,
  tipo_imovel        text,
  responsavel_id     uuid references profiles(id),
  status             obra_status not null default 'ORCAMENTO',
  data_cadastro      date not null default current_date,
  data_prev_inicio   date,
  data_prev_termino  date,
  data_real_inicio   date,
  data_real_termino  date,
  valor_orcamento    numeric(12,2),
  valor_contratado   numeric(12,2),
  custo_estimado     numeric(12,2),
  descricao          text,
  observacoes        text,
  created_by         uuid references profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index obras_status_idx on obras (status) where deleted_at is null;
create index obras_cliente_idx on obras (cliente_id);

-- Sequência para gerar o código OB-0001, OB-0002... automaticamente.
create sequence obras_codigo_seq start 1;
create function public.gerar_codigo_obra()
returns trigger as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := 'OB-' || lpad(nextval('obras_codigo_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_gerar_codigo_obra
  before insert on obras
  for each row execute procedure public.gerar_codigo_obra();

create table obra_prestadores (
  obra_id       uuid not null references obras(id) on delete cascade,
  prestador_id  uuid not null references prestadores(id) on delete cascade,
  vinculado_em  timestamptz not null default now(),
  primary key (obra_id, prestador_id)
);

-- ============================================================================
-- 6. TAREFAS
-- ============================================================================

create type tarefa_status as enum ('Pendente', 'Em andamento', 'Concluída', 'Atrasada');
create type tarefa_prioridade as enum ('Baixa', 'Média', 'Alta', 'Urgente');

create table tarefas (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid not null references obras(id) on delete cascade,
  servico_id      uuid references servicos_catalogo(id),
  nome            text not null,
  responsavel_id  uuid references profiles(id),
  prestador_id    uuid references prestadores(id),
  data_inicio     date,
  data_termino    date,
  status          tarefa_status not null default 'Pendente',
  prioridade      tarefa_prioridade not null default 'Média',
  valor           numeric(12,2),
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index tarefas_obra_idx on tarefas (obra_id);
create index tarefas_status_idx on tarefas (status);

-- ============================================================================
-- 7. MATERIAIS (por obra)
-- ============================================================================

create table obra_materiais (
  id                     uuid primary key default gen_random_uuid(),
  obra_id                uuid not null references obras(id) on delete cascade,
  material_catalogo_id   uuid references materiais_catalogo(id),
  nome                   text not null,
  categoria_id           uuid references categorias_materiais(id),
  quantidade             numeric(12,2),
  unidade                text,
  fornecedor_id          uuid references fornecedores(id),
  valor_previsto         numeric(12,2),
  valor_comprado         numeric(12,2),
  data_compra            date,
  status                 text default 'Previsto',
  created_at             timestamptz not null default now()
);
create index obra_materiais_obra_idx on obra_materiais (obra_id);

-- ============================================================================
-- 8. FINANCEIRO (por obra)
-- ============================================================================

create type lancamento_tipo as enum ('receita', 'despesa');

create table obra_financeiro (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references obras(id) on delete cascade,
  tipo          lancamento_tipo not null,
  descricao     text,
  categoria_id  uuid references categorias_financeiro(id),
  valor         numeric(12,2) not null,
  data          date not null default current_date,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index obra_financeiro_obra_idx on obra_financeiro (obra_id);
create index obra_financeiro_data_idx on obra_financeiro (data);

-- ============================================================================
-- 9. FOTOS E DOCUMENTOS (referência ao Supabase Storage — ver migration 0003)
-- ============================================================================

create type foto_categoria as enum ('Antes', 'Durante', 'Depois');

create table obra_fotos (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references obras(id) on delete cascade,
  storage_key   text not null,  -- caminho dentro do bucket "obras-fotos"
  url           text not null,  -- URL pública (ou assinada) para exibir
  categoria     foto_categoria not null,
  legenda       text,
  uploaded_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index obra_fotos_obra_idx on obra_fotos (obra_id);

create table obra_documentos (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references obras(id) on delete cascade,
  storage_key   text not null,  -- caminho dentro do bucket "obras-documentos"
  url           text not null,
  nome          text not null,
  tipo          text,
  data          date not null default current_date,
  uploaded_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index obra_documentos_obra_idx on obra_documentos (obra_id);

-- ============================================================================
-- 10. HISTÓRICO
-- ============================================================================

create table obra_historico (
  id          uuid primary key default gen_random_uuid(),
  obra_id     uuid not null references obras(id) on delete cascade,
  texto       text not null,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index obra_historico_obra_idx on obra_historico (obra_id, created_at desc);

-- Função auxiliar usada pelo serviço de obras (services/obras.ts) para
-- registrar no histórico quem fez a mudança de etapa, com data/hora — a
-- própria created_at + created_by já cobrem isso; o texto descreve a ação.
