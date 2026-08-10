"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, HardHat, Users, Wrench, ListChecks, Wallet, FileText,
  BarChart3, Settings, Plus, Search, Menu, LogOut,
} from "lucide-react";
import { useAlubox } from "./AluboxProvider";
import { can } from "@/lib/permissions";
import { AluboxSymbol } from "./AluboxSymbol";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/obras", label: "Obras", icon: HardHat },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/prestadores", label: "Prestadores", icon: Wrench },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAlubox();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const nav = [...NAV, ...((can(currentUser, "config") || can(currentUser, "catalogos")) ? [{ href: "/config", label: "Configurações", icon: Settings }] : [])];

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/buscar?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="ax-root">
      <aside className={"ax-sidebar" + (sidebarOpen ? " open" : "")}>
        <div className="ax-brand">
          <AluboxSymbol size={40} />
          <div className="ax-brand-text">
            <div className="ax-brand-name">ALUBOX</div>
            <div className="ax-brand-rule" />
            <div className="ax-brand-sub">Gestão de Obras</div>
          </div>
        </div>
        <nav className="ax-nav">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = pathname?.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={"ax-nav-item" + (active ? " active" : "")} onClick={() => setSidebarOpen(false)}>
                <Icon size={18} /><span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ax-sidebar-foot ax-sidebar-user">
          <div>
            <div className="ax-sidebar-user-name">{currentUser.nome}</div>
            <div className="ax-sidebar-user-role">{currentUser.role}</div>
          </div>
          <button className="ax-icon-btn" title="Sair" onClick={logout}><LogOut size={15} /></button>
        </div>
      </aside>

      {sidebarOpen && <div className="ax-scrim" onClick={() => setSidebarOpen(false)} />}

      <div className="ax-main">
        <header className="ax-topbar">
          <button className="ax-icon-btn only-mobile" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <form className="ax-search" onSubmit={submitSearch}>
            <Search size={16} />
            <input placeholder="Buscar obras, clientes, prestadores…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          {can(currentUser, "criar") && (
            <div className="ax-topbar-actions">
              <Link href="/obras?novo=1" className="ax-btn primary" aria-label="Nova Obra"><Plus size={16} /><span className="btn-label"> Nova Obra</span></Link>
            </div>
          )}
        </header>

        <main className="ax-content">{children}</main>
      </div>

      {can(currentUser, "criar") && (
        <nav className="ax-quickbar">
          <Link href="/obras?novo=1"><HardHat size={18} /><span>Obra</span></Link>
          <Link href="/obras?novaTarefa=1"><ListChecks size={18} /><span>Tarefa</span></Link>
          <Link href="/clientes?novo=1"><Users size={18} /><span>Cliente</span></Link>
          <Link href="/prestadores?novo=1"><Wrench size={18} /><span>Prestador</span></Link>
        </nav>
      )}
    </div>
  );
}
