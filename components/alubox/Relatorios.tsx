"use client";

import { useState } from "react";
import { useAlubox } from "./AluboxProvider";
import { fmtMoney, fmtDate, isAtrasada, csvDownload } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

const STAGE_LABEL: Record<string, string> = { ORCAMENTO: "Orçamento", PLANEJAMENTO: "Planejamento", EXECUCAO: "Execução", FINALIZADO: "Finalizado" };
const STAGE_COLOR: Record<string, string> = { ORCAMENTO: "#9AA5AA", PLANEJAMENTO: "#3E8FA6", EXECUCAO: "#3E6E86", FINALIZADO: "#2F9E64" };

const TIPOS = [
  ["etapa", "Obras por etapa"],
  ["periodo", "Obras por período"],
  ["finalizadas", "Obras finalizadas"],
  ["atrasadas", "Obras atrasadas"],
  ["faturamento", "Faturamento"],
  ["prestadores", "Prestadores mais utilizados"],
  ["clientes", "Clientes"],
] as const;

export function RelatoriosView() {
  const { data } = useAlubox();
  const [tipo, setTipo] = useState<(typeof TIPOS)[number][0]>("etapa");
  const [filtroCliente, setFiltroCliente] = useState("");

  const relevantesPorCliente = ["periodo", "finalizadas", "atrasadas"].includes(tipo);
  let obras = data.obras;
  if (relevantesPorCliente && filtroCliente) obras = obras.filter((o) => o.clienteId === filtroCliente);

  const finalizadas = obras.filter((o) => o.status === "FINALIZADO");
  const atrasadas = obras.filter(isAtrasada);

  const porEtapa = Object.keys(STAGE_LABEL).map((key) => ({ name: STAGE_LABEL[key], value: data.obras.filter((o) => o.status === key).length, color: STAGE_COLOR[key] }));

  const faturamentoMensal: Record<string, number> = {};
  data.obras.forEach((o) => (o.financeiro || []).filter((f) => f.tipo === "receita").forEach((f) => {
    const mes = (f.data || "").slice(0, 7);
    if (!mes) return;
    faturamentoMensal[mes] = (faturamentoMensal[mes] || 0) + Number(f.valor || 0);
  }));
  const faturamentoData = Object.entries(faturamentoMensal).map(([mes, valor]) => ({ mes, valor })).sort((a, b) => a.mes.localeCompare(b.mes));

  const usoPrestadores: Record<string, number> = {};
  data.obras.forEach((o) => (o.prestadoresIds || []).forEach((id) => { usoPrestadores[id] = (usoPrestadores[id] || 0) + 1; }));
  const prestadoresMaisUsados = Object.entries(usoPrestadores)
    .map(([id, count]) => ({ name: data.prestadores.find((p) => p.id === id)?.nome || "—", value: count }))
    .sort((a, b) => b.value - a.value).slice(0, 8);

  const clientesRank = data.clientes
    .map((c) => ({ name: c.nome, obras: data.obras.filter((o) => o.clienteId === c.id).length, total: data.obras.filter((o) => o.clienteId === c.id).reduce((s, o) => s + (Number(o.valorContratado) || 0), 0) }))
    .sort((a, b) => b.total - a.total);

  const exportCurrent = () => {
    if (tipo === "atrasadas") csvDownload("obras-atrasadas.csv", [["Código", "Obra", "Prazo previsto"], ...atrasadas.map((o) => [o.codigo, o.nome, o.dataPrevFim])]);
    else if (tipo === "finalizadas") csvDownload("obras-finalizadas.csv", [["Código", "Obra", "Data término"], ...finalizadas.map((o) => [o.codigo, o.nome, o.dataRealFim])]);
    else if (tipo === "periodo") csvDownload("obras-periodo.csv", [["Obra", "Cadastro", "Início previsto", "Término previsto"], ...obras.map((o) => [o.nome, o.dataCadastro, o.dataPrevIni, o.dataPrevFim])]);
    else if (tipo === "faturamento") csvDownload("faturamento.csv", [["Mês", "Valor"], ...faturamentoData.map((f) => [f.mes, f.valor])]);
    else if (tipo === "prestadores") csvDownload("prestadores-mais-usados.csv", [["Prestador", "Obras"], ...prestadoresMaisUsados.map((p) => [p.name, p.value])]);
    else if (tipo === "clientes") csvDownload("clientes.csv", [["Cliente", "Obras", "Total contratado"], ...clientesRank.map((c) => [c.name, c.obras, c.total])]);
    else csvDownload("obras.csv", [["Código", "Obra", "Etapa", "Responsável", "Valor"], ...data.obras.map((o) => [o.codigo, o.nome, STAGE_LABEL[o.status], o.responsavel, o.valorContratado])]);
  };

  return (
    <div>
      <div className="ax-view-head">
        <h2 className="ax-h2">Relatórios</h2>
        <div className="ax-view-actions">
          <select className="ax-select" value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
            {TIPOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {relevantesPorCliente && (
            <select className="ax-select" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
              <option value="">Todos os clientes</option>
              {data.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
          <button className="ax-btn ghost" onClick={exportCurrent}>Exportar CSV</button>
        </div>
      </div>

      {tipo === "etapa" && (
        <div className="ax-card">
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={porEtapa} dataKey="value" nameKey="name" outerRadius={110} label>
                  {porEtapa.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tipo === "periodo" && (
        <div className="ax-card">
          <table className="ax-table">
            <thead><tr><th>Obra</th><th>Cadastro</th><th>Início previsto</th><th>Término previsto</th></tr></thead>
            <tbody>
              {obras.map((o) => <tr key={o.id}><td data-label="Obra">{o.nome}</td><td data-label="Cadastro">{fmtDate(o.dataCadastro)}</td><td data-label="Início previsto">{fmtDate(o.dataPrevIni)}</td><td data-label="Término previsto">{fmtDate(o.dataPrevFim)}</td></tr>)}
              {obras.length === 0 && <tr><td colSpan={4} className="ax-empty-inline">Nenhuma obra cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tipo === "finalizadas" && (
        <div className="ax-card">
          <table className="ax-table">
            <thead><tr><th>Código</th><th>Obra</th><th>Término real</th><th>Valor</th></tr></thead>
            <tbody>
              {finalizadas.map((o) => <tr key={o.id}><td data-label="Código">{o.codigo}</td><td data-label="Obra">{o.nome}</td><td data-label="Término real">{fmtDate(o.dataRealFim)}</td><td data-label="Valor">{fmtMoney(o.valorContratado)}</td></tr>)}
              {finalizadas.length === 0 && <tr><td colSpan={4} className="ax-empty-inline">Nenhuma obra finalizada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tipo === "atrasadas" && (
        <div className="ax-card">
          <table className="ax-table">
            <thead><tr><th>Código</th><th>Obra</th><th>Prazo previsto</th><th>Responsável</th></tr></thead>
            <tbody>
              {atrasadas.map((o) => <tr key={o.id}><td data-label="Código">{o.codigo}</td><td data-label="Obra">{o.nome}</td><td data-label="Prazo previsto" className="ax-text-danger">{fmtDate(o.dataPrevFim)}</td><td data-label="Responsável">{o.responsavel}</td></tr>)}
              {atrasadas.length === 0 && <tr><td colSpan={4} className="ax-empty-inline">Nenhuma obra atrasada.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tipo === "faturamento" && (
        <div className="ax-card">
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={faturamentoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E6E8" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => fmtMoney(v)} />
                <Bar dataKey="valor" fill="#3E6E86" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {faturamentoData.length === 0 && <div className="ax-empty-inline">Nenhum recebimento registrado ainda.</div>}
        </div>
      )}

      {tipo === "prestadores" && (
        <div className="ax-card">
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={prestadoresMaisUsados} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E6E8" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3E8FA6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {prestadoresMaisUsados.length === 0 && <div className="ax-empty-inline">Nenhum prestador vinculado a obras ainda.</div>}
        </div>
      )}

      {tipo === "clientes" && (
        <div className="ax-card">
          <table className="ax-table">
            <thead><tr><th>Cliente</th><th>Obras</th><th>Total contratado</th></tr></thead>
            <tbody>
              {clientesRank.map((c) => <tr key={c.name}><td data-label="Cliente">{c.name}</td><td data-label="Obras">{c.obras}</td><td data-label="Total contratado">{fmtMoney(c.total)}</td></tr>)}
              {clientesRank.length === 0 && <tr><td colSpan={3} className="ax-empty-inline">Nenhum cliente cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
