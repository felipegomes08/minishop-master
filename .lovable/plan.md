

# Plano: Configurar Super Admin e Primeira Empresa Cliente

## Resumo
Você (Felipe Gomes) será o administrador supremo da plataforma SaaS, com acesso total ao painel Master. A Shine Pratas será a primeira empresa cliente, com seu próprio admin (shine925pratas@gmail.com).

---

## Fase 1: Criar Usuário Super Admin

### 1.1 Criar seu usuário via Edge Function
Usar a edge function `create-admin-user` existente para criar sua conta:
- Email: felipecgomes01@hotmail.com
- Senha: Felipe01
- Email já confirmado automaticamente

### 1.2 Registrar como Super Admin
Inserir seu user_id na tabela `master_admins` com role `super_admin`

---

## Fase 2: Criar Empresa Shine Pratas

### 2.1 Inserir empresa na tabela `companies`
```text
- Nome: Shine Pratas
- Slug: shine-pratas
- Logo: (logo atual do store_settings)
- Cores: #ec6093 / #f39bbb
- WhatsApp: 5534998648832
- Status: Ativo
```

### 2.2 Vincular usuário Shine como admin da empresa
Inserir na tabela `company_users`:
- company_id: (ID da Shine)
- user_id: e8a8d5a2-e8f5-4145-b854-86cd425c3f55 (shine925pratas@gmail.com)
- role: admin

---

## Fase 3: Migrar Dados Existentes

### 3.1 Atualizar todos os registros com company_id da Shine
- 16 produtos existentes
- Categorias
- Banners
- Vendas
- Clientes
- Cupons
- Atributos e variantes

---

## Fase 4: Atualizar Código

### 4.1 Catálogo público com slug
- Rota `/catalogo/:slug` para cada empresa
- Ex: `/catalogo/shine-pratas`

### 4.2 Painel admin filtrado por empresa
- Cada admin vê apenas dados da sua empresa
- Hook `useCompanyContext` já criado

---

## Estrutura Final de Acesso

| Usuário | Email | Papel | Acesso |
|---------|-------|-------|--------|
| Felipe Gomes | felipecgomes01@hotmail.com | Super Admin | /master + todas empresas |
| Shine | shine925pratas@gmail.com | Admin Empresa | /admin (apenas Shine) |

---

## Arquivos a Modificar/Criar

1. **Chamar edge function** para criar usuário Felipe
2. **Inserir dados** nas tabelas master_admins, companies, company_users
3. **Migrar dados** atualizando company_id nos registros existentes
4. **src/pages/Catalog.tsx** - Suporte a slug
5. **src/pages/ProductDetail.tsx** - Contexto de empresa
6. **Páginas admin** - Filtrar por company_id

