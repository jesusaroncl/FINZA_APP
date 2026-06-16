# Proyecciones Charts Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 4 Recharts statistical charts to the /proyecciones page to make financial predictions visually professional.

**Architecture:** Recharts (already installed at v2.15.0) renders all charts client-side. No API changes needed — all chart data comes from the existing `MLResponse` shape. One new component is created; three existing section components are modified.

**Tech Stack:** Next.js 14, Recharts 2.15, TypeScript, Tailwind/inline styles (matching existing patterns)

---

## Data Available (from existing MLResponse)

```typescript
interface CategoryPrediction { category: string; amount: number; type: 'fixed' | 'variable' }
interface PredictionData     { total: number; by_category: CategoryPrediction[] }
interface Risk               { type: string; severity: 'low' | 'medium' | 'high'; description: string }
interface Tip                { category: string; suggestion: string; potential_saving: number }
```

---

## New Layout (app/proyecciones/page.tsx)

```
┌─────────────────────────────────────────────────────────┐
│  SpendingComparisonChart  (full-width, new row)          │
└─────────────────────────────────────────────────────────┘
┌──────────────────┐  ┌────────────────┐  ┌─────────────┐
│ PredictionSection│  │ RisksSection   │  │ Recommend.  │
│ [Donut chart]    │  │ [RadialBar]    │  │ [HorizBar]  │
│ + totals cards   │  │ + risk cards   │  │ + alerts    │
└──────────────────┘  └────────────────┘  └─────────────┘
```

---

## Chart 1 — SpendingComparisonChart (new file)

**File:** `components/proyecciones/spending-comparison-chart.tsx`

**Purpose:** Full-width grouped BarChart comparing predicted spend per category for 7 days vs 30 days.

**Recharts components:** `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer`

**Data transformation:** Merge `next_7_days.by_category` and `next_30_days.by_category` into one array keyed by category name:
```typescript
// Input
next7Days.by_category  = [{ category: 'Alimentación', amount: 120, type: 'variable' }, ...]
next30Days.by_category = [{ category: 'Alimentación', amount: 480, type: 'variable' }, ...]

// Output (merged)
[{ category: 'Alimentación', siete: 120, treinta: 480 }, ...]
```

**Visual spec:**
- `Bar dataKey="siete"` — fill `#3B82F6` (blue), name "7 días"
- `Bar dataKey="treinta"` — fill `#22C55E` (green), name "30 días"
- `XAxis dataKey="category"` with `tick={{ fontSize: 12, fill: '#64748B' }}`
- `YAxis` with `tickFormatter={(v) => \`S/${v}\`` and `tick={{ fontSize: 11, fill: '#94A3B8' }}`
- `Tooltip` with custom formatter showing `S/` prefix
- `CartesianGrid` with `strokeDasharray="3 3"` and `stroke="#F1F5F9"`
- `Legend` at bottom
- Container height: 220px
- If both by_category arrays are empty: render `<p>Sin datos de categorías</p>` placeholder

**Props:**
```typescript
interface SpendingComparisonChartProps {
  next7Days: PredictionData
  next30Days: PredictionData
}
```

---

## Chart 2 — Donut Chart in PredictionSection

**File:** `components/proyecciones/prediction-section.tsx` (modify)

**Purpose:** Replace the flat horizontal progress bars with a Recharts PieChart (donut style) showing category share of the 7-day prediction.

**Recharts components:** `PieChart`, `Pie`, `Cell`, `Tooltip`, `ResponsiveContainer`

**Visual spec:**
- `innerRadius={50}` `outerRadius={80}` for donut effect
- Container height: 200px
- Color palette (cycle through): `['#3B82F6','#F59E0B','#EF4444','#22C55E','#A855F7','#06B6D4','#EC4899','#64748B']`
- `Tooltip` formatter: `(value) => [\`S/${value.toFixed(0)}\`, 'Monto']`
- `Pie` with `dataKey="amount"` and `nameKey="category"`
- Section label: keep existing `"Por categoría — próximos 7 días"` text above chart
- Fallback: if `next7Days.by_category.length === 0` render existing `<p>Sin datos de categorías</p>`
- Remove: the `maxAmount` variable and the existing `<div>` bar loop

---

## Chart 3 — RadialBarChart in RisksSection

**File:** `components/proyecciones/risks-section.tsx` (modify)

**Purpose:** Show a RadialBarChart above the risk cards, mapping each risk to a 0–100 severity score.

**Recharts components:** `RadialBarChart`, `RadialBar`, `Legend`, `ResponsiveContainer`

**Severity mapping:**
```typescript
const SEVERITY_VALUE = { high: 100, medium: 60, low: 25 }
const SEVERITY_COLOR = { high: '#EF4444', medium: '#F59E0B', low: '#94A3B8' }
```

**Data transformation:**
```typescript
const radialData = risks.map(r => ({
  name: RISK_LABELS[r.type] ?? r.type,
  value: SEVERITY_VALUE[r.severity],
  fill: SEVERITY_COLOR[r.severity],
}))
```

**Visual spec:**
- Container height: 180px
- `RadialBarChart` with `innerRadius={20}` `outerRadius={80}` `startAngle={90}` `endAngle={-270}`
- `RadialBar` with `dataKey="value"` `minAngle={15}` `background={{ fill: '#F8FAFC' }}`
- `Legend` with `iconSize={10}` `wrapperStyle={{ fontSize: 11 }}`
- Shown only when `risks.length > 0`; existing empty state (checkmark) shown when no risks

---

## Chart 4 — Horizontal BarChart in RecommendationsSection

**File:** `components/proyecciones/recommendations-section.tsx` (modify)

**Purpose:** Show a horizontal BarChart of savings potential per category below the alerts.

**Recharts components:** `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, `Cell`

**Data:** `tips[]` mapped to `[{ category: tip.category, ahorro: tip.potential_saving }]`

**Visual spec:**
- `layout="vertical"` for horizontal bars
- Container height: `tips.length * 44 + 20` px (dynamic, capped at 160px)
- `YAxis type="category"` `dataKey="category"` `width={90}` `tick={{ fontSize: 11, fill: '#475569' }}`
- `XAxis type="number"` `tickFormatter={(v) => \`S/${v}\`` `tick={{ fontSize: 10, fill: '#94A3B8' }}`
- `Bar dataKey="ahorro"` with `Cell fill="#22C55E"` per bar (or gradient feel with opacity)
- `Tooltip` formatter: `(v) => [\`S/${Number(v).toFixed(0)}\`, 'Ahorro potencial']`
- Shown only when `tips.length > 0`; placed between the tips list and the "Ahorro potencial total" footer card

---

## Integration in page.tsx

Add `SpendingComparisonChart` import and render it in a new row above the existing 3-column grid:

```tsx
{/* Full-width spending comparison chart */}
<div className="mb-6 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
  <h2 className="text-base font-bold text-slate-800 mb-4">Comparación de Gastos por Categoría</h2>
  <SpendingComparisonChart next7Days={data.prediction.next_7_days} next30Days={data.prediction.next_30_days} />
</div>
```

Export `SpendingComparisonChart` from `components/proyecciones/index.ts`.

---

## Empty / Loading States

- All charts: if data arrays are empty, show existing text fallback (no chart rendered)
- No skeleton states needed — page already has a full-page spinner

---

## Scope Boundaries

- No changes to ML API or Python service
- No new dependencies (Recharts already installed)
- No changes to other pages
- No unit tests required (UI-only changes, no business logic)
