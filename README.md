# ALUBOX CRM — projeto Next.js + Supabase

Este é o projeto de produção do ALUBOX CRM, migrado do protótipo (artefato React
de arquivo único) para uma aplicação Next.js real, com Supabase como banco de
dados, autenticação e storage de arquivos.

**Ver `MIGRATION_STATUS.md` para o relatório completo e honesto do que já
está pronto e o que ainda falta.**

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

Abra http://localhost:3000 — vai redirecionar para `/login`.

## Antes de rodar pela primeira vez: banco de dados

No painel do Supabase (SQL Editor), rode nesta ordem:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_storage.sql`

Depois crie o primeiro usuário ADMINISTRADOR: Supabase Dashboard → Authentication
→ Add user (e-mail + senha) → SQL Editor:

```sql
update profiles set role = 'ADMINISTRADOR' where id = 'UUID-DO-USUARIO-CRIADO';
```

(Todo novo usuário do Auth já ganha uma linha em `profiles` automaticamente,
como `OPERACIONAL` por padrão — o comando acima só promove o primeiro a
administrador.)

## Estrutura

```
app/                 rotas (App Router)
  login/              tela de login
  reset-password/     recuperação de senha
  auth/callback/       troca o código do link de e-mail por sessão
  api/admin/users/     única rota que usa a service role key (criar usuário)
  (app)/               grupo de rotas autenticadas (dashboard, obras, etc.)
components/alubox/    componentes de UI, portados do protótipo
hooks/                useAluboxStore (dados) 
lib/                  clientes Supabase, permissões, utilitários
services/             acesso a dados por entidade (obras, clientes, ...)
types/                tipos do banco e do domínio
supabase/migrations/  schema, RLS e storage — rodar no Supabase antes de usar
public/                manifest.json, service-worker.js, ícones
```

## Deploy (Vercel)

Ver `alubox-deploy-guia.md` (na raiz dos arquivos entregues) para o passo a
passo completo. Resumo: conectar o repositório à Vercel, colar as mesmas
variáveis do `.env.example` (com valores reais) nas Environment Variables do
projeto, deploy. O domínio `crm.alubox.com.br` só é conectado depois, com um
único registro CNAME novo.
