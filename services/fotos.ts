import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { compressImageFile } from "@/lib/utils";

type SB = SupabaseClient<Database>;

const BUCKET = "obras-fotos";

// Faz upload da foto (já comprimida) para o Supabase Storage, na convenção
// de pasta {obra_id}/{categoria}/{arquivo}, e registra a referência na
// tabela obra_fotos. Retorna uma URL assinada válida por 1 hora — o mesmo
// padrão deve ser usado ao reabrir a galeria (as URLs não são permanentes,
// já que o bucket é privado).
export async function uploadFoto(
  sb: SB,
  obraId: string,
  file: File,
  categoria: "Antes" | "Durante" | "Depois",
  legenda: string,
  userId: string
) {
  const blob = await compressImageFile(file);
  const path = `${obraId}/${categoria}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (signError) throw signError;

  const { error } = await sb.from("obra_fotos").insert({
    obra_id: obraId,
    storage_key: path,
    url: signed.signedUrl,
    categoria,
    legenda,
    uploaded_by: userId,
  } as any);
  if (error) throw error;
}

export async function refreshFotoUrl(sb: SB, storageKey: string) {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(storageKey, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteFoto(sb: SB, id: string, storageKey: string) {
  await sb.storage.from(BUCKET).remove([storageKey]);
  const { error } = await sb.from("obra_fotos").delete().eq("id", id);
  if (error) throw error;
}
