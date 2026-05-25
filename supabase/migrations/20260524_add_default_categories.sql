-- Migración: crear categorías por defecto para usuarios nuevos y existentes
-- Ejecutar en el SQL Editor de Supabase Dashboard

-- 1. Insertar categorías por defecto para los usuarios existentes que no las tengan
INSERT INTO public.categories (user_id, name, type, color)
SELECT u.id, c.name, c.type, c.color
FROM auth.users u
CROSS JOIN (
  VALUES 
    ('Alimentación', 'expense', '#F38181'),
    ('Transporte', 'expense', '#4ECDC4'),
    ('Servicios básicos', 'expense', '#3B82F6'),
    ('Hogar', 'expense', '#AA96DA'),
    ('Salud', 'expense', '#FFB067'),
    ('Educación', 'expense', '#9CA3AF'),
    ('Entretenimiento', 'expense', '#F87171'),
    ('Deudas', 'expense', '#FBBF24'),
    ('Salario', 'income', '#34D399')
) AS c(name, type, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories cat 
  WHERE cat.user_id = u.id AND cat.name = c.name
);

-- 2. Crear función para asignar categorías a los nuevos usuarios automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color)
  VALUES
    (NEW.id, 'Alimentación', 'expense', '#F38181'),
    (NEW.id, 'Transporte', 'expense', '#4ECDC4'),
    (NEW.id, 'Servicios básicos', 'expense', '#3B82F6'),
    (NEW.id, 'Hogar', 'expense', '#AA96DA'),
    (NEW.id, 'Salud', 'expense', '#FFB067'),
    (NEW.id, 'Educación', 'expense', '#9CA3AF'),
    (NEW.id, 'Entretenimiento', 'expense', '#F87171'),
    (NEW.id, 'Deudas', 'expense', '#FBBF24'),
    (NEW.id, 'Salario', 'income', '#34D399');
  RETURN NEW;
END;
$$;

-- 3. Crear el trigger para que se ejecute al registrar un nuevo usuario
DROP TRIGGER IF EXISTS on_auth_user_created_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_categories();
