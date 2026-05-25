-- Migración: crear tabla recurring_expenses
-- Ejecutar en el SQL Editor de Supabase Dashboard

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  amount numeric NOT NULL,
  frequency text CHECK (frequency IN ('semanal', 'mensual', 'anual')) NOT NULL,
  start_date date NOT NULL,
  last_processed_date date,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Políticas RLS para la nueva tabla
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring expenses" 
ON public.recurring_expenses FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring expenses" 
ON public.recurring_expenses FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring expenses" 
ON public.recurring_expenses FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring expenses" 
ON public.recurring_expenses FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
