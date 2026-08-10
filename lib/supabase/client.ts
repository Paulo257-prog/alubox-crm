"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Cliente Supabase para uso dentro de Client Components ("use client").
// Usa a anon key (pública) — a segurança real é garantida pelas políticas
// de RLS no banco, não por esconder esta chave.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
