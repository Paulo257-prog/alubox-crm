"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Phone, Mail, Pencil, ArrowLeft } from "lucide-react";
import { useAlubox } from "./AluboxProvider";
import { Modal, Field, Confirm, DupWarningBanner, Stars } from "./ui";
import { can } from "@/lib/permissions";
import { digitsOnly } from "@/lib/utils";
import type { Prestador } from "@/types/domain";

const ESPECIALIDADES_PADRAO = ["Pedreiro", "Eletricista", "Encanador", "Pintor", "Gesseiro", "Marceneiro", "Serralheiro", "Vidraceiro", "Ar-condicionado", "Limpeza", "Outros"];

function avgAval(p: Prestador) {
  const vals = Object.values(p.avaliacoes || {}).filter((v) => v > 0);
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export function PrestadoresView() {
  const { data, currentUser, deletePrestador } = useAlubox();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterEsp, setFilterEsp] = useState("");
  const [showForm, setShowForm] = useState(searchParams.get("novo") === "1");
  const [confirm, setConfirm] = useState<{ id: string } | null>(null);
  const canDelete = can(currentUser, "excluir");

  let prestadores = data.prestadores;
  if (filterEsp) prestadores = prestadores.filter((p) => p.especialidade === filterEsp);

  return (
    <div>
      <div className="ax-view-head">
        <h2 className="ax-h2">Prestadores</h2>
        <div className="ax-view-actions">
          <select className="ax-select" value={filterEsp} onChange={(e) => setFilterEsp(e.target.value)}>
            <option value="">Todas as especialidades</option>
            {(data.especialidades.length ? data.especialidades : ESPECIALIDADES_PADRAO).map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          {can(currentUser, "criar") && <button className="ax-btn primary" onClick={() => setShowForm(true)}><Plus size={16} /> Novo Prestador</button>}
        </div>
      </div>
      <div className="ax-card-grid">
        {prestadores.map((p) => (
          <div key={p.id} className="ax-entity-card" onClick={() => router.push(`/prestadores/${p.id}`)}>
            <div className="ax-entity-avatar alt">{p.nome.slice(0, 1).toUpperCase() || "?"}</div>
            <div className="ax-entity-body">
              <div className="ax-entity-name">{p.nome}</div>
              <div className="ax-list-sub">{p.especialidade} · {p.status}</div>
              <Stars value={Math.round(avgAval(p))} />
            </div>
            {canDelete && <button className="ax-icon-btn" onClick={(e) => { e.stopPropagation(); setConfirm({ id: p.id }); }}><Trash2 size={14} /></button>}
          </div>
        ))}
        {prestadores.length === 0 && <div className="ax-empty-inline">Nenhum prestador cadastrado ainda.</div>}
      </div>
      {showForm && <PrestadorQuickCreate onClose={() => setShowForm(false)} onDone={(id) => { setShowForm(false); router.push(`/prestadores/${id}`); }} />}
      {confirm && <Confirm text="Excluir este prestador?" onNo={() => setConfirm(null)} onYes={async () => { await deletePrestador(confirm.id); setConfirm(null); }} />}
    </div>
  );
}

function emptyPrestador() {
  return { nome: "", cpfCnpj: "", telefone: "", whatsapp: "", email: "", cidade: "Matinhos", endereco: "", especialidade: ESPECIALIDADES_PADRAO[0], status: "Ativo", valorDiaria: "", valorHora: "", observacoes: "" };
}

export function PrestadorQuickCreate({ onClose, onDone, initial, prestadorId }: {
  onClose: () => void; onDone: (id: string) => void; initial?: Partial<Prestador>; prestadorId?: string;
}) {
  const { data, createPrestador, updatePrestador, findPrestadorPorDocumento, addEspecialidade } = useAlubox();
  const [f, setF] = useState({ ...emptyPrestador(), ...initial });
  const [dup, setDup] = useState<Prestador | null>(null);
  const [quickEsp, setQuickEsp] = useState(false);
  const [saving, setSaving] = useState(false);
  const especialidades = data.especialidades.length ? data.especialidades : ESPECIALIDADES_PADRAO;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); if (k === "cpfCnpj") setDup(null); };

  const submit = async () => {
    if (!f.nome.trim()) return;
    if (f.cpfCnpj.trim()) {
      const found = await findPrestadorPorDocumento(f.cpfCnpj, prestadorId);
      if (found) { setDup(found); return; }
    }
    setSaving(true);
    try {
      if (prestadorId) {
        await updatePrestador(prestadorId, { nome: f.nome, cpf_cnpj: f.cpfCnpj || null, telefone: f.telefone, whatsapp: f.whatsapp, email: f.email, cidade: f.cidade, endereco: f.endereco, especialidade: f.especialidade, status: f.status, valor_diaria: f.valorDiaria || null, valor_hora: f.valorHora || null, observacoes: f.observacoes });
        onDone(prestadorId);
      } else {
        const p = await createPrestador(f);
        if (p) onDone(p.id);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={prestadorId ? "Editar prestador" : "Novo prestador"} onClose={onClose}>
      {dup && <DupWarningBanner nome={dup.nome} doc={dup.cpfCnpj} onUseExisting={() => onDone(dup.id)} />}
      <div className="ax-form-grid">
        <Field label="Nome / Empresa" span><input value={f.nome} onChange={set("nome")} /></Field>
        <Field label="Especialidade">
          <div className="ax-pick-row">
            <select value={f.especialidade} onChange={set("especialidade")}>{especialidades.map((e) => <option key={e}>{e}</option>)}</select>
            <button type="button" className="ax-btn ghost small" onClick={() => setQuickEsp(true)}><Plus size={13} /> Nova</button>
          </div>
        </Field>
        <Field label="Status"><select value={f.status} onChange={set("status")}><option>Ativo</option><option>Inativo</option></select></Field>
        <Field label="CPF/CNPJ"><input value={f.cpfCnpj} onChange={set("cpfCnpj")} /></Field>
        <Field label="Telefone"><input value={f.telefone} onChange={set("telefone")} /></Field>
        <Field label="WhatsApp"><input value={f.whatsapp} onChange={set("whatsapp")} /></Field>
        <Field label="E-mail"><input value={f.email} onChange={set("email")} /></Field>
        <Field label="Cidade"><input value={f.cidade} onChange={set("cidade")} /></Field>
        <Field label="Endereço" span><input value={f.endereco} onChange={set("endereco")} /></Field>
        <Field label="Valor da diária"><input type="number" value={f.valorDiaria} onChange={set("valorDiaria")} /></Field>
        <Field label="Valor/hora"><input type="number" value={f.valorHora} onChange={set("valorHora")} /></Field>
        <Field label="Observações" span><textarea rows={2} value={f.observacoes} onChange={set("observacoes")} /></Field>
      </div>
      <div className="ax-form-actions">
        <button className="ax-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="ax-btn primary" disabled={!f.nome || saving} onClick={submit}>{saving ? "Salvando…" : "Salvar"}</button>
      </div>
      {quickEsp && (
        <Modal title="Nova especialidade" onClose={() => setQuickEsp(false)}>
          <QuickEspForm onSave={async (nome) => { await addEspecialidade(nome); setF((prev) => ({ ...prev, especialidade: nome })); setQuickEsp(false); }} onClose={() => setQuickEsp(false)} />
        </Modal>
      )}
    </Modal>
  );
}

function QuickEspForm({ onSave, onClose }: { onSave: (nome: string) => void; onClose: () => void }) {
  const [nome, setNome] = useState("");
  return (
    <div>
      <Field label="Nome da especialidade"><input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <div className="ax-form-actions">
        <button className="ax-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="ax-btn primary" disabled={!nome.trim()} onClick={() => onSave(nome.trim())}>Salvar</button>
      </div>
    </div>
  );
}

export function PrestadorDetail({ prestadorId }: { prestadorId: string }) {
  const { data, currentUser, updateAvaliacao } = useAlubox();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const prestador = data.prestadores.find((p) => p.id === prestadorId);
  if (!prestador) return <div className="ax-empty-inline">Prestador não encontrado.</div>;

  const obras = data.obras.filter((o) => (o.prestadoresIds || []).includes(prestador.id));
  const labels: Record<string, string> = { qualidade: "Qualidade", prazo: "Prazo", organizacao: "Organização", comunicacao: "Comunicação", custoBeneficio: "Custo-benefício" };
  const tel = digitsOnly(prestador.telefone);
  const wa = digitsOnly(prestador.whatsapp || prestador.telefone);

  return (
    <div>
      <button className="ax-back" onClick={() => router.push("/prestadores")}><ArrowLeft size={16} /> Voltar para prestadores</button>
      <div className="ax-detail-head">
        <div>
          <h2 className="ax-h2" style={{ margin: "2px 0" }}>{prestador.nome}</h2>
          <div className="ax-list-sub">{prestador.especialidade} · {prestador.status}</div>
        </div>
        {can(currentUser, "editar") && <button className="ax-btn ghost" onClick={() => setEditing(true)}><Pencil size={14} /> Editar</button>}
      </div>
      <div className="ax-grid-2">
        <div className="ax-card">
          <div className="ax-card-title">Contato</div>
          <div className="ax-kv"><span><Phone size={14} /> Telefone</span><b>{prestador.telefone || "—"}</b></div>
          <div className="ax-kv"><span><Phone size={14} /> WhatsApp</span><b>{prestador.whatsapp || "—"}</b></div>
          <div className="ax-kv"><span><Mail size={14} /> E-mail</span><b>{prestador.email || "—"}</b></div>
          {(tel || wa) && (
            <div className="ax-row-gap" style={{ marginTop: 10 }}>
              {tel && <a className="ax-btn ghost small" href={`tel:${tel}`}><Phone size={14} /> Ligar</a>}
              {wa && <a className="ax-btn primary small" href={`https://wa.me/55${wa}`} target="_blank" rel="noreferrer"><Phone size={14} /> WhatsApp</a>}
            </div>
          )}
        </div>
        <div className="ax-card">
          <div className="ax-card-title">Avaliação interna</div>
          {Object.keys(labels).map((k) => (
            <div className="ax-kv" key={k}><span>{labels[k]}</span><Stars value={(prestador.avaliacoes as any)[k] || 0} onChange={can(currentUser, "editar") ? (v) => updateAvaliacao(prestador.id, k === "custoBeneficio" ? "custo_beneficio" : k, v) : undefined} /></div>
          ))}
        </div>
      </div>
      <div className="ax-card" style={{ marginTop: 16 }}>
        <div className="ax-card-title">Obras realizadas</div>
        <div className="ax-list">
          {obras.map((o) => <button key={o.id} className="ax-list-row" onClick={() => router.push(`/obras/${o.id}`)}><span>{o.codigo} — {o.nome}</span><span className="ax-list-sub">{o.status}</span></button>)}
          {obras.length === 0 && <div className="ax-empty-inline">Nenhuma obra vinculada ainda.</div>}
        </div>
      </div>
      {editing && <PrestadorQuickCreate prestadorId={prestador.id} initial={prestador} onClose={() => setEditing(false)} onDone={() => setEditing(false)} />}
    </div>
  );
}
