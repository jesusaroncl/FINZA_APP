'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface SingleDatePickerProps {
  value: Date
  onChange: (date: Date) => void
}

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function SingleDatePicker({ value, onChange }: SingleDatePickerProps) {
  const [viewYear, setViewYear] = useState(value.getFullYear())
  const [viewMonth, setViewMonth] = useState(value.getMonth())
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Update view when value changes externally
  useEffect(() => {
    setViewYear(value.getFullYear())
    setViewMonth(value.getMonth())
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build calendar grid (always 6 rows × 7 cols)
  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const startDow = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const cells: { date: Date; currentMonth: boolean }[] = []
  // Previous month tail
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrevMonth - i), currentMonth: false })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), currentMonth: true })
  }
  // Next month head
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(viewYear, viewMonth + 1, d), currentMonth: false })
  }

  const handleDayClick = (date: Date) => {
    onChange(date)
    setOpen(false)
  }

  const getStyle = (date: Date, currentMonth: boolean) => {
    const isSelected = isSameDay(date, value)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    let bg = 'transparent'
    let color = currentMonth ? '#1E293B' : '#CBD5E1'
    let fontWeight: string | number = 400
    let textColor = color

    if (isSelected) {
      bg = '#1D4ED8'
      textColor = '#FFFFFF'
      fontWeight = 700
    } else if (isWeekend && currentMonth) {
      bg = '#F8FAFC'
    }

    return { bg, textColor, fontWeight }
  }

  const formatLabel = (d: Date) => d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        type="button"
        className="w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium border outline-none transition-colors"
        style={{ background: '#F8FAFC', borderColor: open ? '#3B82F6' : '#E2E8F0', color: '#475569' }}
      >
        <span>{formatLabel(value)}</span>
        <Calendar className="w-4 h-4" style={{ color: '#94A3B8' }} />
      </button>

      {/* Dropdown Calendar */}
      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 z-50 bg-white rounded-2xl shadow-xl border"
          style={{ borderColor: '#E2E8F0', minWidth: 320, padding: '16px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="flex items-center justify-center rounded-lg transition hover:bg-slate-100"
              style={{ width: 32, height: 32 }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: '#64748B' }} />
            </button>

            <div className="flex items-center gap-1">
              <span className="text-sm font-bold" style={{ color: '#1E293B' }}>
                {MONTHS[viewMonth]}
              </span>
              <span className="ml-1 text-sm font-bold" style={{ color: '#1E293B' }}>
                {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="flex items-center justify-center rounded-lg transition hover:bg-slate-100"
              style={{ width: 32, height: 32 }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: '#64748B' }} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold py-1"
                style={{ color: '#94A3B8' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map(({ date, currentMonth }, idx) => {
              const { bg, textColor, fontWeight } = getStyle(date, currentMonth)
              const isToday = isSameDay(date, new Date())
              const isSelected = isSameDay(date, value)

              return (
                <div
                  key={idx}
                  className="relative flex items-center justify-center"
                  style={{ height: 36 }}
                >
                  {/* Day circle */}
                  <button
                    type="button"
                    onClick={() => handleDayClick(date)}
                    className="relative z-10 flex items-center justify-center text-xs transition-all"
                    style={{
                      width: 30, height: 30,
                      background: bg,
                      color: textColor,
                      fontWeight,
                      borderRadius: '50%',
                      border: isToday && !isSelected ? '1.5px solid #94A3B8' : 'none',
                      cursor: currentMonth ? 'pointer' : 'default',
                      opacity: currentMonth ? 1 : 0.5,
                    }}
                  >
                    {date.getDate()}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={() => { onChange(new Date()); setOpen(false) }}
              className="text-xs font-medium hover:underline"
              style={{ color: '#3B82F6' }}
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
