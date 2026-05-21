'use client'

import { Calendar } from 'lucide-react'

type Period = 'week' | 'month' | 'year'

interface PeriodSelectorProps {
  selectedPeriod: Period
  onPeriodChange: (period: Period) => void
}

const PERIODS = [
  { value: 'week' as Period, label: 'Esta Semana' },
  { value: 'month' as Period, label: 'Este Mes' },
  { value: 'year' as Period, label: 'Este Año' },
]

export function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
}: PeriodSelectorProps) {
  // Reordenar para coincidir con el mockup: Este Mes, Esta Semana, Este Año
  const ORDERED_PERIODS = [
    { value: 'month' as Period, label: 'Este Mes' },
    { value: 'week' as Period, label: 'Esta Semana' },
    { value: 'year' as Period, label: 'Este Año' },
  ]

  return (
    <div className="flex items-center gap-2">
      {ORDERED_PERIODS.map((period) => {
        const isSelected = selectedPeriod === period.value
        return (
          <button
            key={period.value}
            onClick={() => onPeriodChange(period.value)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              isSelected
                ? 'bg-[#F4F7FE] text-[#1D4ED8]'
                : 'bg-white text-[#64748B] hover:bg-slate-50 border border-transparent hover:border-slate-100'
            }`}
          >
            {period.label}
          </button>
        )
      })}
    </div>
  )
}
