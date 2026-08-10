"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AluboxData } from "@/types/domain";
import * as ObrasSvc from "@/services/obras";
import * as ClientesSvc from "@/services/clientes";
import * as PrestadoresSvc from "@/services/prestadores";
import * as CatalogosSvc from "@/services/catalogos";
import * as UsuariosSvc from "@/services/usuarios";
import { mapUsuario } from "@/lib/mappers";

const EMPTY: AluboxData = {
  obras: [],
  clientes: [],
  prestadores: [],
  usuarios: [],
  responsaveis: [],
  fornecedores: [],
  materiaisCatalogo: [],
  servicos: [],
  categoriasFinanceiro: [],
  categoriasMateriais: [],
  especialidades: [],
};

// Hook central de dados do app. Diferente do protótipo (um blob JSON único
// em window.storage), aqui cada entidade vem de uma tabela real no
// Postgres via Supabase, respeitando RLS. A estratégia de atualização é
// "refetch da fatia afetada" após cada ação — simples e correta para o
// volume de dados de uma empresa deste porte; se o volume crescer muito,
// o próximo passo natural é Supabase Realtime para atualizações
// incrementais em vez de refetch.
export function useAluboxStore(userId: string | null) {
  const supabase = createClient();
  const [data, setData] = useState<AluboxData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [obras, clientes, prestadores, usuarios, fornecedores, materiaisCatalogo, servicos, categoriasFinanceiro, categoriasMateriais, especialidades] =
        await Promise.all([
          ObrasSvc.listObras(supabase),
          ClientesSvc.listClientes(supabase),
          PrestadoresSvc.listPrestadores(supabase),
          UsuariosSvc.listUsuarios(supabase),
          CatalogosSvc.listFornecedores(supabase),
          CatalogosSvc.listMateriaisCatalogo(supabase),
          CatalogosSvc.listServicos(supabase),
          CatalogosSvc.listCategoriasFinanceiro(supabase),
          CatalogosSvc.listCategoriasMateriais(supabase),
          CatalogosSvc.listEspecialidades(supabase),
        ]);
      setData({
        obras,
        clientes,
        prestadores,
        usuarios,
        responsaveis: usuarios.filter((u) => u.ativo),
        fornecedores,
        materiaisCatalogo,
        servicos,
        categoriasFinanceiro,
        categoriasMateriais,
        especialidades,
      });
      setError(null);
    } catch (e: any) {
      setError(e.message || "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshObras = useCallback(async () => {
    const obras = await ObrasSvc.listObras(supabase);
    setData((prev) => ({ ...prev, obras }));
  }, [supabase]);

  const refreshClientes = useCallback(async () => {
    const clientes = await ClientesSvc.listClientes(supabase);
    setData((prev) => ({ ...prev, clientes }));
  }, [supabase]);

  const refreshPrestadores = useCallback(async () => {
    const prestadores = await PrestadoresSvc.listPrestadores(supabase);
    setData((prev) => ({ ...prev, prestadores }));
  }, [supabase]);

  const refreshCatalogos = useCallback(async () => {
    const [fornecedores, materiaisCatalogo, servicos, categoriasFinanceiro, categoriasMateriais, especialidades] = await Promise.all([
      CatalogosSvc.listFornecedores(supabase),
      CatalogosSvc.listMateriaisCatalogo(supabase),
      CatalogosSvc.listServicos(supabase),
      CatalogosSvc.listCategoriasFinanceiro(supabase),
      CatalogosSvc.listCategoriasMateriais(supabase),
      CatalogosSvc.listEspecialidades(supabase),
    ]);
    setData((prev) => ({ ...prev, fornecedores, materiaisCatalogo, servicos, categoriasFinanceiro, categoriasMateriais, especialidades }));
  }, [supabase]);

  const refreshUsuarios = useCallback(async () => {
    const usuarios = await UsuariosSvc.listUsuarios(supabase);
    setData((prev) => ({ ...prev, usuarios, responsaveis: usuarios.filter((u) => u.ativo) }));
  }, [supabase]);

  // ---- Ações expostas para a UI (substituem o antigo mutate(fn)) ----
  const actions = {
    // Obras
    createObra: async (input: any) => {
      if (!userId) return null;
      const obra = await ObrasSvc.createObra(supabase, input, userId);
      await refreshObras();
      return obra;
    },
    moveObraStage: async (id: string, novoStatus: string, texto: string) => {
      if (!userId) return;
      await ObrasSvc.moveObraStage(supabase, id, novoStatus, userId, texto);
      await refreshObras();
    },
    updateObra: async (id: string, patch: Record<string, any>) => {
      await ObrasSvc.updateObra(supabase, id, patch);
      await refreshObras();
    },
    deleteObra: async (id: string) => {
      await ObrasSvc.deleteObra(supabase, id);
      await refreshObras();
    },
    addHistorico: async (obraId: string, texto: string) => {
      if (!userId) return;
      await ObrasSvc.addHistorico(supabase, obraId, texto, userId);
      await refreshObras();
    },
    // Tarefas
    upsertTarefa: async (obraId: string, tarefa: Record<string, any>) => {
      await ObrasSvc.upsertTarefa(supabase, obraId, tarefa);
      await refreshObras();
    },
    deleteTarefa: async (id: string) => {
      await ObrasSvc.deleteTarefa(supabase, id);
      await refreshObras();
    },
    // Materiais
    upsertMaterial: async (obraId: string, material: Record<string, any>) => {
      await ObrasSvc.upsertMaterial(supabase, obraId, material);
      await refreshObras();
    },
    deleteMaterial: async (id: string) => {
      await ObrasSvc.deleteMaterial(supabase, id);
      await refreshObras();
    },
    // Financeiro
    createLancamento: async (obraId: string, lancamento: Record<string, any>) => {
      if (!userId) return;
      await ObrasSvc.createLancamento(supabase, obraId, lancamento, userId);
      await refreshObras();
    },
    deleteLancamento: async (id: string) => {
      await ObrasSvc.deleteLancamento(supabase, id);
      await refreshObras();
    },
    // Prestadores vinculados à obra
    vincularPrestador: async (obraId: string, prestadorId: string) => {
      await ObrasSvc.vincularPrestador(supabase, obraId, prestadorId);
      await refreshObras();
    },
    desvincularPrestador: async (obraId: string, prestadorId: string) => {
      await ObrasSvc.desvincularPrestador(supabase, obraId, prestadorId);
      await refreshObras();
    },
    // Clientes
    createCliente: async (input: any) => {
      if (!userId) return null;
      const c = await ClientesSvc.createCliente(supabase, input, userId);
      await refreshClientes();
      return c;
    },
    updateCliente: async (id: string, patch: Record<string, any>) => {
      await ClientesSvc.updateCliente(supabase, id, patch);
      await refreshClientes();
    },
    deleteCliente: async (id: string) => {
      await ClientesSvc.deleteCliente(supabase, id);
      await refreshClientes();
    },
    addInteracao: async (clienteId: string, texto: string) => {
      if (!userId) return;
      await ClientesSvc.addInteracao(supabase, clienteId, texto, userId);
      await refreshClientes();
    },
    findClientePorDocumento: (cpfCnpj: string, excludeId?: string) => ClientesSvc.findClientePorDocumento(supabase, cpfCnpj, excludeId),
    // Prestadores
    createPrestador: async (input: any) => {
      if (!userId) return null;
      const p = await PrestadoresSvc.createPrestador(supabase, input, userId);
      await refreshPrestadores();
      return p;
    },
    updatePrestador: async (id: string, patch: Record<string, any>) => {
      await PrestadoresSvc.updatePrestador(supabase, id, patch);
      await refreshPrestadores();
    },
    deletePrestador: async (id: string) => {
      await PrestadoresSvc.deletePrestador(supabase, id);
      await refreshPrestadores();
    },
    updateAvaliacao: async (prestadorId: string, campo: string, valor: number) => {
      await PrestadoresSvc.updateAvaliacao(supabase, prestadorId, campo, valor);
      await refreshPrestadores();
    },
    findPrestadorPorDocumento: (cpfCnpj: string, excludeId?: string) => PrestadoresSvc.findPrestadorPorDocumento(supabase, cpfCnpj, excludeId),
    // Catálogos
    createFornecedor: async (input: any) => {
      const f = await CatalogosSvc.createFornecedor(supabase, input);
      await refreshCatalogos();
      return f;
    },
    createMaterialCatalogo: async (input: any) => {
      const m = await CatalogosSvc.createMaterialCatalogo(supabase, input);
      await refreshCatalogos();
      return m;
    },
    createServico: async (input: any) => {
      const s = await CatalogosSvc.createServico(supabase, input);
      await refreshCatalogos();
      return s;
    },
    addCategoriaFinanceiro: async (nome: string) => {
      await CatalogosSvc.getOrCreate(supabase, "categorias_financeiro", nome);
      await refreshCatalogos();
    },
    addCategoriaMaterial: async (nome: string) => {
      await CatalogosSvc.getOrCreate(supabase, "categorias_materiais", nome);
      await refreshCatalogos();
    },
    addEspecialidade: async (nome: string) => {
      await CatalogosSvc.getOrCreate(supabase, "especialidades", nome);
      await refreshCatalogos();
    },
    findFornecedorPorDocumento: (cpfCnpj: string) => CatalogosSvc.findFornecedorPorDocumento(supabase, cpfCnpj),
    resolveCategoriaMaterialId: (nome: string) => (nome ? CatalogosSvc.getOrCreate(supabase, "categorias_materiais", nome) : Promise.resolve(null)),
    resolveCategoriaFinanceiroId: (nome: string) => (nome ? CatalogosSvc.getOrCreate(supabase, "categorias_financeiro", nome) : Promise.resolve(null)),
    // Acesso direto para a tela de Configurações → Catálogos, que precisa
    // listar TODOS os registros (ativos e inativos) e fazer CRUD completo —
    // em vez de duplicar mais uma dúzia de ações aqui, ela usa os services
    // de catalogos.ts diretamente com este mesmo client, e chama
    // refreshCatalogos() depois de qualquer alteração para que o resto do
    // sistema (pickers de "+ Novo") também veja a mudança na hora.
    supabase,
    refreshCatalogos,
    // Usuários
    updateUsuario: async (id: string, patch: any) => {
      await UsuariosSvc.updateUsuario(supabase, id, patch);
      await refreshUsuarios();
    },
    criarUsuario: async (input: any) => {
      await UsuariosSvc.criarUsuario(input);
      await refreshUsuarios();
    },
    refresh: loadAll,
  };

  return { data, loading, error, ...actions };
}
