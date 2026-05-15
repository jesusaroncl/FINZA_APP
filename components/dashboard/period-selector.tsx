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
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3">
      <Calendar size={18} className="text-gray-600" />
      <select
        value={selectedPeriod}
        onChange={(e) => onPeriodChange(e.target.value as Period)}
        className="bg-transparent outline-none text-gray-700 font-medium cursor-pointer"
      >
        {PERIODS.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  )
}
