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

const RISK_LABELS: Record<string, string> = {
  SOBREENDEUDAMIENTO: 'Riesgo de Sobreendeudamiento',
  GASTOS_HORMIGA:     'Gastos Hormiga',
  VELOCIDAD_GASTO:    'Velocidad de Gasto',
  CATEGORIA_CRITICA:  'Categoria Critica',
}

export function RisksSection({ risks }: RisksSectionProps) {
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
        <div className="space-y-3">
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
      )}
    </div>
  )
}
