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

// Chaves de menu disponíveis para permissão
export const MENU_KEYS = [
  { key: 'dashboard', label: 'Painel', alwaysOn: true },
  { key: 'products', label: 'Produtos' },
  { key: 'categories', label: 'Categorias' },
  { key: 'attributes', label: 'Atributos' },
  { key: 'customers', label: 'Clientes' },
  { key: 'sales', label: 'Vendas' },
  { key: 'expenses', label: 'Despesas' },
  { key: 'coupons', label: 'Cupons' },
  { key: 'users', label: 'Usuários' },
  { key: 'settings', label: 'Configurações' },
] as const;

export const PATH_TO_MENU_KEY: Record<string, string> = {
  '/': 'dashboard',
  '/products': 'products',
  '/categories': 'categories',
  '/attributes': 'attributes',
  '/customers': 'customers',
  '/sales': 'sales',
  '/expenses': 'expenses',
  '/coupons': 'coupons',
  '/users': 'users',
  '/settings': 'settings',
};
