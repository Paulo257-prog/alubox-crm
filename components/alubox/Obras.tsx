"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, AlertTriangle, MapPin, Trash2 } from "lucide-react";
import { useAlubox } from "./AluboxProvider";
import { Modal, Field, Confirm } from "./ui";
import { ClienteQuickCreate } from "./Clientes";
import { can } from "@/lib/permissions";
import { fmtMoney, fmtDate, isAtrasada, pctConclusao } from "@/lib/utils";
import type { Obra } from "@/types/domain";

const STAGES = [
  { key: "ORCAMENTO", label: "Orçamento", color: "#9AA5AA" },
  { key: "PLANEJAMENTO", label: "Planejamento", color: "#3E8FA6" },
  { key: "EXECUCAO", label: "Execução", color: "#3E6E86" },
  { key: "FINALIZADO", label: "Finalizado", color: "#2F9E64" },
] as const;
const STAGE_MAP: Record<string, (typeof STAGES)[number]> = Object.fromEntries(STAGES.map((s) => [s.key, s]));

export function ObrasView() {
  const { data, currentUser, moveObraStage, deleteObra } = useAlubox();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"kanban" | "lista">("kanban");
  const [filterResp, setFilterResp] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ text: string; id: string } | null>(null);
  const [showForm, setShowForm] = useState(searchParams.get("novo") === "1");

  const clientesById = Object.fromEntries(data.clientes.map((c) => [c.id, c]));
  let obras = data.obras;
  if (filterResp) obras = obras.filter((o) => o.responsavel === filterResp);

  const handleMove = async (obraId: string, novoStatus: string) => {
    const obra = data.obras.find((o) => o.id === obraId);
    if (!obra || obra.status === novoStatus) return;
    const from = STAGE_MAP[obra.status]?.label;
    const to = STAGE_MAP[novoStatus]?.label;
    await moveObraStage(obraId, novoStatus, `Etapa alterada: ${from} → ${to}.`);
  };

  return (
    <div>
      <div className="ax-view-head">
        <h2 className="ax-h2">Obras</h2>
        <div className="ax-view-actions">
          <select className="ax-select" value={filterResp} onChange={(e) => setFilterResp(e.target.value)}>
            <option value="">Todos os responsáveis</option>
            {data.responsaveis.map((r) => <option key={r.id} value={r.nome}>{r.nome}</option>)}
          </select>
          <div className="ax-toggle">
            <button className={mode === "kanban" ? "active" : ""} onClick={() => setMode("kanban")}>KAMBA</button>
            <button className={mode === "lista" ? "active" : ""} onClick={() => setMode("lista")}>Lista</button>
          </div>
          {can(currentUser, "criar") && <button className="ax-btn primary" onClick={() => setShowForm(true)}><Plus size={16} /> Nova Obra</button>}
        </div>
      </div>

      {mode === "kanban" ? (
        <div className="ax-kanban">
          {STAGES.map((stage) => {
            const items = obras.filter((o) => o.status === stage.key);
            return (
              <div key={stage.key} className="ax-kanban-col" onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) handleMove(dragId, stage.key); setDragId(null); }}>
                <div className="ax-kanban-col-head">
                  <span className="ax-dot" style={{ background: stage.color }} />
                  <span>{stage.label}</span>
                  <span className="ax-kanban-count">{items.length}</span>
                </div>
                <div className="ax-kanban-col-body">
                  {items.map((o) => (
                    <div key={o.id} className="ax-obra-card" draggable onDragStart={() => setDragId(o.id)} onClick={() => router.push(`/obras/${o.id}`)}>
                      {isAtrasada(o) && <div className="ax-card-flag"><AlertTriangle size={12} /> Atrasada</div>}
                      <div className="ax-obra-card-title">{o.nome || "(sem nome)"}</div>
                      <div className="ax-obra-card-sub">{clientesById[o.clienteId]?.nome || "sem cliente"}</div>
                      <div className="ax-obra-card-sub"><MapPin size={12} /> {o.endereco || "—"}</div>
                      <div className="ax-obra-card-row">
                        <span>{fmtMoney(o.valorContratado || o.valorOrcamento)}</span>
                        <span>{o.responsavel}</span>
                      </div>
                      <div className="ax-progress"><div className="ax-progress-bar" style={{ width: pctConclusao(o) + "%" }} /></div>
                      <div className="ax-obra-card-row ax-list-sub">
                        <span>{fmtDate(o.dataPrevIni)} → {fmtDate(o.dataPrevFim)}</span>
                        <span>{(o.tarefas || []).filter((t) => t.status !== "Concluída").length} tarefas</span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div className="ax-empty-inline">Arraste obras para cá.</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ax-card">
          <table className="ax-table">
            <thead><tr><th>Código</th><th>Obra</th><th>Cliente</th><th>Etapa</th><th>Responsável</th><th>Prazo</th><th>Valor</th><th></th></tr></thead>
            <tbody>
              {obras.map((o) => (
                <tr key={o.id}>
                  <td data-label="Código">{o.codigo}</td>
                  <td data-label="Obra" className="ax-link" onClick={() => router.push(`/obras/${o.id}`)}>{o.nome}</td>
                  <td data-label="Cliente">{clientesById[o.clienteId]?.nome || "—"}</td>
                  <td data-label="Etapa"><span className="ax-pill" style={{ background: STAGE_MAP[o.status].color + "22", color: STAGE_MAP[o.status].color }}>{STAGE_MAP[o.status].label}</span></td>
                  <td data-label="Responsável">{o.responsavel}</td>
                  <td data-label="Prazo" className={isAtrasada(o) ? "ax-text-danger" : ""}>{fmtDate(o.dataPrevFim)}</td>
                  <td data-label="Valor">{fmtMoney(o.valorContratado || o.valorOrcamento)}</td>
                  <td>{can(currentUser, "excluir") && <button className="ax-icon-btn" onClick={() => setConfirm({ text: "Excluir esta obra e todo o seu histórico?", id: o.id })}><Trash2 size={15} /></button>}</td>
                </tr>
              ))}
              {obras.length === 0 && <tr><td colSpan={8} className="ax-empty-inline">Nenhuma obra cadastrada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <ObraForm onClose={() => setShowForm(false)} onCreated={(id) => { setShowForm(false); router.push(`/obras/${id}`); }} />}
      {confirm && (
        <Confirm text={confirm.text} onNo={() => setConfirm(null)} onYes={async () => { await deleteObra(confirm.id); setConfirm(null); }} />
      )}
    </div>
  );
}

export function ObraForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { data, createObra } = useAlubox();
  const [f, setF] = useState({
    nome: "", clienteId: "", responsavelId: "", endereco: "", cidade: "Matinhos", tipoImovel: "Apartamento",
    dataPrevIni: "", dataPrevFim: "", valorOrcamento: "", valorContratado: "", custoEstimado: "", descricao: "", observacoes: "",
  });
  const [quick, setQuick] = useState<"cliente" | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.nome.trim()) return;
    setSaving(true);
    try {
      const obra = await createObra({
        nome: f.nome,
        clienteId: f.clienteId || null,
        endereco: f.endereco,
        cidade: f.cidade,
        tipoImovel: f.tipoImovel,
        responsavelId: f.responsavelId || null,
        dataPrevIni: f.dataPrevIni || null,
        dataPrevFim: f.dataPrevFim || null,
        valorOrcamento: f.valorOrcamento ? Number(f.valorOrcamento) : null,
        valorContratado: f.valorContratado ? Number(f.valorContratado) : null,
        custoEstimado: f.custoEstimado ? Number(f.custoEstimado) : null,
        descricao: f.descricao,
        observacoes: f.observacoes,
      });
      if (obra) onCreated(obra.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nova obra" onClose={onClose} wide>
      <div className="ax-form-grid">
        <Field label="Nome da obra" span><input value={f.nome} onChange={set("nome")} placeholder="Ex: Reforma apto 302 - Ed. Atlântico" /></Field>
        <Field label="Cliente">
          <div className="ax-pick-row">
            <select value={f.clienteId} onChange={set("clienteId")}>
              <option value="">Selecionar cliente…</option>
              {data.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <button type="button" className="ax-btn ghost small" onClick={() => setQuick("cliente")}><Plus size={13} /> Novo</button>
          </div>
        </Field>
        <Field label="Responsável">
          <select value={f.responsavelId} onChange={set("responsavelId")}>
            <option value="">—</option>
            {data.responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </Field>
        <Field label="Endereço" span><input value={f.endereco} onChange={set("endereco")} /></Field>
        <Field label="Cidade">
          <select value={f.cidade} onChange={set("cidade")}><option>Matinhos</option><option>Caioba</option><option>Outra</option></select>
        </Field>
        <Field label="Tipo de imóvel">
          <select value={f.tipoImovel} onChange={set("tipoImovel")}><option>Apartamento</option><option>Casa</option><option>Comercial</option><option>Outro</option></select>
        </Field>
        <Field label="Data prevista de início"><input type="date" value={f.dataPrevIni} onChange={set("dataPrevIni")} /></Field>
        <Field label="Data prevista de término"><input type="date" value={f.dataPrevFim} onChange={set("dataPrevFim")} /></Field>
        <Field label="Valor do orçamento"><input type="number" value={f.valorOrcamento} onChange={set("valorOrcamento")} /></Field>
        <Field label="Valor contratado"><input type="number" value={f.valorContratado} onChange={set("valorContratado")} /></Field>
        <Field label="Custo estimado"><input type="number" value={f.custoEstimado} onChange={set("custoEstimado")} /></Field>
        <Field label="Descrição" span><textarea rows={2} value={f.descricao} onChange={set("descricao")} /></Field>
        <Field label="Observações" span><textarea rows={2} value={f.observacoes} onChange={set("observacoes")} /></Field>
      </div>
      <div className="ax-form-actions">
        <button className="ax-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="ax-btn primary" disabled={!f.nome || saving} onClick={submit}>{saving ? "Salvando…" : "Salvar obra"}</button>
      </div>

      {quick === "cliente" && (
        <ClienteQuickCreate
          onClose={() => setQuick(null)}
          onDone={(id) => { setF((prev) => ({ ...prev, clienteId: id })); setQuick(null); }}
        />
      )}
    </Modal>
  );
}
