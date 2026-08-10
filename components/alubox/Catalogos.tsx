"use client";

import { useState } from "react";
import { useAlubox } from "./AluboxProvider";
import { Modal, Field, DupWarningBanner } from "./ui";

// Fornecedor tem CPF/CNPJ e precisa da mesma checagem de duplicidade que
// Cliente e Prestador já usam — por isso é um modal completo, não um
// QuickAddModal de nome único.
export function FornecedorQuickCreate({ onClose, onDone }: { onClose: () => void; onDone: (id: string, nome: string) => void }) {
  const { createFornecedor, findFornecedorPorDocumento } = useAlubox();
  const [f, setF] = useState({ nome: "", cpfCnpj: "", telefone: "", cidade: "Matinhos", observacoes: "" });
  const [dup, setDup] = useState<{ id: string; nome: string; cpfCnpj: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); if (k === "cpfCnpj") setDup(null); };

  const submit = async () => {
    if (!f.nome.trim()) return;
    if (f.cpfCnpj.trim()) {
      const found = await findFornecedorPorDocumento(f.cpfCnpj);
      if (found) { setDup(found); return; }
    }
    setSaving(true);
    try {
      const novo = await createFornecedor(f);
      if (novo) onDone(novo.id, novo.nome);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Novo fornecedor" onClose={onClose}>
      {dup && <DupWarningBanner nome={dup.nome} doc={dup.cpfCnpj} onUseExisting={() => onDone(dup.id, dup.nome)} />}
      <div className="ax-form-grid">
        <Field label="Nome / Empresa" span><input value={f.nome} onChange={set("nome")} /></Field>
        <Field label="CPF/CNPJ"><input value={f.cpfCnpj} onChange={set("cpfCnpj")} /></Field>
        <Field label="Telefone"><input value={f.telefone} onChange={set("telefone")} /></Field>
        <Field label="Cidade"><input value={f.cidade} onChange={set("cidade")} /></Field>
        <Field label="Observações" span><textarea rows={2} value={f.observacoes} onChange={set("observacoes")} /></Field>
      </div>
      <div className="ax-form-actions">
        <button className="ax-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="ax-btn primary" disabled={!f.nome || saving} onClick={submit}>{saving ? "Salvando…" : "Salvar fornecedor"}</button>
      </div>
    </Modal>
  );
}

export function MaterialCatalogoQuickCreate({ onClose, onDone }: { onClose: () => void; onDone: (item: { id: string; nome: string; categoria: string; unidade: string }) => void }) {
  const { createMaterialCatalogo } = useAlubox();
  const [f, setF] = useState({ nome: "", categoria: "", unidade: "un" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!f.nome.trim()) return;
    setSaving(true);
    try {
      const novo = await createMaterialCatalogo(f);
      if (novo) onDone(novo as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Novo material no catálogo" onClose={onClose}>
      <div className="ax-form-grid">
        <Field label="Nome do material" span><input autoFocus value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex: Piso porcelanato 60x60" /></Field>
        <Field label="Categoria"><input value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Ex: Revestimento" /></Field>
        <Field label="Unidade padrão"><input value={f.unidade} onChange={(e) => setF({ ...f, unidade: e.target.value })} placeholder="Ex: m², un, saco" /></Field>
      </div>
      <div className="ax-form-actions">
        <button className="ax-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="ax-btn primary" disabled={!f.nome || saving} onClick={submit}>{saving ? "Salvando…" : "Salvar material"}</button>
      </div>
    </Modal>
  );
}

export function ServicoQuickCreate({ onClose, onDone }: { onClose: () => void; onDone: (item: { id: string; nome: string }) => void }) {
  const { createServico } = useAlubox();
  const [f, setF] = useState({ nome: "", categoria: "", valorPadrao: "" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!f.nome.trim()) return;
    setSaving(true);
    try {
      const novo = await createServico({ nome: f.nome, categoria: f.categoria, valorPadrao: f.valorPadrao ? Number(f.valorPadrao) : undefined });
      if (novo) onDone(novo as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Novo serviço no catálogo" onClose={onClose}>
      <div className="ax-form-grid">
        <Field label="Nome do serviço" span><input autoFocus value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex: Elétrica" /></Field>
        <Field label="Categoria"><input value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Ex: Instalações" /></Field>
        <Field label="Valor padrão"><input type="number" value={f.valorPadrao} onChange={(e) => setF({ ...f, valorPadrao: e.target.value })} /></Field>
      </div>
      <div className="ax-form-actions">
        <button className="ax-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="ax-btn primary" disabled={!f.nome || saving} onClick={submit}>{saving ? "Salvando…" : "Salvar serviço"}</button>
      </div>
    </Modal>
  );
}
