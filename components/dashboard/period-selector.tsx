'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthSelectorProps {
  value: Date
  onChange: (month: Date) => void
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const now = new Date()
  const isCurrentMonth =
    value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth()

  const label = value.toLocaleString('es-PE', { month: 'long', year: 'numeric' })
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1)

  const prev = () => onChange(new Date(value.getFullYear(), value.getMonth() - 1, 1))
  const next = () => {
    if (!isCurrentMonth) onChange(new Date(value.getFullYear(), value.getMonth() + 1, 1))
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={prev}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-slate-100 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className="px-3 py-1.5 rounded-lg bg-[#F4F7FE] text-[#1D4ED8] text-sm font-semibold min-w-[140px] text-center">
        {displayLabel}
      </span>

      <button
        onClick={next}
        disabled={isCurrentMonth}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
