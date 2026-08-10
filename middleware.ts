import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Roda em toda requisição (exceto assets estáticos, ver matcher abaixo) e
// decide, no servidor, se a pessoa pode ver a página pedida. É isso que
// torna a proteção de rotas real — diferente do protótipo anterior, que só
// escondia a tela no navegador.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|service-worker.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
