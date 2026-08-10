"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AluboxSymbol } from "@/components/alubox/AluboxSymbol";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setLoading(false);
    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="ax-login-screen">
      <div className="ax-login-card">
        <AluboxSymbol size={56} />
        <div className="ax-login-brand">ALUBOX</div>
        <div className="ax-login-sub">Gestão de Obras</div>
        <form onSubmit={submit} className="ax-login-form">
          <label className="ax-field" style={{ width: "100%" }}>
            <span>E-mail</span>
            <input type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="ax-field" style={{ width: "100%" }}>
            <span>Senha</span>
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          {erro && <div className="ax-login-error">{erro}</div>}
          <button className="ax-btn primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <Link href="/reset-password" className="ax-link-plain ax-login-forgot">Esqueci minha senha</Link>
      </div>
    </div>
  );
}
