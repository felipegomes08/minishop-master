CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Outros',
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'Outros',
  receipt_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage their expenses"
ON public.expenses
FOR ALL
USING (
  company_id IS NOT NULL
  AND public.user_belongs_to_company(auth.uid(), company_id)
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id IS NOT NULL
  AND public.user_belongs_to_company(auth.uid(), company_id)
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Super admins can manage all expenses"
ON public.expenses
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE INDEX idx_expenses_company_date ON public.expenses(company_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category);

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();