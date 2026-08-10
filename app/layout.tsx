import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/alubox/RegisterServiceWorker";

// Diferente do artefato anterior (que não conseguia registrar manifest/SW
// porque rodava num iframe sandbox), aqui o Next.js controla o <head> de
// verdade — então o PWA passa a funcionar quando o site estiver hospedado.
export const metadata: Metadata = {
  title: "ALUBOX — Gestão de Obras",
  description: "CRM e gestão de obras da Alubox Reformas",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#101418",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
