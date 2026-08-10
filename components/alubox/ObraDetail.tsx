"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Trash2, Pencil, Plus, AlertTriangle, Camera, Paperclip, Check,
} from "lucide-react";
import { useAlubox } from "./AluboxProvider";
import { Modal, Field, Confirm, QuickAddModal, StatCard } from "./ui";
import { PrestadorQuickCreate } from "./Prestadores";
import { FornecedorQuickCreate, MaterialCatalogoQuickCreate } from "./Catalogos";
import { can } from "@/lib/permissions";
import { fmtMoney, fmtDate, isAtrasada, pctConclusao } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import * as FotosSvc from "@/services/fotos";
import * as DocumentosSvc from "@/services/documentos";

const STAGES = [
  { key: "ORCAMENTO", label: "Orçamento", color: "#9AA5AA" },
  { key: "PLANEJAMENTO", label: "Planejamento", color: "#3E8FA6" },
  { key: "EXECUCAO", label: "Execução", color: "#3E6E86" },
  { key: "FINALIZADO", label: "Finalizado", color: "#2F9E64" },
] as const;
const STAGE_MAP: Record<string, (typeof STAGES)[number]> = Object.fromEntries(STAGES.map((s) => [s.key, s]));
const TASK_STATUS = ["Pendente", "Em andamento", "Concluída", "Atrasada"];
const PRIORIDADES = ["Baixa", "Média", "Alta", "Urgente"];
const PRIORIDADE_COLOR: Record<string, string> = { Baixa: "#8B98A0", Média: "#3E8FA6", Alta: "#D89B2A", Urgente: "#D24B4B" };
const CATEGORIAS_FOTO = ["Antes", "Durante", "Depois"] as const;

export function ObraDetail({ obraId }: { obraId: string }) {
  const { data, currentUser, moveObraStage, deleteObra } = useAlubox();
  const router = useRouter();
  const searchParams = useSearchParams();
  const obra = data.obras.find((o) => o.id === obraId);
  const [tab, setTab] = useState(searchParams.get("tab") === "cronograma" ? "cronograma" : "resumo");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!obra) return <div className="ax-empty-inline">Obra não encontrada (ou você não tem permissão para vê-la).</div>;

  const cliente = data.clientes.find((c) => c.id === obra.clienteId);
  const tabs: [string, string][] = [
    ["resumo", "Resumo"], ["cronograma", "Cronograma"], ["prestadores", "Prestadores"],
    ["materiais", "Materiais"], ["financeiro", "Financeiro"], ["fotos", "Fotos"],
    ["documentos", "Documentos"], ["historico", "Histórico"],
  ];

  const recebido = (obra.financeiro || []).filter((f) => f.tipo === "receita").reduce((a, f) => a + Number(f.valor || 0), 0);
  const gasto = (obra.financeiro || []).filter((f) => f.tipo === "despesa").reduce((a, f) => a + Number(f.valor || 0), 0);
  const pendente = Math.max((Number(obra.valorContratado) || 0) - recebido, 0);

  return (
    <div>
      <button className="ax-back" onClick={() => router.push("/obras")}><ArrowLeft size={16} /> Voltar para obras</button>
      <div className="ax-detail-head">
        <div>
          <div className="ax-eyebrow">{obra.codigo}</div>
          <h2 className="ax-h2" style={{ margin: "2px 0" }}>{obra.nome}</h2>
          <div className="ax-list-sub">{cliente?.nome || "sem cliente"} · {obra.endereco} · {obra.cidade}</div>
        </div>
        <div className="ax-detail-head-actions">
          <span className="ax-pill" style={{ background: STAGE_MAP[obra.status].color + "22", color: STAGE_MAP[obra.status].color }}>{STAGE_MAP[obra.status].label}</span>
          <select className="ax-select" value={obra.status} disabled={!can(currentUser, "editar")} onChange={(e) => {
            const from = STAGE_MAP[obra.status].label, to = STAGE_MAP[e.target.value].label;
            moveObraStage(obra.id, e.target.value, `Etapa alterada: ${from} → ${to}.`);
          }}>
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          {can(currentUser, "excluir") && <button className="ax-icon-btn" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /></button>}
        </div>
      </div>

      {isAtrasada(obra) && <div className="ax-banner-danger"><AlertTriangle size={15} /> Esta obra está atrasada — prazo previsto {fmtDate(obra.dataPrevFim)}.</div>}

      <div className="ax-tabs">
        {tabs.map(([k, l]) => <button key={k} className={"ax-tab" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "resumo" && <ResumoTab obra={obra} cliente={cliente} recebido={recebido} gasto={gasto} pendente={pendente} />}
      {tab === "cronograma" && <CronogramaTab obra={obra} autoOpen={searchParams.get("novaTarefa") === "1"} />}
      {tab === "prestadores" && <PrestadoresTab obra={obra} />}
      {tab === "materiais" && <MateriaisTab obra={obra} />}
      {tab === "financeiro" && <FinanceiroTab obra={obra} recebido={recebido} gasto={gasto} pendente={pendente} />}
      {tab === "fotos" && <FotosTab obra={obra} />}
      {tab === "documentos" && <DocumentosTab obra={obra} />}
      {tab === "historico" && <HistoricoTab obra={obra} />}

      {confirmDelete && (
        <Confirm text="Excluir esta obra e todo o seu histórico?" onNo={() => setConfirmDelete(false)}
          onYes={async () => { await deleteObra(obra.id); router.push("/obras"); }} />
      )}
    </div>
  );
}

function ResumoTab({ obra, cliente, recebido, gasto, pendente }: any) {
  const { currentUser, updateObra } = useAlubox();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ valorContratado: obra.valorContratado, custoEstimado: obra.custoEstimado, dataPrevIni: obra.dataPrevIni, dataPrevFim: obra.dataPrevFim });
  const margemEst = obra.valorContratado ? (((Number(obra.valorContratado) - (Number(obra.custoEstimado) || 0)) / Number(obra.valorContratado)) * 100).toFixed(1) : "—";
  const margemReal = obra.valorContratado ? (((Number(obra.valorContratado) - gasto) / Number(obra.valorContratado)) * 100).toFixed(1) : "—";

  return (
    <div className="ax-grid-2">
      <div className="ax-card">
        <div className="ax-card-title">Dados da obra</div>
        <div className="ax-kv"><span>Responsável</span><b>{obra.responsavel}</b></div>
        <div className="ax-kv"><span>Cliente</span><b>{cliente?.nome || "—"}</b></div>
        <div className="ax-kv"><span>Tipo de imóvel</span><b>{obra.tipoImovel}</b></div>
        <div className="ax-kv"><span>Prazo previsto</span><b>{fmtDate(obra.dataPrevIni)} → {fmtDate(obra.dataPrevFim)}</b></div>
        <div className="ax-kv"><span>Prazo real</span><b>{fmtDate(obra.dataRealIni)} → {fmtDate(obra.dataRealFim)}</b></div>
        <div className="ax-kv"><span>Conclusão</span><b>{pctConclusao(obra)}%</b></div>
        <div className="ax-progress" style={{ marginTop: 4 }}><div className="ax-progress-bar" style={{ width: pctConclusao(obra) + "%" }} /></div>
        <div className="ax-kv" style={{ marginTop: 10 }}><span>Pendências</span><b>{(obra.tarefas || []).filter((t: any) => t.status !== "Concluída").length} tarefas em aberto</b></div>
        {obra.descricao && <p className="ax-desc">{obra.descricao}</p>}
      </div>
      <div className="ax-card">
        <div className="ax-card-title">Financeiro resumido</div>
        <div className="ax-kv"><span>Valor contratado</span><b>{fmtMoney(obra.valorContratado)}</b></div>
        <div className="ax-kv"><span>Recebido</span><b className="ax-text-ok">{fmtMoney(recebido)}</b></div>
        <div className="ax-kv"><span>Pendente</span><b className="ax-text-warning">{fmtMoney(pendente)}</b></div>
        <div className="ax-kv"><span>Custo realizado</span><b>{fmtMoney(gasto)}</b></div>
        <div className="ax-kv"><span>Margem estimada</span><b>{margemEst}%</b></div>
        <div className="ax-kv"><span>Margem realizada</span><b>{margemReal}%</b></div>
        {can(currentUser, "editar") && (
          <div style={{ marginTop: 12 }}>
            {!editing ? (
              <button className="ax-btn ghost small" onClick={() => setEditing(true)}><Pencil size={14} /> Editar valores e prazos</button>
            ) : (
              <div className="ax-inline-edit">
                <Field label="Valor contratado"><input type="number" value={f.valorContratado} onChange={(e) => setF({ ...f, valorContratado: e.target.value })} /></Field>
                <Field label="Custo estimado"><input type="number" value={f.custoEstimado} onChange={(e) => setF({ ...f, custoEstimado: e.target.value })} /></Field>
                <Field label="Data prevista de início"><input type="date" value={f.dataPrevIni} onChange={(e) => setF({ ...f, dataPrevIni: e.target.value })} /></Field>
                <Field label="Data prevista de término"><input type="date" value={f.dataPrevFim} onChange={(e) => setF({ ...f, dataPrevFim: e.target.value })} /></Field>
                <div className="ax-form-actions">
                  <button className="ax-btn ghost small" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="ax-btn primary small" onClick={async () => {
                    await updateObra(obra.id, { valor_contratado: f.valorContratado || null, custo_estimado: f.custoEstimado || null, data_prev_inicio: f.dataPrevIni || null, data_prev_termino: f.dataPrevFim || null });
                    setEditing(false);
                  }}>Salvar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CronogramaTab({ obra, autoOpen }: { obra: any; autoOpen?: boolean }) {
  const { data, currentUser, upsertTarefa, deleteTarefa } = useAlubox();
  const [form, setForm] = useState<any>(autoOpen ? { nome: "", responsavelId: "", prestadorId: "", dataIni: "", dataFim: "", status: "Pendente", prioridade: "Média", valor: "", observacoes: "" } : null);
  const [quick, setQuick] = useState<"prestador" | "servico" | null>(null);
  const tarefas = obra.tarefas || [];
  const podeEditar = can(currentUser, "editar");

  const save = async () => {
    await upsertTarefa(obra.id, {
      id: form.id, nome: form.nome, responsavel_id: form.responsavelId || null, prestador_id: form.prestadorId || null,
      data_inicio: form.dataIni || null, data_termino: form.dataFim || null, status: form.status, prioridade: form.prioridade,
      valor: form.valor || null, observacoes: form.observacoes,
    });
    setForm(null);
  };
  const setStatus = async (t: any, status: string) => upsertTarefa(obra.id, { id: t.id, nome: t.nome, status });

  return (
    <div className="ax-card">
      <div className="ax-card-title-row">
        <div className="ax-card-title">Cronograma da obra</div>
        {podeEditar && <button className="ax-btn primary small" onClick={() => setForm({ nome: "", responsavelId: "", prestadorId: "", dataIni: "", dataFim: "", status: "Pendente", prioridade: "Média", valor: "", observacoes: "" })}><Plus size={14} /> Nova etapa/tarefa</button>}
      </div>
      <div className="ax-list">
        {tarefas.map((t: any) => (
          <div key={t.id} className="ax-task-row">
            <div>
              <div className="ax-task-name">{t.nome}</div>
              <div className="ax-list-sub">{t.responsavel}{t.prestadorId ? " · " + (data.prestadores.find((p) => p.id === t.prestadorId)?.nome || "") : ""} · {fmtDate(t.dataIni)} → {fmtDate(t.dataFim)}</div>
            </div>
            <span className="ax-pill" style={{ background: PRIORIDADE_COLOR[t.prioridade] + "22", color: PRIORIDADE_COLOR[t.prioridade] }}>{t.prioridade}</span>
            {t.status !== "Concluída" && podeEditar && (
              <button className="ax-icon-btn ax-check-quick" title="Concluir com um toque" onClick={() => setStatus(t, "Concluída")}><Check size={16} /></button>
            )}
            <select className="ax-select small" value={t.status} disabled={!podeEditar} onChange={(e) => setStatus(t, e.target.value)}>
              {TASK_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {podeEditar && <button className="ax-icon-btn" onClick={() => setForm({ ...t, responsavelId: t.responsavelId })}><Pencil size={14} /></button>}
            {podeEditar && <button className="ax-icon-btn" onClick={() => deleteTarefa(t.id)}><Trash2 size={14} /></button>}
          </div>
        ))}
        {tarefas.length === 0 && <div className="ax-empty-inline">Nenhuma tarefa cadastrada. Ex: Demolição, Elétrica, Hidráulica, Pintura…</div>}
      </div>

      {form && (
        <Modal title="Tarefa / etapa" onClose={() => setForm(null)}>
          <div className="ax-form-grid">
            <Field label="Nome" span><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Elétrica" /></Field>
            <Field label="Responsável">
              <select value={form.responsavelId} onChange={(e) => setForm({ ...form, responsavelId: e.target.value })}>
                <option value="">—</option>
                {data.responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </Field>
            <Field label="Prestador">
              <div className="ax-pick-row">
                <select value={form.prestadorId} onChange={(e) => setForm({ ...form, prestadorId: e.target.value })}>
                  <option value="">—</option>
                  {data.prestadores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <button type="button" className="ax-btn ghost small" onClick={() => setQuick("prestador")}><Plus size={13} /> Novo</button>
              </div>
            </Field>
            <Field label="Início"><input type="date" value={form.dataIni} onChange={(e) => setForm({ ...form, dataIni: e.target.value })} /></Field>
            <Field label="Término"><input type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} /></Field>
            <Field label="Prioridade">
              <select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>{PRIORIDADES.map((p) => <option key={p}>{p}</option>)}</select>
            </Field>
            <Field label="Valor"><input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></Field>
            <Field label="Observações" span><textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Field>
          </div>
          <div className="ax-form-actions">
            <button className="ax-btn ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="ax-btn primary" disabled={!form.nome} onClick={save}>Salvar</button>
          </div>
          {quick === "prestador" && (
            <PrestadorQuickCreate onClose={() => setQuick(null)} onDone={(id) => { setForm((prev: any) => ({ ...prev, prestadorId: id })); setQuick(null); }} />
          )}
        </Modal>
      )}
    </div>
  );
}

function PrestadoresTab({ obra }: { obra: any }) {
  const { data, currentUser, vincularPrestador, desvincularPrestador } = useAlubox();
  const [adding, setAdding] = useState(false);
  const [quick, setQuick] = useState(false);
  const linked = data.prestadores.filter((p) => (obra.prestadoresIds || []).includes(p.id));
  const podeEditar = can(currentUser, "editar");

  return (
    <div className="ax-card">
      <div className="ax-card-title-row">
        <div className="ax-card-title">Prestadores vinculados</div>
        {podeEditar && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ax-btn ghost small" onClick={() => setQuick(true)}><Plus size={14} /> Novo prestador</button>
            <button className="ax-btn primary small" onClick={() => setAdding(!adding)}><Plus size={14} /> {adding ? "Fechar" : "Vincular prestador"}</button>
          </div>
        )}
      </div>
      {adding && (
        <div className="ax-checklist">
          {data.prestadores.map((p) => {
            const checked = (obra.prestadoresIds || []).includes(p.id);
            return (
              <label key={p.id} className="ax-check-row">
                <input type="checkbox" checked={checked} onChange={() => (checked ? desvincularPrestador(obra.id, p.id) : vincularPrestador(obra.id, p.id))} />
                <span>{p.nome}</span><span className="ax-list-sub">{p.especialidade}</span>
              </label>
            );
          })}
        </div>
      )}
      <div className="ax-list" style={{ marginTop: 8 }}>
        {linked.map((p) => (
          <div key={p.id} className="ax-list-row" style={{ cursor: "default" }}>
            <span>{p.nome}</span><span className="ax-list-sub">{p.especialidade}</span><span className="ax-list-sub">{p.telefone}</span>
          </div>
        ))}
        {linked.length === 0 && <div className="ax-empty-inline">Nenhum prestador vinculado a esta obra ainda.</div>}
      </div>
      {quick && <PrestadorQuickCreate onClose={() => setQuick(false)} onDone={(id) => { vincularPrestador(obra.id, id); setQuick(false); }} />}
    </div>
  );
}

function MateriaisTab({ obra }: { obra: any }) {
  const { data, currentUser, upsertMaterial, deleteMaterial, addCategoriaMaterial, resolveCategoriaMaterialId } = useAlubox();
  const [form, setForm] = useState<any>(null);
  const [quick, setQuick] = useState<"material" | "categoria" | "fornecedor" | null>(null);
  const [saving, setSaving] = useState(false);
  const podeEditar = can(currentUser, "editar");
  const materiais = obra.materiais || [];

  const escolherMaterial = (m: { id: string; nome: string; categoria: string; unidade: string }) => {
    setForm((prev: any) => ({ ...prev, materialCatalogoId: m.id, material: m.nome, categoria: prev.categoria || m.categoria, unidade: m.unidade || prev.unidade }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const categoriaId = form.categoria ? await resolveCategoriaMaterialId(form.categoria) : null;
      await upsertMaterial(obra.id, {
        id: form.id, nome: form.material, material_catalogo_id: form.materialCatalogoId || null, categoria_id: categoriaId,
        quantidade: form.quantidade || null, unidade: form.unidade, fornecedor_id: form.fornecedorId || null,
        valor_previsto: form.valorPrevisto || null, valor_comprado: form.valorComprado || null,
        data_compra: form.dataCompra || null, status: form.status,
      });
      setForm(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ax-card">
      <div className="ax-card-title-row">
        <div className="ax-card-title">Materiais</div>
        {podeEditar && <button className="ax-btn primary small" onClick={() => setForm({ material: "", materialCatalogoId: null, categoria: "", quantidade: "", unidade: "un", fornecedorId: null, fornecedorNome: "", valorPrevisto: "", valorComprado: "", dataCompra: "", status: "Previsto" })}><Plus size={14} /> Novo material</button>}
      </div>
      <table className="ax-table">
        <thead><tr><th>Material</th><th>Categoria</th><th>Qtd</th><th>Fornecedor</th><th>Previsto</th><th>Comprado</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {materiais.map((m: any) => (
            <tr key={m.id}>
              <td data-label="Material">{m.material}</td><td data-label="Categoria">{m.categoria}</td><td data-label="Qtd">{m.quantidade} {m.unidade}</td><td data-label="Fornecedor">{m.fornecedor}</td>
              <td data-label="Previsto">{fmtMoney(m.valorPrevisto)}</td><td data-label="Comprado">{fmtMoney(m.valorComprado)}</td><td data-label="Status">{m.status}</td>
              <td>{podeEditar && <><button className="ax-icon-btn" onClick={() => setForm({ ...m, fornecedorId: m.fornecedorId, materialCatalogoId: m.materialCatalogoId })}><Pencil size={14} /></button><button className="ax-icon-btn" onClick={() => deleteMaterial(m.id)}><Trash2 size={14} /></button></>}</td>
            </tr>
          ))}
          {materiais.length === 0 && <tr><td colSpan={8} className="ax-empty-inline">Nenhum material cadastrado.</td></tr>}
        </tbody>
      </table>
      {form && (
        <Modal title="Material" onClose={() => setForm(null)}>
          <div className="ax-form-grid">
            <Field label="Material (catálogo)" span>
              <div className="ax-pick-row">
                <select value="" onChange={(e) => { const m = data.materiaisCatalogo.find((x) => x.id === e.target.value); if (m) escolherMaterial(m); }}>
                  <option value="">Escolher do catálogo…</option>
                  {data.materiaisCatalogo.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
                <button type="button" className="ax-btn ghost small" onClick={() => setQuick("material")}><Plus size={13} /> Novo</button>
              </div>
            </Field>
            <Field label="Nome do material" span><input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="Ex: Piso porcelanato 60x60" /></Field>
            <Field label="Categoria">
              <div className="ax-pick-row">
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  <option value="">—</option>
                  {data.categoriasMateriais.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" className="ax-btn ghost small" onClick={() => setQuick("categoria")}><Plus size={13} /> Nova</button>
              </div>
            </Field>
            <Field label="Quantidade"><input type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></Field>
            <Field label="Unidade"><input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /></Field>
            <Field label="Fornecedor">
              <div className="ax-pick-row">
                <select value={form.fornecedorId || ""} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}>
                  <option value="">—</option>
                  {data.fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
                <button type="button" className="ax-btn ghost small" onClick={() => setQuick("fornecedor")}><Plus size={13} /> Novo</button>
              </div>
            </Field>
            <Field label="Valor previsto"><input type="number" value={form.valorPrevisto} onChange={(e) => setForm({ ...form, valorPrevisto: e.target.value })} /></Field>
            <Field label="Valor comprado"><input type="number" value={form.valorComprado} onChange={(e) => setForm({ ...form, valorComprado: e.target.value })} /></Field>
            <Field label="Data da compra"><input type="date" value={form.dataCompra} onChange={(e) => setForm({ ...form, dataCompra: e.target.value })} /></Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Previsto</option><option>Comprado</option><option>Entregue</option></select>
            </Field>
          </div>
          <div className="ax-form-actions">
            <button className="ax-btn ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="ax-btn primary" disabled={!form.material || saving} onClick={save}>{saving ? "Salvando…" : "Salvar"}</button>
          </div>

          {quick === "material" && (
            <MaterialCatalogoQuickCreate onClose={() => setQuick(null)} onDone={(m) => { escolherMaterial(m); setQuick(null); }} />
          )}
          {quick === "categoria" && (
            <QuickAddModal title="Nova categoria de material" label="Nome da categoria" existing={data.categoriasMateriais}
              onClose={() => setQuick(null)}
              onSave={async (nome) => { await addCategoriaMaterial(nome); setForm((prev: any) => ({ ...prev, categoria: nome })); setQuick(null); }}
            />
          )}
          {quick === "fornecedor" && (
            <FornecedorQuickCreate onClose={() => setQuick(null)} onDone={(id) => { setForm((prev: any) => ({ ...prev, fornecedorId: id })); setQuick(null); }} />
          )}
        </Modal>
      )}
    </div>
  );
}

function FinanceiroTab({ obra, recebido, gasto, pendente }: any) {
  const { data, currentUser, createLancamento, deleteLancamento, addCategoriaFinanceiro, resolveCategoriaFinanceiroId } = useAlubox();
  const [form, setForm] = useState<any>(null);
  const [quick, setQuick] = useState(false);
  const [saving, setSaving] = useState(false);
  const podeLancar = can(currentUser, "financeiro");
  const lanc = obra.financeiro || [];

  const save = async () => {
    setSaving(true);
    try {
      const categoriaId = form.categoria ? await resolveCategoriaFinanceiroId(form.categoria) : null;
      await createLancamento(obra.id, { tipo: form.tipo, descricao: form.descricao, categoria_id: categoriaId, valor: form.valor, data: form.data });
      setForm(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="ax-stat-grid" style={{ marginBottom: 16 }}>
        <StatCard icon={<span />} label="Recebido" value={fmtMoney(recebido)} tone="ok" />
        <StatCard icon={<span />} label="Pendente" value={fmtMoney(pendente)} tone="warning" />
        <StatCard icon={<span />} label="Custos" value={fmtMoney(gasto)} />
      </div>
      {!podeLancar && <div className="ax-banner-warning"><AlertTriangle size={15} /><span>Seu perfil tem acesso somente leitura ao financeiro.</span></div>}
      <div className="ax-card">
        <div className="ax-card-title-row">
          <div className="ax-card-title">Lançamentos</div>
          {podeLancar && <button className="ax-btn primary small" onClick={() => setForm({ tipo: "receita", descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria: "" })}><Plus size={14} /> Novo lançamento</button>}
        </div>
        <table className="ax-table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            {lanc.map((l: any) => (
              <tr key={l.id}>
                <td data-label="Data">{fmtDate(l.data)}</td>
                <td data-label="Tipo"><span className={"ax-pill " + (l.tipo === "receita" ? "ok" : "danger")}>{l.tipo === "receita" ? "Receita" : "Despesa"}</span></td>
                <td data-label="Descrição">{l.descricao}</td><td data-label="Categoria">{l.categoria}</td><td data-label="Valor">{fmtMoney(l.valor)}</td>
                <td>{podeLancar && <button className="ax-icon-btn" onClick={() => deleteLancamento(l.id)}><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
            {lanc.length === 0 && <tr><td colSpan={6} className="ax-empty-inline">Nenhum lançamento ainda.</td></tr>}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal title="Lançamento financeiro" onClose={() => setForm(null)}>
          <div className="ax-form-grid">
            <Field label="Tipo">
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="receita">Receita (pagamento do cliente)</option>
                <option value="despesa">Despesa (material / mão de obra)</option>
              </select>
            </Field>
            <Field label="Valor"><input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></Field>
            <Field label="Data"><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Field>
            <Field label="Categoria">
              <div className="ax-pick-row">
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  <option value="">Selecionar categoria…</option>
                  {data.categoriasFinanceiro.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" className="ax-btn ghost small" onClick={() => setQuick(true)}><Plus size={13} /> Nova</button>
              </div>
            </Field>
            <Field label="Descrição" span><input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Field>
          </div>
          <div className="ax-form-actions">
            <button className="ax-btn ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="ax-btn primary" disabled={saving} onClick={save}>{saving ? "Salvando…" : "Salvar"}</button>
          </div>

          {quick && (
            <QuickAddModal title="Nova categoria financeira" label="Nome da categoria" existing={data.categoriasFinanceiro}
              onClose={() => setQuick(false)}
              onSave={async (nome) => { await addCategoriaFinanceiro(nome); setForm((prev: any) => ({ ...prev, categoria: nome })); setQuick(false); }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

function FotosTab({ obra }: { obra: any }) {
  const { currentUser, refresh } = useAlubox();
  const podeEditar = can(currentUser, "editar");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS_FOTO)[number]>("Antes");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fotos = obra.fotos || [];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploading(true);
    try {
      const supabase = createClient();
      await FotosSvc.uploadFoto(supabase, obra.id, file, categoria, "", currentUser.id);
      await refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const del = async (id: string, storageKey: string) => {
    const supabase = createClient();
    await FotosSvc.deleteFoto(supabase, id, storageKey);
    await refresh();
  };

  return (
    <div className="ax-card">
      <div className="ax-card-title-row">
        <div className="ax-card-title">Galeria de fotos</div>
        {podeEditar && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="ax-select small" value={categoria} onChange={(e) => setCategoria(e.target.value as any)}>
              {CATEGORIAS_FOTO.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button className="ax-btn primary small" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              <Camera size={14} /> {uploading ? "Enviando…" : "Tirar foto"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFile} />
          </div>
        )}
      </div>
      {CATEGORIAS_FOTO.map((cat) => {
        const items = fotos.filter((f: any) => f.categoria === cat);
        return (
          <div key={cat} style={{ marginBottom: 14 }}>
            <div className="ax-list-sub" style={{ marginBottom: 6 }}>{cat} ({items.length})</div>
            <div className="ax-photo-grid">
              {items.map((f: any) => (
                <div key={f.id} className="ax-photo-card">
                  <img src={f.url} alt={f.legenda} />
                  <div className="ax-photo-caption">{f.legenda || "—"}{podeEditar && <button className="ax-icon-btn" onClick={() => del(f.id, f.storageKey)}><Trash2 size={12} /></button>}</div>
                </div>
              ))}
              {items.length === 0 && <div className="ax-empty-inline">Nenhuma foto em &quot;{cat}&quot;.</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DocumentosTab({ obra }: { obra: any }) {
  const { currentUser, refresh } = useAlubox();
  const podeEditar = can(currentUser, "editar");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState("Contrato");
  const [uploading, setUploading] = useState(false);
  const docs = obra.documentos || [];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploading(true);
    try {
      const supabase = createClient();
      await DocumentosSvc.uploadDocumento(supabase, obra.id, file, tipo, currentUser.id);
      await refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const del = async (id: string, storageKey: string) => {
    const supabase = createClient();
    await DocumentosSvc.deleteDocumento(supabase, id, storageKey);
    await refresh();
  };

  return (
    <div className="ax-card">
      <div className="ax-card-title-row">
        <div className="ax-card-title">Documentos da obra</div>
        {podeEditar && (
          <div style={{ display: "flex", gap: 8 }}>
            <select className="ax-select small" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option>Contrato</option><option>Orçamento</option><option>Projeto</option><option>Nota fiscal</option><option>Outro</option>
            </select>
            <button className="ax-btn primary small" disabled={uploading} onClick={() => fileInputRef.current?.click()}><Paperclip size={14} /> {uploading ? "Enviando…" : "Anexar"}</button>
            <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFile} />
          </div>
        )}
      </div>
      <div className="ax-list">
        {docs.map((d: any) => (
          <div key={d.id} className="ax-list-row" style={{ cursor: "default" }}>
            <span>{d.nome}</span><span className="ax-list-sub">{d.tipo} · {fmtDate(d.data)}</span>
            <a href={d.url} target="_blank" rel="noreferrer" className="ax-link-plain">abrir</a>
            {podeEditar && <button className="ax-icon-btn" onClick={() => del(d.id, d.storageKey)}><Trash2 size={14} /></button>}
          </div>
        ))}
        {docs.length === 0 && <div className="ax-empty-inline">Nenhum documento anexado.</div>}
      </div>
    </div>
  );
}

function HistoricoTab({ obra }: { obra: any }) {
  const hist = obra.historico || [];
  return (
    <div className="ax-card">
      <div className="ax-card-title">Histórico de alterações</div>
      <div className="ax-timeline">
        {hist.map((h: any) => (
          <div key={h.id} className="ax-timeline-item">
            <div className="ax-timeline-dot" />
            <div><div>{h.texto}</div><div className="ax-list-sub">{new Date(h.data).toLocaleString("pt-BR")}</div></div>
          </div>
        ))}
        {hist.length === 0 && <div className="ax-empty-inline">Sem eventos registrados ainda.</div>}
      </div>
    </div>
  );
}
