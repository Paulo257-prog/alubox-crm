import type { UserRole } from "@/types/domain";

export const ROLES: UserRole[] = ["ADMINISTRADOR", "GESTOR", "OPERACIONAL", "VISUALIZACAO"];

export type Permission = "criar" | "editar" | "excluir" | "financeiro" | "catalogos" | "usuarios" | "config";

// Mesma matriz de alubox-permissoes.md. IMPORTANTE: isto só controla o que
// aparece na tela. A permissão de verdade é garantida pelas políticas de
// RLS em supabase/migrations/0002_rls.sql — mesmo que alguém adultere o
// frontend, o banco recusa a operação.
const ROLE_PERMS: Record<UserRole, Record<Permission, boolean>> = {
  ADMINISTRADOR: { criar: true, editar: true, excluir: true, financeiro: true, catalogos: true, usuarios: true, config: true },
  GESTOR: { criar: true, editar: true, excluir: true, financeiro: true, catalogos: true, usuarios: false, config: false },
  OPERACIONAL: { criar: true, editar: true, excluir: false, financeiro: false, catalogos: false, usuarios: false, config: false },
  VISUALIZACAO: { criar: false, editar: false, excluir: false, financeiro: false, catalogos: false, usuarios: false, config: false },
};

export function can(user: { role: UserRole } | null | undefined, perm: Permission): boolean {
  if (!user) return false;
  return !!ROLE_PERMS[user.role]?.[perm];
}
