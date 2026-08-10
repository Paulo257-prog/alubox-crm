"use client";

import { useRouter } from "next/navigation";
import { Wallet, TrendingUp, CircleDollarSign, BarChart3, AlertCircle } from "lucide-react";
import { useAlubox } from "./AluboxProvider";
import { StatCard } from "./ui";
import { fmtMoney, fmtDate } from "@/lib/utils";

export function FinanceiroView() {
  const { data } = useAlubox();
  const router = useRouter();

  const allLanc = data.obras.flatMap((o) => (o.financeiro || []).map((l) => ({ ...l, obraNome: o.nome, obraCodigo: o.codigo, obraId: o.id })));
  const receita = allLanc.filter((l) => l.tipo === "receita").reduce((a, l) => a + Number(l.valor || 0), 0);
  const custo = allLanc.filter((l) => l.tipo === "despesa").reduce((a, l) => a + Number(l.valor || 0), 0);
  const lucro = receita - custo;
  const margem = receita > 0 ? ((lucro / receita) * 100).toFixed(1) : "0.0";
  const contratado = data.obras.reduce((s, o) => s + (Number(o.valorContratado) || 0), 0);
  const aReceber = Math.max(contratado - receita, 0);

  return (
    <div>
      <h2 className="ax-h2">Financeiro</h2>
      <div className="ax-stat-grid">
        <StatCard icon={<Wallet size={18} />} label="Receita" value={fmtMoney(receita)} tone="ok" />
        <StatCard icon={<TrendingUp size={18} />} label="Custo" value={fmtMoney(custo)} />
        <StatCard icon={<CircleDollarSign size={18} />} label="Lucro bruto" value={fmtMoney(lucro)} />
        <StatCard icon={<BarChart3 size={18} />} label="Margem" value={margem + "%"} />
        <StatCard icon={<AlertCircle size={18} />} label="Contas a receber" value={fmtMoney(aReceber)} tone="warning" />
      </div>
      <div className="ax-card" style={{ marginTop: 16 }}>
        <div className="ax-card-title">Todos os lançamentos</div>
        <table className="ax-table">
          <thead><tr><th>Data</th><th>Obra</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead>
          <tbody>
            {allLanc.sort((a, b) => (b.data || "").localeCompare(a.data || "")).map((l) => (
              <tr key={l.id}>
                <td data-label="Data">{fmtDate(l.data)}</td>
                <td data-label="Obra" className="ax-link" onClick={() => router.push(`/obras/${l.obraId}`)}>{l.obraCodigo}</td>
                <td data-label="Tipo"><span className={"ax-pill " + (l.tipo === "receita" ? "ok" : "danger")}>{l.tipo === "receita" ? "Receita" : "Despesa"}</span></td>
                <td data-label="Descrição">{l.descricao}</td><td data-label="Valor">{fmtMoney(l.valor)}</td>
              </tr>
            ))}
            {allLanc.length === 0 && <tr><td colSpan={5} className="ax-empty-inline">Nenhum lançamento registrado ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
