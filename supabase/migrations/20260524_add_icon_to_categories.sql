-- Migración: agregar columna icon a la tabla categories
-- Ejecutar en el SQL Editor de Supabase Dashboard

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon text;
