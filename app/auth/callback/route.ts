import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Troca o código temporário que vem no link do e-mail (magic link ou
// redefinição de senha) por uma sessão de verdade, via cookies.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
