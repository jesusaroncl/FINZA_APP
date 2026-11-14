import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cierra la sesión aunque el servidor de Supabase no responda.
 * signOut() (incluso con scope 'local') devuelve error sin borrar la sesión
 * ante fallos de red, así que como último recurso se borran las cookies sb-*.
 */
export async function forceSignOut(supabase: SupabaseClient) {
  const { error } = await supabase.auth.signOut()
  if (!error) return

  const { error: localError } = await supabase.auth.signOut({ scope: 'local' })
  if (!localError) return

  console.error('[signOut] fallback a borrado de cookies:', localError.message)
  document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((name) => name.startsWith('sb-'))
    .forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/`
    })
}
