import type { SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_CATEGORY_NAMES = [
  'Salud',
  'Salario',
  'Comida',
  'Transporte',
  'Servicios Básicos',
  'Entretenimiento',
  'Deudas',
  'Ahorro',
]

const DEFAULT_CATEGORIES = [
  { name: 'Salario',           type: 'income',  color: '#22C55E', icon: 'briefcase' },
  { name: 'Ahorro',            type: 'income',  color: '#14B8A6', icon: 'star' },
  { name: 'Salud',             type: 'expense', color: '#EF4444', icon: 'heart-pulse' },
  { name: 'Comida',            type: 'expense', color: '#F97316', icon: 'utensils' },
  { name: 'Transporte',        type: 'expense', color: '#3B82F6', icon: 'car' },
  { name: 'Servicios Básicos', type: 'expense', color: '#8B5CF6', icon: 'zap' },
  { name: 'Entretenimiento',   type: 'expense', color: '#EC4899', icon: 'gamepad' },
  { name: 'Deudas',            type: 'expense', color: '#64748B', icon: 'credit-card' },
] as const

export async function ensureDefaultCategories(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase
    .from('categories')
    .select('name')
    .eq('user_id', userId)

  const existingNames = new Set((existing ?? []).map((c: { name: string }) => c.name))

  const missing = DEFAULT_CATEGORIES.filter((c) => !existingNames.has(c.name))
  if (missing.length === 0) return

  await supabase.from('categories').insert(
    missing.map((c) => ({ ...c, user_id: userId }))
  )
}

export async function cleanupNonDefaultCategories(supabase: SupabaseClient, userId: string) {
  const { data: allCats } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)

  if (!allCats) return

  const defaultNames = new Set(DEFAULT_CATEGORY_NAMES)
  const nonDefault = allCats.filter(c => !defaultNames.has(c.name))
  if (nonDefault.length === 0) return

  const nonDefaultIds = nonDefault.map(c => c.id)

  // Obtener el id de "Servicios Básicos"
  const serviciosBasicos = allCats.find(c => c.name === 'Servicios Básicos')
  if (!serviciosBasicos) return

  // Reasignar transacciones de categorías no-default a Servicios Básicos
  await supabase
    .from('transactions')
    .update({ category_id: serviciosBasicos.id })
    .eq('user_id', userId)
    .in('category_id', nonDefaultIds)

  // Reasignar gastos recurrentes de categorías no-default a Servicios Básicos
  await supabase
    .from('recurring_expenses')
    .update({ category_id: serviciosBasicos.id })
    .eq('user_id', userId)
    .in('category_id', nonDefaultIds)

  // Borrar las categorías no-default
  await supabase
    .from('categories')
    .delete()
    .eq('user_id', userId)
    .in('id', nonDefaultIds)
}
