
# Tela de Despesas com Leitor de Notinha

## Objetivo

Criar uma nova tela administrativa **Despesas**, no mesmo padrão visual e funcional da tela de **Vendas**, para registrar gastos da empresa e permitir comparar:

```text
Entradas: vendas
Saídas: despesas
Resultado: entradas - saídas
```

## O que será implementado

### 1. Banco de dados

Criar uma nova tabela `expenses` com isolamento por empresa:

- `id`
- `company_id`
- `title` — nome/descrição curta da despesa
- `description` — observações opcionais
- `category` — categoria simples, ex: Aluguel, Compra de produtos, Marketing, Taxas, Outros
- `amount` — valor da despesa
- `expense_date` — data da despesa
- `payment_method` — Pix, dinheiro, cartão, boleto, transferência, outros
- `receipt_image_url` — opcional, caso seja decidido salvar a imagem da notinha
- `created_at`
- `updated_at`

Regras de segurança:
- Usuários administradores só acessam despesas da própria empresa.
- Super Admin consegue gerenciar todas.
- A tabela seguirá o mesmo padrão multiempresa já usado em vendas, produtos e clientes.

### 2. Leitor de notinha com IA

Criar uma função de backend `extract-expense-from-receipt`.

Funcionamento:

```text
Usuário anexa/tira foto da notinha
        ↓
Imagem é enviada para a IA
        ↓
IA retorna valor, data, estabelecimento e sugestão de categoria
        ↓
Formulário de despesa é preenchido automaticamente
        ↓
Usuário revisa e salva
```

Campos extraídos pela IA:
- valor total
- data da compra, se estiver visível
- nome do estabelecimento/fornecedor, se estiver visível
- categoria sugerida
- descrição curta

A foto será usada para leitura da notinha. A implementação pode manter a imagem apenas em memória durante a extração, evitando salvar automaticamente arquivos sensíveis. Se quiser guardar comprovantes para consulta posterior, será possível salvar também o `receipt_image_url`.

### 3. Nova página `Despesas`

Criar `src/pages/Expenses.tsx`, seguindo o formato da tela de Vendas:

Funcionalidades:
- Listagem de despesas
- Filtro por busca
- Filtro por período
- Cards de resumo:
  - Total de despesas no período
  - Total de vendas no período
  - Saldo do período
- Botão **Nova Despesa**
- Criar despesa manualmente
- Usar leitor de notinha para preencher os dados
- Editar despesa
- Ver detalhes
- Excluir despesa com confirmação
- Loading states e empty states no padrão atual

Campos do formulário:
- Título
- Valor
- Data
- Categoria
- Forma de pagamento
- Observações
- Anexar/ler notinha com IA

### 4. Navegação

Adicionar a nova tela ao menu lateral:

```text
Painel
Produtos
Categorias
Atributos
Clientes
Vendas
Despesas
Cupons
Configurações
```

Também adicionar a rota protegida:

```text
/expenses
```

A tela será acessível apenas para usuários administradores da empresa, igual à tela de Vendas.

### 5. Balanço entre entradas e saídas

Na própria tela de Despesas, o usuário verá o resumo financeiro do período:

```text
Entradas        R$ 10.000,00
Saídas          R$  3.200,00
Saldo           R$  6.800,00
```

O saldo ficará visualmente:
- verde quando positivo
- vermelho quando negativo
- neutro quando zerado

Também será possível futuramente levar esse mesmo cálculo para o Painel principal.

## Arquivos que serão criados/alterados

### Novos arquivos
- `src/pages/Expenses.tsx`
- `supabase/functions/extract-expense-from-receipt/index.ts`
- nova migration para tabela `expenses`

### Arquivos alterados
- `src/App.tsx` — adicionar rota `/expenses`
- `src/components/layout/AdminLayout.tsx` — adicionar item no menu
- `supabase/config.toml` — configurar a função de leitura da notinha, se necessário

## Detalhes técnicos

- A leitura da notinha usará Lovable AI, aproveitando a chave já configurada no projeto.
- A chamada será feita por `supabase.functions.invoke('extract-expense-from-receipt')`.
- A imagem será enviada em base64, como já acontece no importador de produtos por foto.
- A tabela terá RLS com `company_id`, mantendo o isolamento entre empresas.
- A página seguirá os componentes existentes: `Dialog`, `AlertDialog`, `Input`, `Select`, `Badge`, `Calendar`, `Popover`, `Skeleton`, `Button` e `toast`.
- Todo o texto da interface será em pt-BR e valores serão formatados em BRL.
