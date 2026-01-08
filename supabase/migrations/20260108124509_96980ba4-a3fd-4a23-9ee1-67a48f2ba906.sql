-- Create product_attributes table (e.g., "Tamanho", "Cor", "Material")
CREATE TABLE public.product_attributes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attribute_options table (e.g., "P", "M", "G" for Tamanho)
CREATE TABLE public.attribute_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    attribute_id UUID NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_variants table (specific variant of a product with its own stock/price)
CREATE TABLE public.product_variants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT,
    price_adjustment NUMERIC DEFAULT 0,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_variant_options table (links a variant to its selected options)
CREATE TABLE public.product_variant_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.attribute_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(variant_id, option_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_attributes
CREATE POLICY "Admins can manage product attributes"
ON public.product_attributes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active product attributes"
ON public.product_attributes
FOR SELECT
USING (is_active = true);

-- RLS Policies for attribute_options
CREATE POLICY "Admins can manage attribute options"
ON public.attribute_options
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view attribute options"
ON public.attribute_options
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.product_attributes 
    WHERE id = attribute_options.attribute_id AND is_active = true
));

-- RLS Policies for product_variants
CREATE POLICY "Admins can manage product variants"
ON public.product_variants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active product variants"
ON public.product_variants
FOR SELECT
USING (is_active = true AND EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = product_variants.product_id AND is_active = true
));

-- RLS Policies for product_variant_options
CREATE POLICY "Admins can manage product variant options"
ON public.product_variant_options
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view product variant options"
ON public.product_variant_options
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = product_variant_options.variant_id 
    AND pv.is_active = true 
    AND p.is_active = true
));

-- Create indexes for performance
CREATE INDEX idx_attribute_options_attribute_id ON public.attribute_options(attribute_id);
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variant_options_variant_id ON public.product_variant_options(variant_id);
CREATE INDEX idx_product_variant_options_option_id ON public.product_variant_options(option_id);

-- Create triggers for updated_at
CREATE TRIGGER update_product_attributes_updated_at
BEFORE UPDATE ON public.product_attributes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attribute_options_updated_at
BEFORE UPDATE ON public.attribute_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();