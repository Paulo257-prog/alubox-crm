"use client";

import React, { createContext, useContext } from "react";
import { useAluboxStore } from "@/hooks/useAluboxStore";
import type { Usuario } from "@/types/domain";

interface CurrentUser extends Usuario {
  email: string;
}

type AluboxContextValue = ReturnType<typeof useAluboxStore> & { currentUser: CurrentUser };

const AluboxContext = createContext<AluboxContextValue | null>(null);

export function AluboxProvider({ currentUser, children }: { currentUser: CurrentUser; children: React.ReactNode }) {
  const store = useAluboxStore(currentUser.id);
  return <AluboxContext.Provider value={{ ...store, currentUser }}>{children}</AluboxContext.Provider>;
}

// Hook usado por todas as páginas/componentes dentro de app/(app)/* para
// acessar os dados, as ações (createObra, moveObraStage, etc.) e o usuário
// logado — substitui o antigo `data`/`mutate` recebidos por prop no
// protótipo de artefato único.
export function useAlubox() {
  const ctx = useContext(AluboxContext);
  if (!ctx) throw new Error("useAlubox precisa ser usado dentro de <AluboxProvider>.");
  return ctx;
}
