-- Add cost_price column to products table
ALTER TABLE public.products 
ADD COLUMN cost_price numeric NULL;

COMMENT ON COLUMN public.products.cost_price IS 'Valor de compra/custo do produto (valor pago ao fornecedor)';