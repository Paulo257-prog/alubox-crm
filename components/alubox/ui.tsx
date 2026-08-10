"use client";

import React, { useState } from "react";
import { X, Star, AlertTriangle } from "lucide-react";

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="ax-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={"ax-modal" + (wide ? " ax-modal-wide" : "")}>
        <div className="ax-modal-head">
          <h3>{title}</h3>
          <button className="ax-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="ax-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <label className={"ax-field" + (span ? " ax-field-span" : "")}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="ax-stat">
      <div className={"ax-stat-icon tone-" + (tone || "default")}>{icon}</div>
      <div>
        <div className="ax-stat-value">{value}</div>
        <div className="ax-stat-label">{label}</div>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const cls = status === "Concluída" ? "ok" : status === "Atrasada" ? "danger" : status === "Em andamento" ? "info" : "muted";
  return <span className={"ax-pill " + cls}>{status}</span>;
}

export function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="ax-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={16} fill={n <= value ? "#D89B2A" : "none"} color={n <= value ? "#D89B2A" : "#B9C1C6"}
          onClick={() => onChange && onChange(n)} style={{ cursor: onChange ? "pointer" : "default" }} />
      ))}
    </div>
  );
}

export function Confirm({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return (
    <Modal title="Confirmar" onClose={onNo}>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>{text}</p>
      <div className="ax-form-actions">
        <button className="ax-btn ghost" onClick={onNo}>Cancelar</button>
        <button className="ax-btn danger" onClick={onYes}>Excluir</button>
      </div>
    </Modal>
  );
}

// Modal genérico de criação rápida para catálogos simples (responsável,
// categoria, especialidade) — mesma regra global de "+ Novo" do protótipo.
export function QuickAddModal({ title, label, placeholder, existing, onClose, onSave }: {
  title: string; label: string; placeholder?: string; existing: string[]; onClose: () => void; onSave: (v: string) => void;
}) {
  const [val, setVal] = useState("");
  const jaExiste = val.trim() && existing.some((x) => x.toLowerCase() === val.trim().toLowerCase());
  const submit = () => {
    const v = val.trim();
    if (!v) return;
    const match = existing.find((x) => x.toLowerCase() === v.toLowerCase());
    onSave(match || v);
  };
  return (
    <Modal title={title} onClose={onClose}>
      <Field label={label}>
        <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && submit()} />
      </Field>
      {jaExiste && <div className="ax-list-sub" style={{ marginTop: 6 }}>Já existe — será apenas selecionado.</div>}
      <div className="ax-form-actions">
        <button className="ax-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="ax-btn primary" disabled={!val.trim()} onClick={submit}>Salvar</button>
      </div>
    </Modal>
  );
}

export function DupWarningBanner({ nome, doc, onUseExisting }: { nome: string; doc?: string; onUseExisting?: () => void }) {
  return (
    <div className="ax-banner-warning">
      <AlertTriangle size={15} />
      <span>Este cadastro já existe: <b>{nome}</b>{doc ? ` (${doc})` : ""}.</span>
      {onUseExisting && <button className="ax-btn ghost small" onClick={onUseExisting}>Usar cadastro existente</button>}
    </div>
  );
}
