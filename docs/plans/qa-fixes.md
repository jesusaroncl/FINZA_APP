# Plan: correcciones de QA (Plan_Pruebas_Ejecucion Vs2), v2 tras la revisión de Codex

## Objetivo
Corregir las 7 observaciones de QA: CP050, CP053, CP052, CP047, CP042, CP007 y CP005.

| QA | Observación | Confirmado en el código | Hipótesis (sin verificar; requiere config remota) |
|----|-------------|-------------------------|-------------------------------------------|
| CP050 | Tras "Cerrar sesión", Atrás vuelve a mostrar páginas protegidas | `components/sidebar.tsx:20-23`: logout con `router.push` (navegación cliente). El documento y el router cache de Next siguen vivos, así que Atrás restaura la vista sin pasar por `proxy.ts`. `proxy.ts:9-12` deja pasar la petición si `updateSession` lanza. Los redirects de `lib/supabase/middleware.ts` descartan las cookies de `supabaseResponse`. | — |
| CP007 | "¿Olvidaste tu contraseña?" da 404 | `login-form.tsx:103` enlaza a `/auth/forgot-password`, que no existe; tampoco existe una página de reset. | — |
| CP005 | El enlace de confirmación lleva a "sin conexión" | `register-form.tsx:66-68` prioriza `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`. `/auth/callback` solo acepta `code` (PKCE). `next` permite redirección abierta (`next=@evil.com`). | Que la variable esté en Vercel con localhost, o que el *Site URL* de Supabase sea localhost. Es lo más probable para "sin conexión", pero no está verificado. |
| CP042 | Guardar con campos vacíos no avisa | `upcoming-expenses.tsx:101-103` hace `return` en silencio; los errores de Supabase se ignoran. | — |
| CP047 | Recomendaciones vacías | `ml-service/main.py:106-107`: el modo heurístico (< 30 gastos) devuelve riesgos y recomendaciones vacíos SIEMPRE. `features.py:78-81` solo detecta cuotas con `cuotas > 1`, pero la app guarda cada cuota con `cuotas: 1` y descripción `"X (n/N)"`. Los cálculos del mes no tienen tope superior (cuentan cuotas futuras). `model_risks.py`: el score de reglas `ratio/0.3` se compara con un umbral de 0.3, así que SOBREENDEUDAMIENTO salta con un ratio de 0.09 y CATEGORIA_CRITICA con el 25%. `main.py:61` conserva la hora en `month_start` y excluye los gastos del día 1. | Que el servicio ML respondiera bien a QA (y no un 503 que el front oculta). |
| CP052 | No ve "avatars disponibles"; solo carga imagen local | No hay avatares predefinidos. | Contraste bajo del recuadro; QA usa la URL `/configuracion` (la ruta real es `/settings`). |
| CP053 | El avatar no se ve ni se mantiene | No hay validación JPG/PNG ≤ 2 MB. `profiles.update()` sin fila afecta 0 filas y aun así muestra éxito. | Que al usuario de QA le falte la fila en `profiles` o la política RLS. |

## Contexto relevante
- Next.js 16 App Router. La protección está en `proxy.ts` → `lib/supabase/middleware.ts` (`updateSession`). `lib/supabase/proxy.ts` es código muerto: NO tocarlo.
- Páginas `'use client'`; Supabase con `createClient()` de `@/lib/supabase/client`.
- Las páginas de auth usan `AuthContainer` y `AuthInput` (`components/auth/`). Hay que seguir su estilo. `app/auth/layout.tsx` ya fuerza el render dinámico.
- Los layouts protegidos (`app/{dashboard,movimientos,proyecciones,settings,help}/layout.tsx`) renderizan `<Sidebar />`.
- Estilo: Tailwind con hex inline, textos en español.
- ML: `ml-service/` (FastAPI, Python 3.11, pandas 2.2.3). Tests con pytest en `ml-service/tests/` (insertan `ml-service/` en `sys.path`).
- Las migraciones SQL solo se CREAN en `docs/migrations/` y NUNCA se aplican.

## Archivos a MODIFICAR

### 1. `components/sidebar.tsx` (CP050)
- `handleLogout`:
  ```ts
  const { error } = await supabase.auth.signOut()
  if (error) await supabase.auth.signOut({ scope: 'local' })
  window.location.replace('/auth/login')
  ```
  Es una navegación completa que reemplaza la entrada del historial y destruye el router cache del documento anterior. Quitar `useRouter` y su import si quedan sin uso.
- Añadir un `useEffect(() => { ... }, [])` (importar `useEffect`):
  - `const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') window.location.replace('/auth/login') })`. En el cleanup: `data.subscription.unsubscribe()`.
  - `const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) window.location.reload() }`, registrado con `window.addEventListener('pageshow', onPageShow)` y quitado en el cleanup. Cubre la restauración desde bfcache: la recarga pasa por `proxy.ts`, que redirige al login.
  - `supabase.auth.getSession().then(({ data }) => { if (!data.session) window.location.replace('/auth/login') })`.

### 2. `lib/supabase/middleware.ts` (CP050)
- Helper local:
  ```ts
  function redirectWithCookies(url: URL, from: NextResponse) {
    const res = NextResponse.redirect(url)
    from.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }
  ```
  Usarlo en los dos `return NextResponse.redirect(url)` existentes, pasando `supabaseResponse`.
- Antes del `return supabaseResponse` final: si `isProtectedRoute`, hacer `supabaseResponse.headers.set('Cache-Control', 'private, no-store, max-age=0')`.
- No cambiar nada entre `createServerClient` y `getUser()`. El redirect de usuario logueado sigue aplicando solo a `/auth/login` y `/auth/register`.

### 3. `proxy.ts` (CP050: fail-closed)
En el `catch`: si la ruta es protegida (`/dashboard`, `/movimientos`, `/proyecciones`, `/settings` o `/help`, con `startsWith`), redirigir a `/auth/login` (clonar `request.nextUrl` y cambiar `pathname`). Si no, mantener `NextResponse.next({ request })`. Conservar el `console.error`.

### 4. `app/auth/callback/route.ts` (CP005/CP007)
```ts
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const OTP_TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change']

function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/dashboard'
  }
  return value
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const rawType = searchParams.get('type')
  const type = OTP_TYPES.find((t) => t === rawType)
  const next = safeNext(searchParams.get('next'))

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('[auth/callback] exchange error:', error.message)
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('[auth/callback] verifyOtp error:', error.message)
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
```

### 5. `components/auth/register-form.tsx` (CP005)
- `emailRedirectTo`: `` `${window.location.origin}/auth/callback?next=/movimientos` ``. Eliminar el uso de `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`. Nada más.

### 6. `app/auth/error/page.tsx` (CP005)
- Texto: "El enlace no es válido o ya expiró. Si ya confirmaste tu cuenta, inicia sesión; si no, vuelve a registrarte o recupera tu contraseña."
- Añadir un enlace secundario a `/auth/forgot-password` ("Recuperar contraseña"), con estilo de botón outline (`border border-slate-300 text-slate-700`), debajo del actual. No cambiar el resto.

### 7. `components/auth/login-form.tsx` y `app/auth/login/page.tsx` (CP007)
- En `LoginForm`: `const searchParams = useSearchParams()` (de `next/navigation`). Si `searchParams.get('reset') === '1'`, mostrar encima del bloque de error: `<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">Contraseña actualizada. Inicia sesión con tu nueva contraseña.</div>`.
- En `app/auth/login/page.tsx`: envolver `<LoginForm />` en `<Suspense fallback={null}>`. Es la práctica recomendada para `useSearchParams` y evita romper el build si la página se vuelve estática.

### 8. `components/dashboard/upcoming-expenses.tsx` (CP042)
- Estados nuevos: `formError` (`''`) y `savingExpense` (`false`).
- Helper en el módulo `todayLocal()`, que devuelve `YYYY-MM-DD` local (`getFullYear`, `getMonth()+1` y `getDate` con `padStart(2,'0')`). Reemplaza `new Date().toISOString().split('T')[0]` en `openAddModal` y en el fallback de `openEditModal`. En `openEditModal`, si `expense.start_date` existe, mantener `split('T')[0]`.
- `openAddModal` y `openEditModal`: `setFormError('')`.
- `handleSave` completo:
  ```ts
  const missing: string[] = []
  if (!newName.trim()) missing.push('tipo de gasto')
  if (!newAmount) missing.push('monto')
  if (!newDate) missing.push('fecha')
  if (!newCategory) missing.push('categoría')
  if (missing.length > 0) { setFormError(`Completa todos los campos obligatorios: ${missing.join(', ')}.`); return }
  const val = Number(newAmount)
  if (!Number.isFinite(val) || val <= 0) { setFormError('El monto debe ser mayor a 0.'); return }
  setFormError(''); setSavingExpense(true)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setFormError('Tu sesión expiró. Vuelve a iniciar sesión.'); return }
    const row = { name: newName.trim(), amount: val, frequency: newFreq, start_date: newDate, category_id: newCategory }
    const { data, error } = editingId
      ? await supabase.from('recurring_expenses').update(row).eq('id', editingId).select('id')
      : await supabase.from('recurring_expenses').insert({ ...row, user_id: user.id }).select('id')
    if (error || !data || data.length === 0) {
      console.error('Error guardando gasto fijo:', error)
      setFormError('No se pudo guardar el gasto fijo. Intenta de nuevo.')
      return
    }
    await fetchExpenses()
    // cierre y reseteo existentes (setIsModalOpen(false), setEditingId(null), limpiar campos)
  } catch (e) {
    console.error('Error guardando gasto fijo:', e)
    setFormError('No se pudo guardar el gasto fijo. Intenta de nuevo.')
  } finally {
    setSavingExpense(false)
  }
  ```
- JSX del modal:
  - Antes de `<div className="flex gap-3">`: `{formError && (<div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>)}`.
  - En los `onChange` de los 4 campos, añadir `setFormError('')`. El input de monto lleva `min="0.01" step="0.01"`.
  - Guardar: `disabled={savingExpense}`, clase extra `disabled:opacity-60`, texto `{savingExpense ? 'Guardando...' : 'Guardar'}`. "Cancel" pasa a "Cancelar".

### 9. `app/settings/page.tsx` (CP052/CP053)
- Constantes en el módulo:
  - `MAX_AVATAR_BYTES = 2 * 1024 * 1024`
  - `ALLOWED_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg' }`
  - `PRESET_AVATARS = [1,2,3,4,5,6].map((n) => `/avatars/avatar-${n}.svg`)`
- Estado nuevo: `selectedPreset: string | null`.
- Carga del perfil: usar `.maybeSingle()` en vez de `.single()`. Si `data` es null, prellenar nombres desde `user.user_metadata?.first_name` y `last_name` (si existen). Si hay `error`, lanzarlo como ahora.
- Helper `revokeBlob(url)`: `if (url.startsWith('blob:')) URL.revokeObjectURL(url)`.
- `handleFileChange`:
  - Si el tipo no está en `ALLOWED_TYPES` → `setMessage({ type: 'error', text: 'Formato no permitido. Usa JPG o PNG.' })`, limpiar `fileInputRef.current.value` y `return`.
  - Si `file.size > MAX_AVATAR_BYTES` → mensaje "La imagen supera 2MB." y lo mismo.
  - Si es válido: `revokeBlob(previewUrl)`, `setSelectedPreset(null)`, `setMessage(null)`, `setAvatarFile(file)` y `setPreviewUrl(URL.createObjectURL(file))`.
- `handleSelectPreset(url)`: `revokeBlob(previewUrl)`, `setAvatarFile(null)`, limpiar el input, `setSelectedPreset(url)`, `setPreviewUrl(url)` y `setMessage(null)`.
- `handleRemoveFile`: `revokeBlob(previewUrl)`, `setAvatarFile(null)`, `setSelectedPreset(null)`, `setPreviewUrl(avatarUrl)` (sin avatar guardado vuelve al genérico) y limpiar el input.
- La ✕ se muestra cuando `avatarFile || selectedPreset`.
- `handleSave`:
  1. `let finalAvatarUrl = avatarUrl`.
  2. Si hay `avatarFile`: `ext = ALLOWED_TYPES[avatarFile.type]`, `filePath = `${user.id}/${Date.now()}.${ext}``, `upload(filePath, avatarFile, { upsert: false, contentType: avatarFile.type })`. Si hay error → `setMessage({ type:'error', text:'No se pudo subir la imagen. Intenta de nuevo.' })` y `return` (conservando la selección). Si sale bien, `finalAvatarUrl = publicUrl`.
  3. Si no, y hay `selectedPreset`: `finalAvatarUrl = selectedPreset`.
  4. `const { data, error } = await supabase.from('profiles').upsert({ id: user.id, first_name: firstName, last_name: lastName, updated_at: new Date().toISOString(), ...(finalAvatarUrl ? { avatar_url: finalAvatarUrl } : {}) }, { onConflict: 'id' }).select('id, avatar_url').maybeSingle()`.
  5. Si hay `error` o no hay `data` → `setMessage({ type:'error', text:'No se pudo actualizar el perfil. Intenta de nuevo.' })` y `return`, CONSERVANDO `avatarFile` y `selectedPreset` para reintentar.
  6. Solo si sale bien: `setAvatarUrl(data.avatar_url ?? finalAvatarUrl)`, `setPreviewUrl(data.avatar_url ?? finalAvatarUrl)`, `setAvatarFile(null)`, `setSelectedPreset(null)`, limpiar el input y mostrar el mensaje de éxito actual. (`revokeBlob` del preview anterior si era un blob.)
  7. En `catch`, mensaje genérico "No se pudo actualizar el perfil. Intenta de nuevo." (quitar la frase sobre crear el bucket).
- `input accept="image/png,image/jpeg"`.
- Recuadro del avatar:
  - Clases `bg-slate-100 border-2 border-dashed border-slate-300`; icono `User` en `text-slate-400`.
  - El contenedor entero es clicable y accesible: `role="button"`, `tabIndex={0}`, `aria-label="Cambiar foto de perfil"`, `onClick` y `onKeyDown` (Enter o espacio) llaman a `fileInputRef.current?.click()`.
  - Se mantiene el overlay hover.
- Debajo del texto "Formatos recomendados…": `<p className="text-xs font-semibold text-gray-500 mt-2">O elige un avatar</p>` y un `div` `grid grid-cols-3 gap-2` con los 6 presets. Cada uno es un `<button type="button" aria-label={`Avatar ${i+1}`} aria-pressed={selectedPreset === url}>` con `<img src={url} alt="" className="w-10 h-10 rounded-full" />`. El seleccionado lleva `ring-2 ring-[#1D4ED8] ring-offset-2`.

### 10. `ml-service/features.py` (CP047)
- Constante en el módulo: `CUOTA_RE = r"\(\s*(\d+)\s*/\s*(\d+)\s*\)\s*$"`.
- Nueva función privada `_monthly_cuotas(expenses: pd.DataFrame, month_start: datetime, now: datetime) -> float`:
  - `next_month_start = (month_start + timedelta(days=32)).replace(day=1)`.
  - `desc = expenses["description"].fillna("").astype(str)` si la columna existe; si no, `pd.Series("", index=expenses.index)`.
  - `m = desc.str.extract(CUOTA_RE)`; `n = pd.to_numeric(m[0], errors="coerce")`; `total = pd.to_numeric(m[1], errors="coerce")`.
  - `pattern_mask = n.notna() & total.notna() & (total > 1) & (n >= 1) & (n <= total)`.
  - `in_month = (expenses["transaction_date"] >= pd.Timestamp(month_start)) & (expenses["transaction_date"] < pd.Timestamp(next_month_start))`.
  - `pattern_sum = expenses.loc[pattern_mask & in_month, "amount"].sum()`.
  - Formato antiguo, solo si existen las columnas `cuotas` y `monto_por_cuota`: `c = expenses["cuotas"].fillna(1).astype(float)` y `legacy_mask = (~pattern_mask) & (c > 1)`. Una fila antigua está vigente si `transaction_date <= now` y, en meses calendario, `0 <= diff < int(cuotas)`, con `diff = (month_start.year - d.year) * 12 + (month_start.month - d.month)`. Ejemplo: 2 cuotas iniciadas el 14/09 cuentan en septiembre y octubre, no en noviembre. Calcularlo fila a fila con `apply` sobre las filas de `legacy_mask`. `legacy_sum` = suma de `monto_por_cuota.fillna(0)` de las vigentes.
  - Devolver `float(pattern_sum + legacy_sum)`.
- En `build_risk_features`:
  - `month_start` ya se normaliza a medianoche.
  - `cuotas_monthly = _monthly_cuotas(expenses, month_start, now)` (con todos los gastos, incluidas las cuotas del mes con fecha posterior a hoy).
  - Para el resto de features, usar solo movimientos realizados: DESPUÉS de asignar `now`, `month_start` y `week_ago` (`features.py:65-67`; antes `now` no existe), definir `past_exp = expenses[expenses["transaction_date"] <= pd.Timestamp(now)]` y `past_inc = income_df[income_df["transaction_date"] <= pd.Timestamp(now)]`. Usarlos en `monthly_income`, `recent`, `month_exp`, `monthly_totals`, `month_expenses` y `cat_totals`.
  - No cambiar las claves devueltas.
- En `build_risk_training_data`: antes de construir las ventanas, descartar transacciones con fecha posterior a `datetime.now()`, para que las ventanas no lleguen a cuotas futuras. Ver en la implementación dónde se calcula `max_date` y filtrar antes.
- En `build_expense_df` (usado por la predicción): descartar filas con `transaction_date > datetime.now()`.

### 11. `ml-service/model_risks.py` (CP047: umbrales)
- `RISK_THRESHOLDS`: todos los umbrales de score pasan a `0.5` (probabilidad del clasificador o score normalizado). Hoy SOBREENDEUDAMIENTO usa 0.3.
- `_rule_based_score`: normalizar para que score `>= 0.5` ⇔ se cumple el límite financiero, y `>= 0.75` para severidad alta:
  - SOBREENDEUDAMIENTO: `min(ratio / 0.3 * 0.5, 1.0)`. Ratio 0.30 → 0.5 (medium); 0.45 → 0.75 (high).
  - CATEGORIA_CRITICA: `min(share, 1.0)`. 0.5 → medium; 0.75 → high.
  - GASTOS_HORMIGA: `min(count / 10.0, 1.0)` (sin cambio: 5 micro-gastos → medium).
  - VELOCIDAD_GASTO: sin cambio.

### 12. `ml-service/main.py` (CP047)
- Helper `_tx_date(t) -> date | None`: parsea `t.get("transaction_date","")[:10]` con `%Y-%m-%d` y devuelve `.date()`, o `None` si falla.
- En `predict`, después de `fetch_user_data`: `today = datetime.now().date()`, y `expense_count = sum(1 for t in transactions if t.get("type") == "expense" and (d := _tx_date(t)) is not None and d <= today)`.
- `_heuristic_response(transactions, categories)`:
  - `month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)`.
  - En la suma por categoría, considerar solo `month_start.date() <= d <= now.date()`, usando `_tx_date`.
  - Riesgos y recomendaciones, por separado:
    ```python
    try:
        risks = detect_risks(transactions)
    except Exception as e:
        print(f"[heuristic] detect_risks failed: {e!r}")
        risks = []
    try:
        recommendations = generate_recommendations(risks, transactions, categories)
    except Exception as e:
        print(f"[heuristic] recommendations failed: {e!r}")
        recommendations = {"alerts": [], "tips": []}
    ```
    Se pasan TODAS las transacciones: las funciones internas ya separan lo realizado de las cuotas del mes.
- Ruta ML (≥ 30): igual que ahora (`build_expense_df` ya filtra las futuras).

### 13. `ml-service/model_recommendations.py` (CP047)
- En `_build_tips`, después de convertir fechas: `expenses = expenses[expenses["transaction_date"] <= pd.Timestamp(datetime.now())]` y luego el `if expenses.empty: return []` existente.

## Archivos a CREAR

### 14. `app/auth/forgot-password/page.tsx` (CP007)
`'use client'`. `<AuthContainer title="Recuperar contraseña">`:
- Párrafo `text-center text-[13px] text-[#6B7280] mb-4`: "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña."
- `AuthInput type="email" placeholder="ejemplo@gmail.com" required disabled={loading}`.
- Envío: `const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password` })`.
  - Sin error → mensaje verde "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña." (no revela si existe).
  - `error.status === 429` → "Demasiados intentos. Espera un momento e inténtalo de nuevo."
  - Cualquier otro error → mensaje rojo genérico "No pudimos enviar el correo. Intenta de nuevo más tarde." y `console.error`.
- Botón: mismas clases que "Ingresar" en `login-form.tsx`; texto "Enviar enlace" / "Enviando...".
- Enlace "Volver a iniciar sesión" → `/auth/login`, con las clases del enlace "Regístrate".

### 15. `app/auth/reset-password/page.tsx` (CP007)
`'use client'`. `<AuthContainer title="Nueva contraseña">`:
- Estados: `checking` (true), `hasSession`, `password`, `confirm`, `show`, `loading` y `error`.
- `useEffect`: `supabase.auth.getSession()` → `setHasSession(!!data.session)` y `setChecking(false)`.
- Mientras `checking`: spinner (patrón `w-8 h-8 rounded-full border-2 border-t-transparent border-[#1D4ED8] animate-spin`).
- Sin sesión: aviso rojo "El enlace expiró o no es válido." y un enlace a `/auth/forgot-password` ("Solicitar un nuevo enlace").
- Con sesión: dos `AuthInput type="password"` con `showPasswordToggle`. Validar `password.length >= 6` ("La contraseña debe tener al menos 6 caracteres") y la coincidencia ("Las contraseñas no coinciden").
- `const { error } = await supabase.auth.updateUser({ password })`. Si hay error, mostrar `error.message`. Si sale bien: `await supabase.auth.signOut()` y `window.location.replace('/auth/login?reset=1')`.

### 16. `next.config.mjs` (URLs que usa QA)
Añadir sin tocar lo existente:
```js
async redirects() {
  return [
    { source: '/login', destination: '/auth/login', permanent: false },
    { source: '/forgot-password', destination: '/auth/forgot-password', permanent: false },
    { source: '/configuracion', destination: '/settings', permanent: false },
  ]
},
```

### 17. `public/avatars/avatar-1.svg` … `avatar-6.svg` (CP052)
SVG de 128×128 (`viewBox="0 0 128 128"`): un círculo de fondo (`#3B82F6`, `#22C55E`, `#F97316`, `#EC4899`, `#8B5CF6`, `#14B8A6`) y una silueta blanca (cabeza `circle cx=64 cy=50 r=22` + torso con `path` de semielipse inferior). Sin texto, scripts ni referencias externas.

### 18. `docs/migrations/2026-11-14_avatars_and_profiles.sql` (NO aplicar)
Idempotente, con cabecera que explique el ORDEN: aplicar DESPUÉS de desplegar el frontend nuevo (que sube a `{uid}/...`).
- Bucket: `update storage.buckets set file_size_limit = 2097152, allowed_mime_types = array['image/png','image/jpeg'] where id = 'avatars';`
- `drop policy if exists` de "Avatar images are publicly accessible.", "Anyone can upload an avatar." y "Anyone can update an avatar.", y de las nuevas (para poder re-ejecutar).
- Nuevas políticas en `storage.objects`:
  - `avatars_public_read`: for select, using `bucket_id = 'avatars'`.
  - `avatars_insert_own`: for insert to authenticated, with check `bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text`.
  - `avatars_update_own`: for update to authenticated, con la misma condición en using y en with check.
  - `avatars_delete_own`: for delete to authenticated, using con la misma condición.
- `profiles`: `alter table public.profiles enable row level security;` más `drop policy if exists` y create de `profiles_select_own` (select, `auth.uid() = id`), `profiles_insert_own` (insert, with check `auth.uid() = id`) y `profiles_update_own` (update, using y with check `auth.uid() = id`), todas `to authenticated`.
- Comentario final con consultas de verificación (`select * from pg_policies where tablename in ('objects','profiles');`).

### 19. `ml-service/tests/test_qa_cp047.py`
Helper `tx(id, amount, type_, cat, date: datetime, desc="", cuotas=1, monto_por_cuota=None)`, que devuelve un dict con `transaction_date=date.strftime('%Y-%m-%dT%H:%M:%S')`. Fechas: "este mes" = `datetime.now().replace(day=1, hour=10, minute=0, second=0, microsecond=0)` (siempre ≤ ahora, salvo el día 1 antes de las 10:00; en ese caso usar `hour=0`). Para meses futuros usar `+ pd.DateOffset(months=k)`.

Tests:
- `test_rule_score_overindebtedness_boundaries`: `_rule_based_score('SOBREENDEUDAMIENTO', feats)`: ratio 0.29 → < 0.5; 0.30 → ≥ 0.5; 0.45 → ≥ 0.75.
- `test_rule_score_critical_category_boundaries`: share 0.49 → < 0.5; 0.5 → ≥ 0.5.
- `test_cuota_rows_count_as_cuotas`: 3 filas "Laptop (1/3)", "(2/3)", "(3/3)" de 1000 (este mes, +1 mes, +2 meses) e ingreso de 1500 este mes → `cuotas_to_income_ratio == pytest.approx(1000/1500, rel=1e-2)`. Solo cuenta la cuota del mes en curso.
- `test_invalid_cuota_patterns_ignored`: "X (0/0)", "X (4/3)" y "X (1/1)" este mes → ratio 0.
- `test_legacy_cuota_window_calendar_months`: fila sin patrón, `cuotas=2`, `monto_por_cuota=300`, fechada el día 1 de hace 2 meses → ratio 0; la misma fila fechada en el mes anterior → ratio > 0.
- `test_no_double_count_legacy_and_pattern`: una fila "Tv (1/2)" con `cuotas=2`, `monto_por_cuota=500` y `amount=500` este mes, e ingreso de 1000 → ratio ≈ 0.5 (no 1.0).
- `test_future_rows_excluded_from_velocity`: misma base con y sin un gasto de 5000 a +40 días → `expense_velocity` igual.
- `test_heuristic_response_large_debt_returns_critical_category`: importar `_heuristic_response` desde `main`. Datos: ingreso de 1500 este mes, 4 gastos "Comida" de 20 y 1 gasto de 30000 "Deudas", todo este mes y ≤ ahora. Asserts: `mode == 'heuristic'`, que `'CATEGORIA_CRITICA'` esté en `[r['type'] for r in risks]` y que `recommendations['alerts']` no esté vacío.
- `test_heuristic_includes_first_day_of_month`: un gasto el día 1 a las 00:00 → `prediction.next_30_days.total > 0`.

## Archivos que NO se deben tocar
`lib/supabase/proxy.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts`, `components/ui/**`, `supabase/migrations/**`, `lib/default-categories.ts`, `lib/process-recurring-expenses.ts`, `.env*`, `ml-service/model_prediction.py`, `ml-service/supabase_client.py`, `app/api/**` y el resto de componentes de dashboard, movimientos y proyecciones.

## Pasos ordenados
1. CP050: sidebar, middleware y proxy.
2. CP005: callback, registro y página de error.
3. CP007: forgot y reset password, login (aviso + Suspense) y `next.config.mjs`.
4. CP042: upcoming expenses.
5. CP052/CP053: SVG, settings y migración SQL en docs.
6. CP047: features, model_risks, main, recomendaciones y tests.
7. Verificación.

## Verificación
- `npx tsc --noEmit -p .` → 0 errores.
- `pnpm build` → build OK (requiere `.env`; lo corre el orquestador).
- ML con el entorno de producción (Python 3.11 + requirements.txt), desde la raíz del repo:
  `docker run --rm -v "$PWD/ml-service":/app -w /app python:3.11-slim sh -c "apt-get update -qq && apt-get install -y -qq libgomp1 >/dev/null && pip install -q -r requirements.txt && python -m pytest -q -p no:cacheprovider"` → todos los tests verdes (33 previos + los nuevos).

## Configuración manual (fuera del código; la hace el usuario)
1. **Supabase → Authentication → URL Configuration**: *Site URL* `https://finza-app-tau.vercel.app`; *Redirect URLs*: `https://finza-app-tau.vercel.app/**`, el patrón de previews de Vercel y `http://localhost:3000/**`.
2. **Vercel**: borrar `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` si existe.
3. **Plantillas de correo** (para que funcionen desde otro navegador o dispositivo):
   - Confirm signup: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/movimientos`
   - Reset password: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password`
4. **Storage/RLS**: después de desplegar el frontend, aplicar `docs/migrations/2026-11-14_avatars_and_profiles.sql` y verificar con dos usuarios y un anónimo.
5. **Servicio ML**: redeploy en Railway/Render.

## Checklist de prueba manual (QA)
- CP050: logout → Atrás y Adelante → siempre en el login; recargar; otra pestaña abierta → pasa al login al cerrar sesión.
- CP005/CP007: confirmación y recuperación en el mismo navegador y en otro; enlace reutilizado o expirado → `/auth/error`.
- CP042: Guardar vacío → aviso rojo; monto 0 → aviso; guardado correcto → tarjeta nueva.
- CP052/CP053: preset → guardar → cambiar el nombre → guardar → recargar (el avatar se mantiene); PNG < 2 MB → preview, ✕ vuelve al genérico; archivo de 3 MB o .gif → error.
- CP047: cuenta con < 30 gastos + deuda de 30000 → aparece la alerta "Una categoría concentra…" y consejos.

## Riesgos y casos borde
- `SIGNED_OUT` también salta cuando expira el refresh token: mandar al login es correcto.
- Chrome puede usar bfcache con `no-store`, pero lo descarta al cambiar las cookies (el logout las cambia). Además, `pageshow.persisted` fuerza la recarga. El router cache de Next no sobrevive porque el logout hace navegación completa.
- `upsert` en `profiles` depende de las políticas del paso 18. Si faltan, el usuario ve un error real en vez de un éxito falso.
- Avatares predefinidos: `avatar_url` relativo (`/avatars/...`). No usan el bucket.
- Cambiar los umbrales de riesgo modifica cuándo aparecen las alertas en las cuentas existentes: ahora coinciden con los textos ("más del 30%", "más del 50%").
