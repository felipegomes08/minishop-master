## Causa raiz

Após o reforço de RLS multi-tenant, todas as políticas de `INSERT/UPDATE` exigem `company_id IS NOT NULL AND user_belongs_to_company(...) AND has_role(..., 'admin')`.

As páginas administrativas antigas (Produtos, Categorias, Atributos, Clientes, Vendas, Cupons, Configurações) **não enviam `company_id`** nos inserts/updates — elas dependiam de policies antigas mais permissivas. Por isso, o `WITH CHECK` falha com `42501: new row violates row-level security policy`.

A página Despesas funciona porque já usa `useCompanyContext()` e injeta `company_id`.

## Correção

Em cada página afetada:

1. Importar `useCompanyContext` e obter `companyId`.
2. Filtrar todas as queries `SELECT` por `.eq('company_id', companyId)` (defesa em profundidade — RLS já filtra, mas garante consistência).
3. Incluir `company_id: companyId` em todos os payloads de `INSERT`.
4. Em updates/deletes, adicionar `.eq('company_id', companyId)` por segurança.
5. Bloquear submit se `companyId` estiver indisponível.

### Páginas a editar

| Página | Tabelas envolvidas |
|---|---|
| `src/pages/Categories.tsx` | `categories` |
| `src/pages/Attributes.tsx` | `product_attributes`, `attribute_options` (via attribute_id; herda) |
| `src/pages/Customers.tsx` | `customers`, `customer_coupons` (herda) |
| `src/pages/Coupons.tsx` | `coupons` |
| `src/pages/Products.tsx` | `products`, `product_variants`, `product_variant_options` (herda) |
| `src/pages/Sales.tsx` | `sales` (sale_items herda via sale_id) |
| `src/pages/Settings.tsx` | atualizar `companies` (logo, cores, whatsapp) em vez de `store_settings` legado |

### Observação sobre Settings

A tela `Settings.tsx` está escrevendo em `store_settings`, que agora é restrito apenas a super admins (legado). Vou redirecioná-la para atualizar a tabela `companies` da empresa logada (campos `logo_url`, `primary_color`, `secondary_color`, `whatsapp_number`, `name`), que é o local correto na arquitetura multi-tenant atual.

### Componentes auxiliares

Verificar e ajustar `ProductVariantEditor` e `ImportFromPhotoDialog` se eles fizerem inserts diretos em `product_variants` / `products` sem `company_id`.

## Resultado esperado

Após o ajuste, o usuário da Streetware (e qualquer empresa nova) consegue criar/editar Produtos, Categorias, Atributos, Clientes, Vendas, Cupons e Configurações normalmente, com isolamento total entre empresas.