# Proyecciones Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 Recharts statistical charts to /proyecciones — a full-width grouped BarChart, a donut chart in PredictionSection, a RadialBarChart in RisksSection, and a horizontal BarChart in RecommendationsSection.

**Architecture:** Recharts 2.15 is already installed. All chart data comes from the existing `MLResponse` shape returned by `/api/ml/predict`. One new component file is created; three existing section components are modified; `page.tsx` and `index.ts` are updated to wire it all up. No API changes.

**Tech Stack:** Next.js 14 App Router, Recharts 2.15, TypeScript, inline styles (matching existing patterns in the codebase)

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Create | `components/proyecciones/spending-comparison-chart.tsx` | New full-width grouped BarChart component |
| Modify | `components/proyecciones/prediction-section.tsx` | Replace horizontal bars with donut PieChart |
| Modify | `components/proyecciones/risks-section.tsx` | Add RadialBarChart above risk cards |
| Modify | `components/proyecciones/recommendations-section.tsx` | Add horizontal BarChart below tips list |
| Modify | `app/proyecciones/page.tsx` | Add SpendingComparisonChart row above 3-column grid |
| Modify | `components/proyecciones/index.ts` | Export SpendingComparisonChart |

---

### Task 1: SpendingComparisonChart — full-width grouped BarChart

**Files:**
- Create: `components/proyecciones/spending-comparison-chart.tsx`

This component merges `next7Days.by_category` and `next30Days.by_category` by category name, then renders a grouped BarChart with two bars per category (blue = 7 days, green = 30 days).

- [ ] **Step 1: Create the file with complete implementation**

```tsx
// components/proyecciones/spending-comparison-chart.tsx
'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface CategoryPrediction {
  category: string
  amount: number
  type: 'fixed' | 'variable'
}

interface PredictionData {
  total: number
  by_category: CategoryPrediction[]
}

interface SpendingComparisonChartProps {
  next7Days: PredictionData
  next30Days: PredictionData
}

export function SpendingComparisonChart({ next7Days, next30Days }: SpendingComparisonChartProps) {
  const categoryMap = new Map<string, { category: string; siete: number; treinta: number }>()

  next7Days.by_category.forEach(c => {
    categoryMap.set(c.category, { category: c.category, siete: c.amount, treinta: 0 })
  })
  next30Days.by_category.forEach(c => {
    const existing = categoryMap.get(c.category)
    if (existing) {
      existing.treinta = c.amount
    } else {
      categoryMap.set(c.category, { category: c.category, siete: 0, treinta: c.amount })
    }
  })

  const data = Array.from(categoryMap.values())

  if (data.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">Sin datos de categorías</p>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#64748B' }} />
        <YAxis tickFormatter={(v: number) => `S/${v}`} tick={{ fontSize: 11, fill: '#94A3B8' }} />
        <Tooltip formatter={(value: number) => [`S/${value.toFixed(0)}`, '']} />
        <Legend />
        <Bar dataKey="siete" name="7 días" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="treinta" name="30 días" fill="#22C55E" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Verify the dev server compiles without errors**

Run: `npm run dev` (or the project's dev command — check `package.json` scripts)
Navigate to `/proyecciones` in the browser.
Expected: no TypeScript or module errors in the terminal. The chart isn't visible yet (not wired to the page).

- [ ] **Step 3: Commit**

```bash
git add components/proyecciones/spending-comparison-chart.tsx
git commit -m "feat: add SpendingComparisonChart grouped bar component"
```

---

### Task 2: Donut chart in PredictionSection

**Files:**
- Modify: `components/proyecciones/prediction-section.tsx`

Replace the flat horizontal progress bars (the `maxAmount` variable + `<div className="space-y-3">` loop at lines 53–88) with a Recharts PieChart donut. Keep the totals cards at the top unchanged.

- [ ] **Step 1: Replace the full file content**

The current file is ~91 lines. Write this complete replacement:

```tsx
// components/proyecciones/prediction-section.tsx
'use client'

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatSoles } from '@/lib/utils-currency'

interface CategoryPrediction {
  category: string
  amount: number
  type: 'fixed' | 'variable'
}

interface PredictionData {
  total: number
  by_category: CategoryPrediction[]
}

interface PredictionSectionProps {
  next7Days: PredictionData
  next30Days: PredictionData
  mode: 'ml' | 'heuristic'
}

const DONUT_COLORS = [
  '#3B82F6', '#F59E0B', '#EF4444', '#22C55E',
  '#A855F7', '#06B6D4', '#EC4899', '#64748B',
]

export function PredictionSection({ next7Days, next30Days, mode }: PredictionSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold text-slate-800">Predicción de Gastos</h2>
        {mode === 'heuristic' && (
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-medium">
            Datos insuficientes para ML
          </span>
        )}
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-4" style={{ background: '#EFF6FF' }}>
          <p className="text-xs font-medium text-blue-500 mb-1">Próximos 7 días</p>
          <p className="text-2xl font-bold text-blue-700">{formatSoles(next7Days.total)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#F0FDF4' }}>
          <p className="text-xs font-medium text-green-600 mb-1">Próximos 30 días</p>
          <p className="text-2xl font-bold text-green-700">{formatSoles(next30Days.total)}</p>
        </div>
      </div>

      {/* Donut chart */}
      {next7Days.by_category.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sin datos de categorías</p>
      ) : (
        <>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Por categoría — próximos 7 días
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={next7Days.by_category}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
              >
                {next7Days.by_category.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`S/${value.toFixed(0)}`, 'Monto']} />
            </PieChart>
          </ResponsiveContainer>
          {/* Color legend */}
          <div className="mt-3 flex flex-wrap gap-2">
            {next7Days.by_category.map((cat, i) => (
              <div key={cat.category} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="text-xs text-slate-600">{cat.category}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

With `npm run dev` running, open `/proyecciones`.
Expected: the PredictionSection card now shows a donut chart instead of progress bars. Hovering a slice shows the category name and `S/XX` amount. Color legend appears below.

- [ ] **Step 3: Commit**

```bash
git add components/proyecciones/prediction-section.tsx
git commit -m "feat: replace prediction bars with donut chart in PredictionSection"
```

---

### Task 3: RadialBarChart in RisksSection

**Files:**
- Modify: `components/proyecciones/risks-section.tsx`

Add a `RadialBarChart` above the existing risk cards. The chart maps each risk's severity to a numeric value (low=25, medium=60, high=100) and renders one radial bar per risk, color-coded by severity. The existing empty state (checkmark) remains unchanged.

- [ ] **Step 1: Replace the full file content**

```tsx
// components/proyecciones/risks-section.tsx
'use client'

import {
  RadialBarChart, RadialBar, Legend, ResponsiveContainer,
} from 'recharts'

interface Risk {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
}

interface RisksSectionProps {
  risks: Risk[]
}

const SEVERITY_STYLES = {
  high:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', dot: '#EF4444', label: 'Alto' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dot: '#F59E0B', label: 'Medio' },
  low:    { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', dot: '#94A3B8', label: 'Bajo' },
}

const SEVERITY_VALUE: Record<string, number> = { high: 100, medium: 60, low: 25 }
const SEVERITY_COLOR: Record<string, string> = { high: '#EF4444', medium: '#F59E0B', low: '#94A3B8' }

const RISK_LABELS: Record<string, string> = {
  SOBREENDEUDAMIENTO: 'Riesgo de Sobreendeudamiento',
  GASTOS_HORMIGA:     'Gastos Hormiga',
  VELOCIDAD_GASTO:    'Velocidad de Gasto',
  CATEGORIA_CRITICA:  'Categoria Critica',
}

export function RisksSection({ risks }: RisksSectionProps) {
  const radialData = risks.map(r => ({
    name: RISK_LABELS[r.type] ?? r.type,
    value: SEVERITY_VALUE[r.severity] ?? 25,
    fill: SEVERITY_COLOR[r.severity] ?? '#94A3B8',
  }))

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-800 mb-6">Radar de Riesgos</h2>

      {risks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#F0FDF4' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-green-600">Sin riesgos detectados</p>
          <p className="text-xs text-slate-400">Tus finanzas están en buen camino</p>
        </div>
      ) : (
        <>
          {/* Radial bar chart */}
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart
              innerRadius={20}
              outerRadius={80}
              data={radialData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                dataKey="value"
                minAngle={15}
                background={{ fill: '#F8FAFC' }}
                label={false}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Risk cards */}
          <div className="space-y-3 mt-4">
            {risks.map((risk) => {
              const style = SEVERITY_STYLES[risk.severity]
              return (
                <div
                  key={risk.type}
                  className="rounded-xl p-4"
                  style={{ background: style.bg, border: `1px solid ${style.border}` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: style.dot }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold" style={{ color: style.text }}>
                          {RISK_LABELS[risk.type] ?? risk.type}
                        </span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: style.border, color: style.text }}
                        >
                          {style.label}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: style.text }}>
                        {risk.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open `/proyecciones` with `npm run dev`.
Expected: when risks exist, the RisksSection shows a radial bar chart above the risk cards. Each ring is colored red/amber/grey based on severity. When no risks exist, the green checkmark state still shows correctly.

- [ ] **Step 3: Commit**

```bash
git add components/proyecciones/risks-section.tsx
git commit -m "feat: add RadialBarChart to RisksSection"
```

---

### Task 4: Horizontal BarChart in RecommendationsSection

**Files:**
- Modify: `components/proyecciones/recommendations-section.tsx`

Add a horizontal BarChart (`layout="vertical"` in Recharts terminology) between the tips list and the "Ahorro potencial total" footer card. The chart shows potential savings per category with green bars, descending opacity for visual hierarchy.

- [ ] **Step 1: Replace the full file content**

```tsx
// components/proyecciones/recommendations-section.tsx
'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatSoles } from '@/lib/utils-currency'

interface Alert {
  priority: number
  message: string
  triggered_by: string
}

interface Tip {
  category: string
  suggestion: string
  potential_saving: number
}

interface RecommendationsSectionProps {
  alerts: Alert[]
  tips: Tip[]
}

export function RecommendationsSection({ alerts, tips }: RecommendationsSectionProps) {
  const totalSaving = tips.reduce((sum, t) => sum + t.potential_saving, 0)
  const savingsData = tips.map(t => ({ category: t.category, ahorro: t.potential_saving }))
  const chartHeight = Math.min(160, tips.length * 44 + 20)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-800 mb-6">Recomendaciones</h2>

      {alerts.length === 0 && tips.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          Sin recomendaciones por el momento
        </p>
      ) : (
        <div className="space-y-4">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.triggered_by}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="mt-0.5 flex-shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p className="text-xs font-medium text-amber-700">{alert.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tips + savings chart */}
          {tips.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Consejos de ahorro
              </p>
              {tips.map((tip) => (
                <div
                  key={tip.category}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="mt-0.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs text-slate-600">{tip.suggestion}</p>
                  </div>
                  <span className="text-xs font-bold text-green-600 whitespace-nowrap">
                    {formatSoles(tip.potential_saving)}
                  </span>
                </div>
              ))}

              {/* Horizontal savings bar chart */}
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Ahorro potencial por categoría
                </p>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart
                    data={savingsData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => `S/${v}`}
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={90}
                      tick={{ fontSize: 11, fill: '#475569' }}
                    />
                    <Tooltip
                      formatter={(v: number) => [`S/${Number(v).toFixed(0)}`, 'Ahorro potencial']}
                    />
                    <Bar dataKey="ahorro" radius={[0, 4, 4, 0]}>
                      {savingsData.map((_, i) => (
                        <Cell
                          key={i}
                          fill="#22C55E"
                          fillOpacity={Math.max(0.4, 0.85 - i * 0.15)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Total saving footer */}
          {totalSaving > 0 && (
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3 mt-2"
              style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
            >
              <span className="text-sm font-semibold text-green-700">
                Ahorro potencial total
              </span>
              <span className="text-base font-bold text-green-700">
                {formatSoles(totalSaving)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open `/proyecciones` with `npm run dev`.
Expected: when tips exist, a horizontal green bar chart appears below the tip cards, one bar per category, before the "Ahorro potencial total" footer. When no tips exist, nothing extra is rendered.

- [ ] **Step 3: Commit**

```bash
git add components/proyecciones/recommendations-section.tsx
git commit -m "feat: add horizontal savings BarChart to RecommendationsSection"
```

---

### Task 5: Wire SpendingComparisonChart into page + export

**Files:**
- Modify: `app/proyecciones/page.tsx`
- Modify: `components/proyecciones/index.ts`

Add the full-width SpendingComparisonChart row above the existing 3-column grid, and export the new component from the barrel file.

- [ ] **Step 1: Update `components/proyecciones/index.ts`**

Current content (7 lines):
```ts
export * from './proyeccion-chart'
export * from './recomendaciones-list'
export * from './explicacion-list'
export * from './analisis-panel'
export { PredictionSection } from './prediction-section'
export { RisksSection } from './risks-section'
export { RecommendationsSection } from './recommendations-section'
```

Add one line at the end:
```ts
export * from './proyeccion-chart'
export * from './recomendaciones-list'
export * from './explicacion-list'
export * from './analisis-panel'
export { PredictionSection } from './prediction-section'
export { RisksSection } from './risks-section'
export { RecommendationsSection } from './recommendations-section'
export { SpendingComparisonChart } from './spending-comparison-chart'
```

- [ ] **Step 2: Update `app/proyecciones/page.tsx`**

Add the import (after the existing 3 imports at lines 4–6):
```tsx
import { SpendingComparisonChart } from '@/components/proyecciones/spending-comparison-chart'
```

Then add the full-width chart row. In the current JSX, the 3-column grid starts at line 128:
```tsx
{/* 3-column grid on large screens, stacked on small */}
<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
```

Insert the new block immediately before that div:
```tsx
      {/* Full-width spending comparison chart */}
      <div className="mb-6 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4">
          Comparación de Gastos por Categoría
        </h2>
        <SpendingComparisonChart
          next7Days={data.prediction.next_7_days}
          next30Days={data.prediction.next_30_days}
        />
      </div>

      {/* 3-column grid on large screens, stacked on small */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
```

The full updated `app/proyecciones/page.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { PredictionSection } from '@/components/proyecciones/prediction-section'
import { RisksSection } from '@/components/proyecciones/risks-section'
import { RecommendationsSection } from '@/components/proyecciones/recommendations-section'
import { SpendingComparisonChart } from '@/components/proyecciones/spending-comparison-chart'

interface CategoryPrediction {
  category: string
  amount: number
  type: 'fixed' | 'variable'
}

interface PredictionData {
  total: number
  by_category: CategoryPrediction[]
}

interface Risk {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
}

interface Alert {
  priority: number
  message: string
  triggered_by: string
}

interface Tip {
  category: string
  suggestion: string
  potential_saving: number
}

interface MLResponse {
  mode: 'ml' | 'heuristic'
  generated_at: string
  prediction: {
    next_7_days: PredictionData
    next_30_days: PredictionData
  }
  risks: Risk[]
  recommendations: {
    alerts: Alert[]
    tips: Tip[]
  }
}

const EMPTY_PREDICTION: PredictionData = { total: 0, by_category: [] }
const EMPTY_ML: MLResponse = {
  mode: 'heuristic',
  generated_at: '',
  prediction: { next_7_days: EMPTY_PREDICTION, next_30_days: EMPTY_PREDICTION },
  risks: [],
  recommendations: { alerts: [], tips: [] },
}

export default function ProyeccionesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [data, setData] = useState<MLResponse>(EMPTY_ML)

  const fetchML = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await fetch('/api/ml/predict', { method: 'POST' })
      if (!res.ok) throw new Error('ML unavailable')
      const json: MLResponse = await res.json()
      setData(json)
    } catch {
      setError(true)
      setData(EMPTY_ML)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchML()
  }, [fetchML])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#1D4ED8] animate-spin" />
        <p className="text-sm text-slate-500">Analizando tus patrones financieros...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] px-8 pt-7 pb-8">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-[#0F172A] tracking-tight">
            Proyecciones
          </h1>
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                Servicio ML no disponible — mostrando análisis básico
              </span>
            )}
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: data.mode === 'ml' ? '#EFF6FF' : '#F1F5F9',
                color: data.mode === 'ml' ? '#1D4ED8' : '#64748B',
              }}
            >
              {data.mode === 'ml' ? 'ML Activo' : 'Análisis Básico'}
            </span>
          </div>
        </div>
        <div className="flex gap-6 border-b border-gray-200 mt-4">
          <button className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-3 px-1">
            Mis gastos
          </button>
        </div>
      </div>

      {/* Full-width spending comparison chart */}
      <div className="mb-6 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4">
          Comparación de Gastos por Categoría
        </h2>
        <SpendingComparisonChart
          next7Days={data.prediction.next_7_days}
          next30Days={data.prediction.next_30_days}
        />
      </div>

      {/* 3-column grid on large screens, stacked on small */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Predicción — left, wider */}
        <div className="lg:col-span-5">
          <PredictionSection
            next7Days={data.prediction.next_7_days}
            next30Days={data.prediction.next_30_days}
            mode={data.mode}
          />
        </div>

        {/* Riesgos — center */}
        <div className="lg:col-span-4">
          <RisksSection risks={data.risks} />
        </div>

        {/* Recomendaciones — right */}
        <div className="lg:col-span-3">
          <RecommendationsSection
            alerts={data.recommendations.alerts}
            tips={data.recommendations.tips}
          />
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify the full page in browser**

With `npm run dev` running, open `/proyecciones`.
Expected:
- Full-width "Comparación de Gastos por Categoría" grouped bar chart appears above the 3-column grid
- Blue bars = 7 días, green bars = 30 días, one group per category
- Tooltips show `S/XX` on hover
- Legend shows "7 días" / "30 días"
- The 3 column sections below render their respective charts (donut, radial, horizontal bars)
- No console errors

- [ ] **Step 4: Commit**

```bash
git add app/proyecciones/page.tsx components/proyecciones/index.ts
git commit -m "feat: wire SpendingComparisonChart into proyecciones page"
```

- [ ] **Step 5: Push to remote**

```bash
git push origin main
```

Expected: Vercel picks up the push and deploys within ~2 minutes.
