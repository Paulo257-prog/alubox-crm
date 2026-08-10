"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Phone, Mail, MapPin, Pencil, ArrowLeft } from "lucide-react";
import { useAlubox } from "./AluboxProvider";
import { Modal, Field, Confirm, DupWarningBanner } from "./ui";
import { can } from "@/lib/permissions";
import { digitsOnly } from "@/lib/utils";
import type { Cliente } from "@/types/domain";

function QuickContactActions({ telefone, whatsapp }: { telefone?: string; whatsapp?: string }) {
  const tel = digitsOnly(telefone);
  const wa = digitsOnly(whatsapp || telefone);
  if (!tel && !wa) return null;
  return (
    <div className="ax-row-gap" style={{ marginTop: 10 }}>
      {tel && <a className="ax-btn ghost small" href={`tel:${tel}`}><Phone size={14} /> Ligar</a>}
      {wa && <a className="ax-btn primary small" href={`https://wa.me/55${wa}`} target="_blank" rel="noreferrer"><Phone size={14} /> WhatsApp</a>}
    </div>
  );
}

export function ClientesView() {
  const { data, currentUser, deleteCliente } = useAlubox();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("novo") === "1");
  const [confirm, setConfirm] = useState<{ id: string } | null>(null);
  const canDelete = can(currentUser, "excluir");

  const obrasByCliente = (id: string) => data.obras.filter((o) => o.clienteId === id);

  return (
    <div>
      <div className="ax-view-head">
        <h2 className="ax-h2">Clientes</h2>
        {can(currentUser, "criar") && <button className="ax-btn primary" onClick={() => setShowForm(true)}><Plus size={16} /> Novo Cliente</button>}
      </div>
      <div className="ax-card-grid">
        {data.clientes.map((c) => (
          <div key={c.id} className="ax-entity-card" onClick={() => router.push(`/clientes/${c.id}`)}>
            <div className="ax-entity-avatar">{c.nome.slice(0, 1).toUpperCase() || "?"}</div>
            <div className="ax-entity-body">
              <div className="ax-entity-name">{c.nome}</div>
              <div className="ax-list-sub">{c.cidade}{c.telefone ? " · " + c.telefone : ""}</div>
              <div className="ax-list-sub">{obrasByCliente(c.id).length} obra(s)</div>
            </div>
            {canDelete && <button className="ax-icon-btn" onClick={(e) => { e.stopPropagation(); setConfirm({ id: c.id }); }}><Trash2 size={14} /></button>}
          </div>
        ))}
        {data.clientes.length === 0 && <div className="ax-empty-inline">Nenhum cliente cadastrado ainda.</div>}
      </div>
      {showForm && (
        <ClienteQuickCreate onClose={() => setShowForm(false)} onDone={(id) => { setShowForm(false); router.push(`/clientes/${id}`); }} />
      )}
      {confirm && (
        <Confirm text="Excluir este cliente?" onNo={() => setConfirm(null)} onYes={async () => { await deleteCliente(confirm.id); setConfirm(null); }} />
      )}
    </div>
  );
}

function emptyCliente() {
  return { nome: "", cpfCnpj: "", telefone: "", whatsapp: "", email: "", endereco: "", cidade: "Matinhos", observacoes: "" };
}

// Formulário completo de cliente, com checagem de duplicidade por
// CPF/CNPJ. Usado tanto na tela de Clientes quanto como "+ Novo" dentro de
// qualquer outro formulário (ex: Nova Obra) — por isso recebe `onDone`
// (chamado tanto ao criar quanto ao escolher "usar cadastro existente").
export function ClienteQuickCreate({ onClose, onDone, initial, clienteId }: {
  onClose: () => void; onDone: (id: string) => void; initial?: Partial<Cliente>; clienteId?: string;
}) {
  const { createCliente, updateCliente, findClientePorDocumento } = useAlubox();
  const [f, setF] = useState({ ...emptyCliente(), ...initial });
  const [dup, setDup] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); if (k === "cpfCnpj") setDup(null); };

  const submit = async () => {
    if (!f.nome.trim()) return;
    if (f.cpfCnpj.trim()) {
      const found = await findClientePorDocumento(f.cpfCnpj, clienteId);
      if (found) { setDup(found); return; }
    }
    setSaving(true);
    try {
      if (clienteId) {
        await updateCliente(clienteId, { nome: f.nome, cpf_cnpj: f.cpfCnpj || null, telefone: f.telefone, whatsapp: f.whatsapp, email: f.email, endereco: f.endereco, cidade: f.cidade, observacoes: f.observacoes });
        onDone(clienteId);
      } else {
        const c = await createCliente(f);
        if (c) onDone(c.id);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={clienteId ? "Editar cliente" : "Novo cliente"} onClose={onClose}>
      {dup && <DupWarningBanner nome={dup.nome} doc={dup.cpfCnpj} onUseExisting={() => onDone(dup.id)} />}
      <div className="ax-form-grid">
        <Field label="Nome" span><input value={f.nome} onChange={set("nome")} /></Field>
        <Field label="CPF/CNPJ"><input value={f.cpfCnpj} onChange={set("cpfCnpj")} /></Field>
        <Field label="Telefone"><input value={f.telefone} onChange={set("telefone")} /></Field>
        <Field label="WhatsApp"><input value={f.whatsapp} onChange={set("whatsapp")} /></Field>
        <Field label="E-mail"><input value={f.email} onChange={set("email")} /></Field>
        <Field label="Cidade"><input value={f.cidade} onChange={set("cidade")} /></Field>
        <Field label="Endereço" span><input value={f.endereco} onChange={set("endereco")} /></Field>
        <Field label="Observações" span><textarea rows={2} value={f.observacoes} onChange={set("observacoes")} /></Field>
      </div>
      <div className="ax-form-actions">
        <button className="ax-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="ax-btn primary" disabled={!f.nome || saving} onClick={submit}>{saving ? "Salvando…" : "Salvar"}</button>
      </div>
    </Modal>
  );
}

export function ClienteDetail({ clienteId }: { clienteId: string }) {
  const { data, currentUser, addInteracao } = useAlubox();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const cliente = data.clientes.find((c) => c.id === clienteId);

  if (!cliente) return <div className="ax-empty-inline">Cliente não encontrado (ou você não tem permissão para vê-lo).</div>;

  const obras = data.obras.filter((o) => o.clienteId === cliente.id);
  const addNote = async () => {
    if (!note.trim()) return;
    await addInteracao(cliente.id, note.trim());
    setNote("");
  };

  return (
    <div>
      <button className="ax-back" onClick={() => router.push("/clientes")}><ArrowLeft size={16} /> Voltar para clientes</button>
      <div className="ax-detail-head">
        <div>
          <h2 className="ax-h2" style={{ margin: "2px 0" }}>{cliente.nome}</h2>
          <div className="ax-list-sub"><MapPin size={12} /> {cliente.endereco}, {cliente.cidade}</div>
        </div>
        {can(currentUser, "editar") && <button className="ax-btn ghost" onClick={() => setEditing(true)}><Pencil size={14} /> Editar</button>}
      </div>
      <div className="ax-grid-2">
        <div className="ax-card">
          <div className="ax-card-title">Contato</div>
          <div className="ax-kv"><span><Phone size={14} /> Telefone</span><b>{cliente.telefone || "—"}</b></div>
          <div className="ax-kv"><span><Phone size={14} /> WhatsApp</span><b>{cliente.whatsapp || "—"}</b></div>
          <div className="ax-kv"><span><Mail size={14} /> E-mail</span><b>{cliente.email || "—"}</b></div>
          <div className="ax-kv"><span>CPF/CNPJ</span><b>{cliente.cpfCnpj || "—"}</b></div>
          <QuickContactActions telefone={cliente.telefone} whatsapp={cliente.whatsapp} />
          {cliente.observacoes && <p className="ax-desc">{cliente.observacoes}</p>}
        </div>
        <div className="ax-card">
          <div className="ax-card-title">Obras</div>
          <div className="ax-list">
            {obras.map((o) => (
              <button key={o.id} className="ax-list-row" onClick={() => router.push(`/obras/${o.id}`)}>
                <span>{o.codigo} — {o.nome}</span>
                <span className="ax-list-sub">{o.status}</span>
                <span className="ax-list-sub">{o.valorContratado}</span>
              </button>
            ))}
            {obras.length === 0 && <div className="ax-empty-inline">Nenhuma obra contratada ainda.</div>}
          </div>
        </div>
      </div>
      <div className="ax-card" style={{ marginTop: 16 }}>
        <div className="ax-card-title">Histórico de relacionamento</div>
        <div className="ax-row-gap">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Registrar uma interação (ligação, visita, mensagem)…" onKeyDown={(e) => e.key === "Enter" && addNote()} />
          <button className="ax-btn primary small" onClick={addNote}>Adicionar</button>
        </div>
        <div className="ax-timeline" style={{ marginTop: 10 }}>
          {(cliente.timeline || []).map((h) => (
            <div key={h.id} className="ax-timeline-item">
              <div className="ax-timeline-dot" />
              <div><div>{h.texto}</div><div className="ax-list-sub">{new Date(h.data).toLocaleString("pt-BR")}</div></div>
            </div>
          ))}
          {(cliente.timeline || []).length === 0 && <div className="ax-empty-inline">Nenhuma interação registrada.</div>}
        </div>
      </div>
      {editing && <ClienteQuickCreate clienteId={cliente.id} initial={cliente} onClose={() => setEditing(false)} onDone={() => setEditing(false)} />}
    </div>
  );
}
