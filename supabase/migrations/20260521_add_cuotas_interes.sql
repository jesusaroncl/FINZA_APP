-- Migración: agregar columnas de cuotas e intereses a la tabla transactions
-- Ejecutar en el SQL Editor de Supabase Dashboard

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS cuotas integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS interes_tipo text NOT NULL DEFAULT 'Sin Intereses',
  ADD COLUMN IF NOT EXISTS interes_tasa numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_por_cuota numeric(12,2);

-- Comentarios de columnas
COMMENT ON COLUMN transactions.cuotas IS 'Número de cuotas (1 = pago único)';
COMMENT ON COLUMN transactions.interes_tipo IS 'Tipo de interés: Sin Intereses, 5%, 10%, etc.';
COMMENT ON COLUMN transactions.interes_tasa IS 'Tasa de interés como porcentaje (ej: 15 = 15%)';
COMMENT ON COLUMN transactions.monto_por_cuota IS 'Monto calculado por cuota después de aplicar interés';
