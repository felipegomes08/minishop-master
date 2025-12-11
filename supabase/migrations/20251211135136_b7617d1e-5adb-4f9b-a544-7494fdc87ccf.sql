-- Tabela de banners
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  title TEXT,
  link TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage banners" ON public.banners
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active banners" ON public.banners
FOR SELECT USING (is_active = true);

CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON public.banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de cupons
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_purchase NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons" ON public.coupons
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active coupons" ON public.coupons
FOR SELECT USING (is_active = true);

CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de cupons por cliente
CREATE TABLE public.customer_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, coupon_id)
);

ALTER TABLE public.customer_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customer coupons" ON public.customer_coupons
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar campos de desconto na tabela sales
ALTER TABLE public.sales 
ADD COLUMN coupon_id UUID REFERENCES public.coupons(id),
ADD COLUMN coupon_discount NUMERIC DEFAULT 0,
ADD COLUMN manual_discount NUMERIC DEFAULT 0,
ADD COLUMN subtotal NUMERIC DEFAULT 0;