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

export function PredictionSection({ next7Days, next30Days, mode }: PredictionSectionProps) {
  const maxAmount = Math.max(
    ...next7Days.by_category.map(c => c.amount),
    1
  )

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

      {/* Category bars */}
      {next7Days.by_category.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sin datos de categorías</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Por categoría — próximos 7 días
          </p>
          {next7Days.by_category.map((cat) => (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{cat.category}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{
                      background: cat.type === 'fixed' ? '#DBEAFE' : '#FEF3C7',
                      color: cat.type === 'fixed' ? '#1D4ED8' : '#D97706',
                    }}
                  >
                    {cat.type === 'fixed' ? 'FIJO' : 'VARIABLE'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {formatSoles(cat.amount)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(cat.amount / maxAmount) * 100}%`,
                    background: cat.type === 'fixed' ? '#3B82F6' : '#F59E0B',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
