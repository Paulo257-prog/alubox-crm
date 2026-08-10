// Formato "achatado" que os componentes de UI usam (mesmo shape que o
// protótipo original em React usava com window.storage) — o hook
// useAluboxStore.ts é quem converte as linhas do Supabase para este formato
// e vice-versa. Isso é o que permite reaproveitar a UI quase sem mudanças.

import type { ObraStatus, TarefaStatus, TarefaPrioridade, LancamentoTipo, FotoCategoria, UserRole } from "./database";
export type { ObraStatus, TarefaStatus, TarefaPrioridade, LancamentoTipo, FotoCategoria, UserRole } from "./database";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  cidade: string;
  observacoes: string;
  timeline: { id: string; texto: string; data: string }[];
}

export interface Prestador {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cidade: string;
  endereco: string;
  especialidade: string;
  especialidadeId: string | null;
  status: string;
  valorDiaria: string | number;
  valorHora: string | number;
  observacoes: string;
  avaliacoes: { qualidade: number; prazo: number; organizacao: number; comunicacao: number; custoBeneficio: number };
}

export interface Tarefa {
  id: string;
  nome: string;
  responsavel: string; // nome do responsável, para compatibilidade com a UI portada
  responsavelId: string | null;
  prestadorId: string;
  dataIni: string;
  dataFim: string;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  valor: string | number;
  observacoes: string;
}

export interface Material {
  id: string;
  material: string;
  materialCatalogoId: string | null;
  categoria: string;
  categoriaId: string | null;
  quantidade: string | number;
  unidade: string;
  fornecedor: string;
  fornecedorId: string | null;
  valorPrevisto: string | number;
  valorComprado: string | number;
  dataCompra: string;
  status: string;
}

export interface Lancamento {
  id: string;
  tipo: LancamentoTipo;
  descricao: string;
  categoria: string;
  categoriaId: string | null;
  valor: string | number;
  data: string;
}

export interface Foto {
  id: string;
  url: string;
  storageKey: string;
  categoria: FotoCategoria;
  legenda: string;
}

export interface Documento {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  storageKey: string;
  data: string;
}

export interface HistoricoItem {
  id: string;
  texto: string;
  data: string;
}

export interface Obra {
  id: string;
  codigo: string;
  nome: string;
  clienteId: string;
  endereco: string;
  cidade: string;
  tipoImovel: string;
  responsavel: string; // nome, para compatibilidade com a UI portada
  responsavelId: string | null;
  dataCadastro: string;
  dataPrevIni: string;
  dataPrevFim: string;
  dataRealIni: string;
  dataRealFim: string;
  status: ObraStatus;
  valorOrcamento: string | number;
  valorContratado: string | number;
  custoEstimado: string | number;
  descricao: string;
  observacoes: string;
  tarefas: Tarefa[];
  prestadoresIds: string[];
  materiais: Material[];
  financeiro: Lancamento[];
  fotos: Foto[];
  documentos: Documento[];
  historico: HistoricoItem[];
}

export interface CatalogoItem {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface AluboxData {
  obras: Obra[];
  clientes: Cliente[];
  prestadores: Prestador[];
  usuarios: Usuario[];
  responsaveis: Usuario[]; // lista de usuários ativos, usada nos seletores de "responsável"
  fornecedores: { id: string; nome: string; cpfCnpj: string; telefone: string; cidade: string; observacoes: string; ativo: boolean }[];
  materiaisCatalogo: { id: string; nome: string; categoria: string; categoriaId: string | null; unidade: string; ativo: boolean }[];
  servicos: { id: string; nome: string; categoria: string; valorPadrao: string | number; ativo: boolean }[];
  categoriasFinanceiro: string[];
  categoriasMateriais: string[];
  especialidades: string[];
}
