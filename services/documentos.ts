import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type SB = SupabaseClient<Database>;
const BUCKET = "obras-documentos";

export async function uploadDocumento(
  sb: SB,
  obraId: string,
  file: File,
  tipo: string,
  userId: string
) {
  const path = `${obraId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, file);
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (signError) throw signError;

  const { error } = await sb.from("obra_documentos").insert({
    obra_id: obraId,
    storage_key: path,
    url: signed.signedUrl,
    nome: file.name,
    tipo,
    uploaded_by: userId,
  } as any);
  if (error) throw error;
}

export async function refreshDocumentoUrl(sb: SB, storageKey: string) {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(storageKey, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocumento(sb: SB, id: string, storageKey: string) {
  await sb.storage.from(BUCKET).remove([storageKey]);
  const { error } = await sb.from("obra_documentos").delete().eq("id", id);
  if (error) throw error;
}
