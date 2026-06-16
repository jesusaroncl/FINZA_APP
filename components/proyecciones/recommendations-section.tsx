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

          {/* Tips */}
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
            </div>
          )}

          {/* Total saving */}
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
