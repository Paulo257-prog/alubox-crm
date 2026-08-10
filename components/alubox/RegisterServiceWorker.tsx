"use client";

import { useEffect } from "react";

// Registra o service worker (public/service-worker.js) assim que a página
// carrega. Isso SÓ funciona quando o site está servido por um domínio real
// (http://localhost em dev, ou https://crm.alubox.com.br em produção) —
// dentro do artefato anterior isso não tinha efeito nenhum.
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {
        // Falha silenciosa — PWA é um "progressive enhancement": o app
        // continua funcionando normalmente sem o service worker.
      });
    }
  }, []);
  return null;
}
