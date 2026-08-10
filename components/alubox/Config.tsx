"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, Check } from "lucide-react";
import { useAlubox } from "./AluboxProvider";
import { Modal, Field } from "./ui";
import { ROLES, can } from "@/lib/permissions";
import * as CatalogosSvc from "@/services/catalogos";
import type { CatalogoSimples } from "@/services/catalogos";

export function ConfigView() {
  const { data, currentUser, updateUsuario, criarUsuario } = useAlubox();
  const [userForm, setUserForm] = useState<any>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [erroUser, setErroUser] = useState("");

  const toggleAtivo = (id: string, ativo: boolean) => updateUsuario(id, { ativo: !ativo });

  const saveUser = async () => {
    setErroUser("");
    setSavingUser(true);
    try {
      if (userForm.id) {
        await updateUsuario(userForm.id, { nome: userForm.nome, role: userForm.role });
      } else {
        await criarUsuario({ nome: userForm.nome, email: userForm.email, senha: userForm.senha, role: userForm.role });
      }
      setUserForm(null);
    } catch (e: any) {
      setErroUser(e.message || "Não foi possível salvar o usuário.");
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <div>
      <h2 className="ax-h2">Configurações</h2>

      {can(currentUser, "usuarios") && (
        <div className="ax-card">
          <div className="ax-card-title-row">
            <div className="ax-card-title">Usuários e permissões</div>
            <button className="ax-btn primary small" onClick={() => setUserForm({ nome: "", email: "", senha: "", role: "OPERACIONAL" })}><Plus size={14} /> Novo usuário</button>
          </div>
          <div className="ax-banner-warning" style={{ marginTop: 0 }}>
            <ShieldCheck size={15} />
            <span>Contas reais via Supabase Auth — a senha nunca fica visível aqui nem em nenhuma tabela do banco.</span>
          </div>
          <table className="ax-table">
            <thead><tr><th>Nome</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.usuarios.map((u) => (
                <tr key={u.id}>
                  <td data-label="Nome">{u.nome}{u.id === currentUser.id && <span className="ax-list-sub"> (você)</span>}</td>
                  <td data-label="Perfil"><span className="ax-pill info">{u.role}</span></td>
                  <td data-label="Status">
                    <button className={"ax-pill " + (u.ativo ? "ok" : "danger")} onClick={() => toggleAtivo(u.id, u.ativo)} style={{ cursor: "pointer", border: "none" }}>{u.ativo ? "Ativo" : "Inativo"}</button>
                  </td>
                  <td><button className="ax-icon-btn" onClick={() => setUserForm(u)}><Pencil size={14} /></button></td>
                </tr>
              ))}
              {data.usuarios.length === 0 && <tr><td colSpan={4} className="ax-empty-inline">Nenhum usuário ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="ax-h2" style={{ marginTop: 24 }}>Catálogos</h2>
      <p className="ax-desc" style={{ marginTop: 0 }}>
        Registros usados nos seletores "+ Novo" espalhados pelo sistema (Materiais, Financeiro, Cronograma). Um catálogo
        vinculado a alguma obra não pode ser excluído — desative-o em vez disso.
      </p>

      <div className="ax-grid-2">
        <SimpleCatalogSection table="categorias_materiais" title="Categorias de materiais" />
        <SimpleCatalogSection table="categorias_financeiro" title="Categorias financeiras" />
      </div>
      <div className="ax-grid-2" style={{ marginTop: 16 }}>
        <SimpleCatalogSection table="especialidades" title="Especialidades de prestadores" />
        <FornecedoresSection />
      </div>
      <div className="ax-grid-2" style={{ marginTop: 16 }}>
        <MateriaisCatalogoSection />
        <ServicosCatalogoSection />
      </div>

      <div className="ax-card" style={{ marginTop: 16 }}>
        <div className="ax-card-title">Sobre</div>
        <p className="ax-desc">ALUBOX — Gestão de Obras · dados salvos no Supabase (PostgreSQL), com autenticação e permissões reais (RLS) — ver supabase/migrations no repositório.</p>
      </div>

      {userForm && (
        <Modal title={userForm.id ? "Editar usuário" : "Novo usuário"} onClose={() => setUserForm(null)}>
          <div className="ax-form-grid">
            <Field label="Nome" span><input value={userForm.nome} onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })} /></Field>
            {!userForm.id && (
              <>
                <Field label="E-mail" span><input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></Field>
                <Field label="Senha"><input type="text" value={userForm.senha} onChange={(e) => setUserForm({ ...userForm, senha: e.target.value })} /></Field>
              </>
            )}
            <Field label="Perfil">
              <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
            </Field>
          </div>
          {erroUser && <div className="ax-login-error">{erroUser}</div>}
          <div className="ax-form-actions">
            <button className="ax-btn ghost" onClick={() => setUserForm(null)}>Cancelar</button>
            <button className="ax-btn primary" disabled={!userForm.nome || savingUser} onClick={saveUser}>{savingUser ? "Salvando…" : "Salvar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// Catálogos simples (só nome): categorias de material, categorias
// financeiras, especialidades — mesmo componente reaproveitado 3x.
// ============================================================================
function SimpleCatalogSection({ table, title }: { table: CatalogoSimples; title: string }) {
  const { supabase, refreshCatalogos } = useAlubox();
  const [items, setItems] = useState<{ id: string; nome: string; ativo: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState("");
  const [editing, setEditing] = useState<{ id: string; nome: string } | null>(null);
  const [erro, setErro] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setItems(await CatalogosSvc.listCatalogoSimplesTodos(supabase, table));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [table]);

  const add = async () => {
    if (!novo.trim()) return;
    await CatalogosSvc.getOrCreate(supabase, table, novo.trim());
    setNovo("");
    await load();
    await refreshCatalogos();
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await CatalogosSvc.toggleAtivoCatalogoSimples(supabase, table, id, !ativo);
    await load();
    await refreshCatalogos();
  };

  const saveEdit = async () => {
    if (!editing) return;
    await CatalogosSvc.renameCatalogoSimples(supabase, table, editing.id, editing.nome);
    setEditing(null);
    await load();
    await refreshCatalogos();
  };

  const remove = async (id: string) => {
    setErro("");
    try {
      await CatalogosSvc.excluirCatalogoSimplesSeguro(supabase, table, id);
      await load();
      await refreshCatalogos();
    } catch (e: any) {
      setErro(e.message || "Não foi possível excluir.");
    }
  };

  return (
    <div className="ax-card">
      <div className="ax-card-title">{title}</div>
      <div className="ax-row-gap">
        <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Novo item" onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="ax-btn primary small" onClick={add}>Adicionar</button>
      </div>
      {erro && <div className="ax-login-error" style={{ marginTop: 8 }}>{erro}</div>}
      <div className="ax-list" style={{ marginTop: 10 }}>
        {items.map((it) => (
          <div key={it.id} className="ax-list-row" style={{ cursor: "default" }}>
            {editing?.id === it.id ? (
              <input autoFocus value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ flex: 1 }} />
            ) : (
              <span>{it.nome}</span>
            )}
            <button className={"ax-pill " + (it.ativo ? "ok" : "danger")} onClick={() => toggleAtivo(it.id, it.ativo)} style={{ cursor: "pointer", border: "none" }}>{it.ativo ? "Ativo" : "Inativo"}</button>
            {editing?.id === it.id ? (
              <button className="ax-icon-btn" onClick={saveEdit}><Check size={14} /></button>
            ) : (
              <button className="ax-icon-btn" onClick={() => setEditing({ id: it.id, nome: it.nome })}><Pencil size={14} /></button>
            )}
            <button className="ax-icon-btn" onClick={() => remove(it.id)}><Trash2 size={14} /></button>
          </div>
        ))}
        {!loading && items.length === 0 && <div className="ax-empty-inline">Nenhum item ainda.</div>}
      </div>
    </div>
  );
}

// ============================================================================
// Fornecedores
// ============================================================================
function FornecedoresSection() {
  const { supabase, refreshCatalogos } = useAlubox();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [erro, setErro] = useState("");

  const load = async () => setItems(await CatalogosSvc.listFornecedoresTodos(supabase));
  useEffect(() => { load(); }, []);

  const toggleAtivo = async (id: string, ativo: boolean) => { await CatalogosSvc.toggleAtivoFornecedor(supabase, id, !ativo); await load(); await refreshCatalogos(); };
  const remove = async (id: string) => {
    setErro("");
    try { await CatalogosSvc.excluirFornecedorSeguro(supabase, id); await load(); await refreshCatalogos(); }
    catch (e: any) { setErro(e.message || "Não foi possível excluir."); }
  };
  const save = async () => {
    if (form.id) await CatalogosSvc.updateFornecedor(supabase, form.id, { nome: form.nome, cpf_cnpj: form.cpfCnpj || null, telefone: form.telefone, cidade: form.cidade, observacoes: form.observacoes });
    else await CatalogosSvc.createFornecedor(supabase, form);
    setForm(null);
    await load();
    await refreshCatalogos();
  };

  return (
    <div className="ax-card">
      <div className="ax-card-title-row">
        <div className="ax-card-title">Fornecedores</div>
        <button className="ax-btn primary small" onClick={() => setForm({ nome: "", cpfCnpj: "", telefone: "", cidade: "Matinhos", observacoes: "" })}><Plus size={14} /> Novo</button>
      </div>
      {erro && <div className="ax-login-error">{erro}</div>}
      <div className="ax-list">
        {items.map((f) => (
          <div key={f.id} className="ax-list-row" style={{ cursor: "default" }}>
            <span>{f.nome}</span><span className="ax-list-sub">{f.cidade}</span>
            <button className={"ax-pill " + (f.ativo ? "ok" : "danger")} onClick={() => toggleAtivo(f.id, f.ativo)} style={{ cursor: "pointer", border: "none" }}>{f.ativo ? "Ativo" : "Inativo"}</button>
            <button className="ax-icon-btn" onClick={() => setForm(f)}><Pencil size={14} /></button>
            <button className="ax-icon-btn" onClick={() => remove(f.id)}><Trash2 size={14} /></button>
          </div>
        ))}
        {items.length === 0 && <div className="ax-empty-inline">Nenhum fornecedor ainda.</div>}
      </div>
      {form && (
        <Modal title={form.id ? "Editar fornecedor" : "Novo fornecedor"} onClose={() => setForm(null)}>
          <div className="ax-form-grid">
            <Field label="Nome / Empresa" span><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
            <Field label="CPF/CNPJ"><input value={form.cpfCnpj} onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })} /></Field>
            <Field label="Telefone"><input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></Field>
            <Field label="Cidade"><input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></Field>
            <Field label="Observações" span><textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Field>
          </div>
          <div className="ax-form-actions">
            <button className="ax-btn ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="ax-btn primary" disabled={!form.nome} onClick={save}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// Catálogo de materiais
// ============================================================================
function MateriaisCatalogoSection() {
  const { supabase, refreshCatalogos } = useAlubox();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [erro, setErro] = useState("");

  const load = async () => setItems(await CatalogosSvc.listMateriaisCatalogoTodos(supabase));
  useEffect(() => { load(); }, []);

  const toggleAtivo = async (id: string, ativo: boolean) => { await CatalogosSvc.toggleAtivoMaterialCatalogo(supabase, id, !ativo); await load(); await refreshCatalogos(); };
  const remove = async (id: string) => {
    setErro("");
    try { await CatalogosSvc.excluirMaterialCatalogoSeguro(supabase, id); await load(); await refreshCatalogos(); }
    catch (e: any) { setErro(e.message || "Não foi possível excluir."); }
  };
  const save = async () => {
    if (form.id) await CatalogosSvc.updateMaterialCatalogo(supabase, form.id, { nome: form.nome, categoria: form.categoria, unidade: form.unidade });
    else await CatalogosSvc.createMaterialCatalogo(supabase, form);
    setForm(null);
    await load();
    await refreshCatalogos();
  };

  return (
    <div className="ax-card">
      <div className="ax-card-title-row">
        <div className="ax-card-title">Catálogo de materiais</div>
        <button className="ax-btn primary small" onClick={() => setForm({ nome: "", categoria: "", unidade: "un" })}><Plus size={14} /> Novo</button>
      </div>
      {erro && <div className="ax-login-error">{erro}</div>}
      <div className="ax-list">
        {items.map((m) => (
          <div key={m.id} className="ax-list-row" style={{ cursor: "default" }}>
            <span>{m.nome}</span><span className="ax-list-sub">{m.categoria || "—"}</span>
            <button className={"ax-pill " + (m.ativo ? "ok" : "danger")} onClick={() => toggleAtivo(m.id, m.ativo)} style={{ cursor: "pointer", border: "none" }}>{m.ativo ? "Ativo" : "Inativo"}</button>
            <button className="ax-icon-btn" onClick={() => setForm(m)}><Pencil size={14} /></button>
            <button className="ax-icon-btn" onClick={() => remove(m.id)}><Trash2 size={14} /></button>
          </div>
        ))}
        {items.length === 0 && <div className="ax-empty-inline">Nenhum material ainda.</div>}
      </div>
      {form && (
        <Modal title={form.id ? "Editar material" : "Novo material"} onClose={() => setForm(null)}>
          <div className="ax-form-grid">
            <Field label="Nome do material" span><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
            <Field label="Categoria"><input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></Field>
            <Field label="Unidade"><input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /></Field>
          </div>
          <div className="ax-form-actions">
            <button className="ax-btn ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="ax-btn primary" disabled={!form.nome} onClick={save}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// Catálogo de serviços
// ============================================================================
function ServicosCatalogoSection() {
  const { supabase, refreshCatalogos } = useAlubox();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [erro, setErro] = useState("");

  const load = async () => setItems(await CatalogosSvc.listServicosTodos(supabase));
  useEffect(() => { load(); }, []);

  const toggleAtivo = async (id: string, ativo: boolean) => { await CatalogosSvc.toggleAtivoServico(supabase, id, !ativo); await load(); await refreshCatalogos(); };
  const remove = async (id: string) => {
    setErro("");
    try { await CatalogosSvc.excluirServicoSeguro(supabase, id); await load(); await refreshCatalogos(); }
    catch (e: any) { setErro(e.message || "Não foi possível excluir."); }
  };
  const save = async () => {
    if (form.id) await CatalogosSvc.updateServico(supabase, form.id, { nome: form.nome, categoria: form.categoria, valor_padrao: form.valorPadrao || null });
    else await CatalogosSvc.createServico(supabase, { nome: form.nome, categoria: form.categoria, valorPadrao: form.valorPadrao ? Number(form.valorPadrao) : undefined });
    setForm(null);
    await load();
    await refreshCatalogos();
  };

  return (
    <div className="ax-card">
      <div className="ax-card-title-row">
        <div className="ax-card-title">Catálogo de serviços</div>
        <button className="ax-btn primary small" onClick={() => setForm({ nome: "", categoria: "", valorPadrao: "" })}><Plus size={14} /> Novo</button>
      </div>
      {erro && <div className="ax-login-error">{erro}</div>}
      <div className="ax-list">
        {items.map((s) => (
          <div key={s.id} className="ax-list-row" style={{ cursor: "default" }}>
            <span>{s.nome}</span><span className="ax-list-sub">{s.categoria || "—"}</span>
            <button className={"ax-pill " + (s.ativo ? "ok" : "danger")} onClick={() => toggleAtivo(s.id, s.ativo)} style={{ cursor: "pointer", border: "none" }}>{s.ativo ? "Ativo" : "Inativo"}</button>
            <button className="ax-icon-btn" onClick={() => setForm(s)}><Pencil size={14} /></button>
            <button className="ax-icon-btn" onClick={() => remove(s.id)}><Trash2 size={14} /></button>
          </div>
        ))}
        {items.length === 0 && <div className="ax-empty-inline">Nenhum serviço ainda.</div>}
      </div>
      {form && (
        <Modal title={form.id ? "Editar serviço" : "Novo serviço"} onClose={() => setForm(null)}>
          <div className="ax-form-grid">
            <Field label="Nome do serviço" span><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
            <Field label="Categoria"><input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></Field>
            <Field label="Valor padrão"><input type="number" value={form.valorPadrao} onChange={(e) => setForm({ ...form, valorPadrao: e.target.value })} /></Field>
          </div>
          <div className="ax-form-actions">
            <button className="ax-btn ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="ax-btn primary" disabled={!form.nome} onClick={save}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
