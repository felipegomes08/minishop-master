// Limites de usuários por plano (deve bater com a landing page)
export const PLAN_USER_LIMITS: Record<string, number> = {
  bronze: 1,
  prata: 3,
  ouro: 10,
};

export function getUserLimitForPlan(planTier: string | null | undefined): number {
  if (!planTier) return 1;
  return PLAN_USER_LIMITS[planTier] ?? 1;
}

// Limites de produtos por plano
export const PLAN_PRODUCT_LIMITS: Record<string, number | null> = {
  bronze: 50,
  prata: 100,
  ouro: null,
};

export function getProductLimitForPlan(planTier: string | null | undefined): number | null {
  if (!planTier) return 50;
  return PLAN_PRODUCT_LIMITS[planTier] ?? 50;
}

// Limites de imagens por produto, por plano
export const PLAN_IMAGE_LIMITS: Record<string, number> = {
  bronze: 3,
  prata: 6,
  ouro: 10,
};

export function getImageLimitForPlan(planTier: string | null | undefined): number {
  if (!planTier) return 3;
  return PLAN_IMAGE_LIMITS[planTier] ?? 3;
}

// Chaves de menu disponíveis para permissão
export interface MenuKeyDef {
  key: string;
  label: string;
  alwaysOn?: boolean;
}

export const MENU_KEYS: MenuKeyDef[] = [
  { key: 'dashboard', label: 'Painel', alwaysOn: true },
  { key: 'products', label: 'Produtos' },
  { key: 'categories', label: 'Categorias' },
  { key: 'attributes', label: 'Atributos' },
  { key: 'customers', label: 'Clientes' },
  { key: 'sales', label: 'Vendas' },
  { key: 'expenses', label: 'Despesas' },
  { key: 'coupons', label: 'Cupons' },
  { key: 'financial', label: 'Financeiro' },
  { key: 'users', label: 'Usuários' },
  { key: 'settings', label: 'Configurações' },
];

export const PATH_TO_MENU_KEY: Record<string, string> = {
  '/': 'dashboard',
  '/products': 'products',
  '/categories': 'categories',
  '/attributes': 'attributes',
  '/customers': 'customers',
  '/sales': 'sales',
  '/expenses': 'expenses',
  '/coupons': 'coupons',
  '/financial': 'financial',
  '/users': 'users',
  '/settings': 'settings',
};
