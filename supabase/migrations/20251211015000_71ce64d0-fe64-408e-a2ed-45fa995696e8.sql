-- Adicionar campo whatsapp_number na tabela store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- Criar políticas de leitura pública para o catálogo
-- Produtos: leitura pública para produtos ativos
CREATE POLICY "Public can view active products" 
ON public.products 
FOR SELECT 
TO anon
USING (is_active = true);

-- Categorias: leitura pública
CREATE POLICY "Public can view categories" 
ON public.categories 
FOR SELECT 
TO anon
USING (true);

-- Configurações da loja: leitura pública
CREATE POLICY "Public can view store settings" 
ON public.store_settings 
FOR SELECT 
TO anon
USING (true);