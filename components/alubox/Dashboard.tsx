"use client";

import Link from "next/link";
import {
  HardHat, Clock, Building2, Wrench, CheckCircle2, AlertTriangle, CircleDollarSign,
  Wallet, AlertCircle, TrendingUp, BarChart3, ListChecks,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useAlubox } from "./AluboxProvider";
import { StatCard } from "./ui";
import { fmtMoney, fmtDate, isAtrasada } from "@/lib/utils";

const STAGES = [
  { key: "ORCAMENTO", label: "Orçamento", color: "#9AA5AA" },
  { key: "PLANEJAMENTO", label: "Planejamento", color: "#3E8FA6" },
  { key: "EXECUCAO", label: "Execução", color: "#3E6E86" },
  { key: "FINALIZADO", label: "Finalizado", color: "#2F9E64" },
];

export function Dashboard() {
  const { data } = useAlubox();
  const obras = data.obras;

  const emAndamento = obras.filter((o) => o.status === "EXECUCAO" || o.status === "PLANEJAMENTO").length;
  const atrasadas = obras.filter(isAtrasada);
  const tarefasPendentes = obras.flatMap((o) => (o.tarefas || []).filter((t) => t.status !== "Concluída").map((t) => ({ ...t, obraNome: o.nome, obraId: o.id })));
  const tarefasHoje = tarefasPendentes.filter((t) => t.dataFim === new Date().toISOString().slice(0, 10));
  const proxVencimentos = [...tarefasPendentes].filter((t) => t.dataFim).sort((a, b) => a.dataFim.localeCompare(b.dataFim)).slice(0, 6);

  const totalContratado = obras.reduce((s, o) => s + (Number(o.valorContratado) || 0), 0);
  const totalRecebido = obras.reduce((s, o) => s + (o.financeiro || []).filter((f) => f.tipo === "receita").reduce((a, f) => a + Number(f.valor || 0), 0), 0);
  const totalPendente = Math.max(totalContratado - totalRecebido, 0);
  const totalCusto = obras.reduce((s, o) => s + (o.financeiro || []).filter((f) => f.tipo === "despesa").reduce((a, f) => a + Number(f.valor || 0), 0), 0);
  const margem = totalContratado > 0 ? (((totalContratado - totalCusto) / totalContratado) * 100).toFixed(1) : "0.0";

  const chartData = STAGES.map((s) => ({ name: s.label, value: obras.filter((o) => o.status === s.key).length, color: s.color }));

  return (
    <div>
      {/* Seção "Prioridades de hoje" — pensada para abrir primeiro no
          celular, mas útil em qualquer tamanho de tela. */}
      <h2 className="ax-h2">Prioridades de hoje</h2>
      <div className="ax-stat-grid">
        <StatCard icon={<Wrench size={18} />} label="Obras em andamento" value={emAndamento} />
        <StatCard icon={<AlertTriangle size={18} />} label="Obras atrasadas" value={atrasadas.length} tone={atrasadas.length ? "danger" : "default"} />
        <StatCard icon={<ListChecks size={18} />} label="Tarefas para hoje" value={tarefasHoje.length} />
        <StatCard icon={<Clock size={18} />} label="Próximos prazos" value={proxVencimentos.length} />
        <StatCard icon={<AlertCircle size={18} />} label="Valor em aberto" value={fmtMoney(totalPendente)} tone="warning" />
      </div>

      <h2 className="ax-h2" style={{ marginTop: 22 }}>Visão geral</h2>
      <div className="ax-stat-grid">
        <StatCard icon={<HardHat size={18} />} label="Total de obras" value={obras.length} />
        <StatCard icon={<Clock size={18} />} label="Em orçamento" value={obras.filter((o) => o.status === "ORCAMENTO").length} />
        <StatCard icon={<Building2 size={18} />} label="Em planejamento" value={obras.filter((o) => o.status === "PLANEJAMENTO").length} />
        <StatCard icon={<Wrench size={18} />} label="Em execução" value={obras.filter((o) => o.status === "EXECUCAO").length} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Finalizadas" value={obras.filter((o) => o.status === "FINALIZADO").length} tone="ok" />
        <StatCard icon={<CircleDollarSign size={18} />} label="Valor contratado" value={fmtMoney(totalContratado)} />
        <StatCard icon={<Wallet size={18} />} label="Valor recebido" value={fmtMoney(totalRecebido)} tone="ok" />
        <StatCard icon={<TrendingUp size={18} />} label="Custo das obras" value={fmtMoney(totalCusto)} />
        <StatCard icon={<BarChart3 size={18} />} label="Margem estimada" value={`${margem}%`} />
      </div>

      <div className="ax-grid-2">
        <div className="ax-card">
          <div className="ax-card-title">Obras por etapa</div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E6E8" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#667079" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#667079" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E3E6E8" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ax-card">
          <div className="ax-card-title">Obras atrasadas</div>
          {atrasadas.length === 0 ? <div className="ax-empty-inline">Nenhuma obra atrasada. 🎉</div> : (
            <div className="ax-list">
              {atrasadas.map((o) => (
                <Link key={o.id} href={`/obras/${o.id}`} className="ax-list-row">
                  <span>{o.codigo} — {o.nome}</span>
                  <span className="ax-list-sub">prazo {fmtDate(o.dataPrevFim)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ax-card" style={{ marginTop: 16 }}>
        <div className="ax-card-title">Próximos vencimentos de tarefas</div>
        {proxVencimentos.length === 0 ? <div className="ax-empty-inline">Nenhuma tarefa com prazo definido.</div> : (
          <div className="ax-list">
            {proxVencimentos.map((t) => (
              <Link key={t.id} href={`/obras/${t.obraId}`} className="ax-list-row">
                <span>{t.nome} <span className="ax-list-sub">· {t.obraNome}</span></span>
                <span className="ax-list-sub">{fmtDate(t.dataFim)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
