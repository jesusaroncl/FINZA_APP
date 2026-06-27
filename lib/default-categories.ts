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
