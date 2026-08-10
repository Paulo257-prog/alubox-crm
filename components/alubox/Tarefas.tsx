"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useAlubox } from "./AluboxProvider";
import { fmtDate, todayISO } from "@/lib/utils";

const TASK_STATUS = ["Pendente", "Em andamento", "Concluída", "Atrasada"];
const PRIORIDADE_COLOR: Record<string, string> = { Baixa: "#8B98A0", Média: "#3E8FA6", Alta: "#D89B2A", Urgente: "#D24B4B" };

export function TarefasView() {
  const { data, upsertTarefa } = useAlubox();
  const router = useRouter();
  const [fObra, setFObra] = useState("");
  const [fStatus, setFStatus] = useState("");

  const all = data.obras.flatMap((o) => (o.tarefas || []).map((t) => ({ ...t, obraId: o.id, obraNome: o.nome, obraCodigo: o.codigo })));
  let list = all;
  if (fObra) list = list.filter((t) => t.obraId === fObra);
  if (fStatus) list = list.filter((t) => t.status === fStatus);

  const setStatus = (t: any, status: string) => upsertTarefa(t.obraId, { id: t.id, nome: t.nome, status });

  return (
    <div>
      <div className="ax-view-head">
        <h2 className="ax-h2">Tarefas</h2>
        <div className="ax-view-actions">
          <select className="ax-select" value={fObra} onChange={(e) => setFObra(e.target.value)}>
            <option value="">Todas as obras</option>
            {data.obras.map((o) => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
          </select>
          <select className="ax-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {TASK_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="ax-card">
        <table className="ax-table">
          <thead><tr><th>Tarefa</th><th>Obra</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td data-label="Tarefa">{t.nome}</td>
                <td data-label="Obra" className="ax-link" onClick={() => router.push(`/obras/${t.obraId}`)}>{t.obraCodigo}</td>
                <td data-label="Responsável">{t.responsavel}</td>
                <td data-label="Prazo" className={t.status !== "Concluída" && t.dataFim && t.dataFim < todayISO() ? "ax-text-danger" : ""}>{fmtDate(t.dataFim)}</td>
                <td data-label="Prioridade"><span className="ax-pill" style={{ background: PRIORIDADE_COLOR[t.prioridade] + "22", color: PRIORIDADE_COLOR[t.prioridade] }}>{t.prioridade}</span></td>
                <td data-label="Status">
                  <select className="ax-select small" value={t.status} onChange={(e) => setStatus(t, e.target.value)}>{TASK_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                </td>
                <td>{t.status !== "Concluída" && <button className="ax-icon-btn ax-check-quick" title="Concluir com um toque" onClick={() => setStatus(t, "Concluída")}><Check size={16} /></button>}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="ax-empty-inline">Nenhuma tarefa encontrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
