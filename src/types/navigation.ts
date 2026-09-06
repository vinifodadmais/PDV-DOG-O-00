/**
 * Identificadores das páginas do sistema.
 * "produtos" (catálogo + categorias) já está implementado; as demais
 * páginas de operação (vendas, estoque, caixa) ainda são placeholders.
 */
export type PageId =
  | "inicio"
  | "produtos"
  | "vendas"
  | "pedidos"
  | "estoque"
  | "caixa"
  | "configuracoes"
  | "admin-cardapio";

/**
 * Nomes de ícone disponíveis (implementados em components/ui/Icon.tsx).
 * Fica em types/ porque é um contrato compartilhado entre a navegação
 * e a camada de UI, não um detalhe interno do componente de ícone.
 */
export type IconName =
  | "home"
  | "sale"
  | "box"
  | "cash"
  | "settings"
  | "menu"
  | "clock"
  | "tag"
  | "plus"
  | "edit"
  | "trash"
  | "search"
  | "image"
  | "close"
  | "chevronUp"
  | "chevronDown"
  | "alert"
  | "minus"
  | "check"
  | "receipt"
  | "printer"
  | "shield";

export interface NavItem {
  id: PageId;
  label: string;
  icon: IconName;
}
