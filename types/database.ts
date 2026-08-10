// Tipos do banco, no formato que o comando `supabase gen types typescript`
// gera automaticamente. Este arquivo é uma versão escrita à mão, compatível
// com o schema em supabase/migrations — quando o projeto Supabase existir de
// verdade, rode:
//
//   npx supabase gen types typescript --project-id SEU-PROJETO > types/database.ts
//
// para substituir este arquivo pelo gerado automaticamente (fica sempre
// perfeitamente sincronizado com o banco real).

export type UserRole = "ADMINISTRADOR" | "GESTOR" | "OPERACIONAL" | "VISUALIZACAO";
export type ObraStatus = "ORCAMENTO" | "PLANEJAMENTO" | "EXECUCAO" | "FINALIZADO";
export type TarefaStatus = "Pendente" | "Em andamento" | "Concluída" | "Atrasada";
export type TarefaPrioridade = "Baixa" | "Média" | "Alta" | "Urgente";
export type LancamentoTipo = "receita" | "despesa";
export type FotoCategoria = "Antes" | "Durante" | "Depois";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; // = auth.users.id
          nome: string;
          role: UserRole;
          ativo: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; nome: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      clientes: {
        Row: {
          id: string;
          nome: string;
          cpf_cnpj: string | null;
          telefone: string | null;
          whatsapp: string | null;
          email: string | null;
          endereco: string | null;
          cidade: string | null;
          observacoes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["clientes"]["Row"]> & { nome: string };
        Update: Partial<Database["public"]["Tables"]["clientes"]["Row"]>;
      };
      cliente_interacoes: {
        Row: { id: string; cliente_id: string; texto: string; created_by: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["cliente_interacoes"]["Row"]> & { cliente_id: string; texto: string };
        Update: Partial<Database["public"]["Tables"]["cliente_interacoes"]["Row"]>;
      };
      especialidades: { Row: { id: string; nome: string }; Insert: { id?: string; nome: string }; Update: { nome?: string } };
      prestadores: {
        Row: {
          id: string;
          nome: string;
          cpf_cnpj: string | null;
          telefone: string | null;
          whatsapp: string | null;
          email: string | null;
          cidade: string | null;
          endereco: string | null;
          especialidade_id: string | null;
          status: string;
          valor_diaria: number | null;
          valor_hora: number | null;
          observacoes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["prestadores"]["Row"]> & { nome: string };
        Update: Partial<Database["public"]["Tables"]["prestadores"]["Row"]>;
      };
      prestador_avaliacoes: {
        Row: {
          id: string;
          prestador_id: string;
          qualidade: number | null;
          prazo: number | null;
          organizacao: number | null;
          comunicacao: number | null;
          custo_beneficio: number | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["prestador_avaliacoes"]["Row"]> & { prestador_id: string };
        Update: Partial<Database["public"]["Tables"]["prestador_avaliacoes"]["Row"]>;
      };
      fornecedores: {
        Row: { id: string; nome: string; cpf_cnpj: string | null; telefone: string | null; cidade: string | null; observacoes: string | null; created_at: string; deleted_at: string | null };
        Insert: Partial<Database["public"]["Tables"]["fornecedores"]["Row"]> & { nome: string };
        Update: Partial<Database["public"]["Tables"]["fornecedores"]["Row"]>;
      };
      categorias_materiais: { Row: { id: string; nome: string }; Insert: { id?: string; nome: string }; Update: { nome?: string } };
      categorias_financeiro: { Row: { id: string; nome: string }; Insert: { id?: string; nome: string }; Update: { nome?: string } };
      materiais_catalogo: {
        Row: { id: string; nome: string; categoria_id: string | null; unidade: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["materiais_catalogo"]["Row"]> & { nome: string };
        Update: Partial<Database["public"]["Tables"]["materiais_catalogo"]["Row"]>;
      };
      servicos_catalogo: {
        Row: { id: string; nome: string; categoria: string | null; valor_padrao: number | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["servicos_catalogo"]["Row"]> & { nome: string };
        Update: Partial<Database["public"]["Tables"]["servicos_catalogo"]["Row"]>;
      };
      obras: {
        Row: {
          id: string;
          codigo: string;
          nome: string;
          cliente_id: string | null;
          endereco: string | null;
          cidade: string | null;
          tipo_imovel: string | null;
          responsavel_id: string | null;
          status: ObraStatus;
          data_cadastro: string;
          data_prev_inicio: string | null;
          data_prev_termino: string | null;
          data_real_inicio: string | null;
          data_real_termino: string | null;
          valor_orcamento: number | null;
          valor_contratado: number | null;
          custo_estimado: number | null;
          descricao: string | null;
          observacoes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["obras"]["Row"]> & { codigo: string; nome: string };
        Update: Partial<Database["public"]["Tables"]["obras"]["Row"]>;
      };
      obra_prestadores: {
        Row: { obra_id: string; prestador_id: string; vinculado_em: string };
        Insert: { obra_id: string; prestador_id: string };
        Update: Partial<Database["public"]["Tables"]["obra_prestadores"]["Row"]>;
      };
      tarefas: {
        Row: {
          id: string;
          obra_id: string;
          servico_id: string | null;
          nome: string;
          responsavel_id: string | null;
          prestador_id: string | null;
          data_inicio: string | null;
          data_termino: string | null;
          status: TarefaStatus;
          prioridade: TarefaPrioridade;
          valor: number | null;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tarefas"]["Row"]> & { obra_id: string; nome: string };
        Update: Partial<Database["public"]["Tables"]["tarefas"]["Row"]>;
      };
      obra_materiais: {
        Row: {
          id: string;
          obra_id: string;
          material_catalogo_id: string | null;
          nome: string;
          categoria_id: string | null;
          quantidade: number | null;
          unidade: string | null;
          fornecedor_id: string | null;
          valor_previsto: number | null;
          valor_comprado: number | null;
          data_compra: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["obra_materiais"]["Row"]> & { obra_id: string; nome: string };
        Update: Partial<Database["public"]["Tables"]["obra_materiais"]["Row"]>;
      };
      obra_financeiro: {
        Row: {
          id: string;
          obra_id: string;
          tipo: LancamentoTipo;
          descricao: string | null;
          categoria_id: string | null;
          valor: number;
          data: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["obra_financeiro"]["Row"]> & { obra_id: string; tipo: LancamentoTipo; valor: number };
        Update: Partial<Database["public"]["Tables"]["obra_financeiro"]["Row"]>;
      };
      obra_fotos: {
        Row: { id: string; obra_id: string; storage_key: string; url: string; categoria: FotoCategoria; legenda: string | null; uploaded_by: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["obra_fotos"]["Row"]> & { obra_id: string; storage_key: string; url: string; categoria: FotoCategoria };
        Update: Partial<Database["public"]["Tables"]["obra_fotos"]["Row"]>;
      };
      obra_documentos: {
        Row: { id: string; obra_id: string; storage_key: string; url: string; nome: string; tipo: string | null; data: string; uploaded_by: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["obra_documentos"]["Row"]> & { obra_id: string; storage_key: string; url: string; nome: string };
        Update: Partial<Database["public"]["Tables"]["obra_documentos"]["Row"]>;
      };
      obra_historico: {
        Row: { id: string; obra_id: string; texto: string; created_by: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["obra_historico"]["Row"]> & { obra_id: string; texto: string };
        Update: Partial<Database["public"]["Tables"]["obra_historico"]["Row"]>;
      };
    };
  };
}
