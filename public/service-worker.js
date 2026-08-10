// ALUBOX CRM — Service Worker (base para PWA)
//
// Este arquivo só funciona quando servido a partir do domínio real de
// produção (ex: https://crm.alubox.com.br/service-worker.js), registrado a
// partir do <head> da aplicação — algo que não é possível dentro do
// artefato do Claude.ai. Está aqui pronto para o projeto de produção.
//
// Estratégia: cache do "app shell" (HTML/CSS/JS estáticos) para abrir mais
// rápido e funcionar minimamente offline; dados (API) sempre buscados da
// rede, nunca servidos do cache, para não mostrar informação de obra
// desatualizada.

const CACHE_NAME = "alubox-shell-v1";
const APP_SHELL = [
  "/",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Nunca cachear chamadas de API/dados — sempre buscar da rede.
  if (request.url.includes("/api/")) return;

  // Para navegação e assets estáticos: cache-first com fallback de rede.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
