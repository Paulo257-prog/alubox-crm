-- ============================================================================
-- ALUBOX CRM — Migration 0003: Storage (fotos e documentos das obras)
-- ============================================================================
-- Cria os buckets e as políticas de acesso. Convenção de caminho dentro de
-- cada bucket (usada pelos services/fotos.ts e services/documentos.ts):
--
--   obras-fotos:
--     {obra_id}/{categoria}/{arquivo}.jpg          ex: 3fa.../Antes/foto1.jpg
--
--   obras-documentos:
--     {obra_id}/{arquivo}                          ex: 3fa.../contrato.pdf
--
-- Os dois buckets são privados (não públicos) — o acesso é sempre validado
-- pelas políticas abaixo, e a exibição usa URLs assinadas (signed URLs) com
-- validade curta, geradas sob demanda pelo backend/serviço.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('obras-fotos', 'obras-fotos', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('obras-documentos', 'obras-documentos', false, 26214400, null)
on conflict (id) do nothing;

-- Leitura: qualquer usuário ativo do sistema.
create policy "obras-fotos: leitura"
  on storage.objects for select
  using (bucket_id = 'obras-fotos' and public.is_active_user());

create policy "obras-documentos: leitura"
  on storage.objects for select
  using (bucket_id = 'obras-documentos' and public.is_active_user());

-- Upload: ADMINISTRADOR, GESTOR, OPERACIONAL (mesmo papel que pode anexar
-- fotos/documentos na matriz de permissões).
create policy "obras-fotos: upload"
  on storage.objects for insert
  with check (
    bucket_id = 'obras-fotos'
    and public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL')
  );

create policy "obras-documentos: upload"
  on storage.objects for insert
  with check (
    bucket_id = 'obras-documentos'
    and public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL')
  );

-- Exclusão: mesmo critério do upload (a matriz não distingue quem anexou de
-- quem pode remover, dentro dos papéis que têm acesso de edição à obra).
create policy "obras-fotos: excluir"
  on storage.objects for delete
  using (
    bucket_id = 'obras-fotos'
    and public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL')
  );

create policy "obras-documentos: excluir"
  on storage.objects for delete
  using (
    bucket_id = 'obras-documentos'
    and public.current_role() in ('ADMINISTRADOR','GESTOR','OPERACIONAL')
  );
