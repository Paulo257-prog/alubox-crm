"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AluboxSymbol } from "@/components/alubox/AluboxSymbol";

// Duas etapas na mesma página:
// 1) Sem sessão de recuperação ativa -> formulário pedindo o e-mail, que
//    dispara o link de redefinição (Supabase envia o e-mail).
// 2) Depois que a pessoa clica no link do e-mail, o Supabase já autentica
//    uma sessão temporária aqui mesmo -> mostramos o formulário de nova
//    senha.
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [stage, setStage] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStage("update");
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(""); setMsg(""); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });
    setLoading(false);
    if (error) { setErro("Não foi possível enviar o e-mail de recuperação."); return; }
    setMsg("Se este e-mail estiver cadastrado, você vai receber um link para redefinir a senha.");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(""); setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setLoading(false);
    if (error) { setErro("Não foi possível atualizar a senha. Tente pedir um novo link."); return; }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="ax-login-screen">
      <div className="ax-login-card">
        <AluboxSymbol size={56} />
        <div className="ax-login-brand">ALUBOX</div>
        <div className="ax-login-sub">Gestão de Obras</div>

        {stage === "request" ? (
          <form onSubmit={requestReset} className="ax-login-form">
            <p className="ax-desc" style={{ marginTop: 0 }}>Informe seu e-mail para receber o link de redefinição de senha.</p>
            <label className="ax-field" style={{ width: "100%" }}>
              <span>E-mail</span>
              <input type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {erro && <div className="ax-login-error">{erro}</div>}
            {msg && <div className="ax-list-sub">{msg}</div>}
            <button className="ax-btn primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        ) : (
          <form onSubmit={updatePassword} className="ax-login-form">
            <p className="ax-desc" style={{ marginTop: 0 }}>Defina sua nova senha.</p>
            <label className="ax-field" style={{ width: "100%" }}>
              <span>Nova senha</span>
              <input type="password" required minLength={6} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
            </label>
            {erro && <div className="ax-login-error">{erro}</div>}
            <button className="ax-btn primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
