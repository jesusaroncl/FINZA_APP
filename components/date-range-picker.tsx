'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

export interface DateRange {
  start: Date | null
  end: Date | null
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  align?: 'left' | 'right'
}

const DAYS_OF_WEEK = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isBetween(date: Date, start: Date, end: Date) {
  const d = date.getTime()
  const s = Math.min(start.getTime(), end.getTime())
  const e = Math.max(start.getTime(), end.getTime())
  return d > s && d < e
}

function isRangeStart(date: Date, range: DateRange) {
  if (!range.start) return false
  const effective = range.start && range.end && range.end < range.start
  const start = effective ? range.end! : range.start
  return isSameDay(date, start!)
}

function isRangeEnd(date: Date, range: DateRange) {
  if (!range.end) return false
  const effective = range.start && range.end && range.end < range.start
  const end = effective ? range.start! : range.end
  return isSameDay(date, end!)
}

function formatLabel(range: DateRange): string {
  if (!range.start && !range.end) return 'Seleccionar rango'
  const fmt = (d: Date) => d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  if (range.start && !range.end) return fmt(range.start)
  if (range.start && range.end && isSameDay(range.start, range.end)) return fmt(range.start)
  const s = range.start! < range.end! ? range.start! : range.end!
  const e = range.start! < range.end! ? range.end! : range.start!
  return `${fmt(s)} – ${fmt(e)}`
}

export function DateRangePicker({ value, onChange, align = 'left' }: DateRangePickerProps) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<Date | null>(null)
  const [selecting, setSelecting] = useState<'start' | 'end'>('start')
  const ref = useRef<HTMLDivElement>(null)

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
  // getDay(): 0=Sun..6=Sat → convert to Mo=0..Su=6
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
    if (selecting === 'start') {
      onChange({ start: date, end: null })
      setSelecting('end')
    } else {
      onChange({ start: value.start, end: date })
      setSelecting('start')
      setOpen(false)
    }
  }

  // Effective range for display (including hover preview)
  const previewEnd = selecting === 'end' && hovered ? hovered : value.end
  const effectiveRange: DateRange = { start: value.start, end: previewEnd }

  const getStyle = (date: Date, currentMonth: boolean) => {
    const start = effectiveRange.start
    const end = effectiveRange.end

    const isStart = start && isSameDay(date, start)
    const isEnd = end && isSameDay(date, end)
    const inRange = start && end && isBetween(date, start, end)

    // Determine which is actual start/end
    const rangeStart = start && end ? (start < end ? start : end) : start
    const rangeEnd = start && end ? (start < end ? end : start) : end
    const actualStart = rangeStart && isSameDay(date, rangeStart)
    const actualEnd = rangeEnd && isSameDay(date, rangeEnd)

    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    let bg = 'transparent'
    let color = currentMonth ? '#1E293B' : '#CBD5E1'
    let fontWeight: string | number = 400
    let borderRadius = '50%'
    let textColor = color

    if (actualStart || actualEnd) {
      bg = '#1D4ED8'
      textColor = '#FFFFFF'
      fontWeight = 700
    } else if (inRange) {
      bg = '#DBEAFE'
      textColor = '#1D4ED8'
      fontWeight = 500
      borderRadius = '0'
    } else if (isWeekend && currentMonth) {
      bg = '#F8FAFC'
    }

    // Round caps for range
    if (inRange) {
      const dow = (date.getDay() + 6) % 7
      if (dow === 0) borderRadius = '8px 0 0 8px'
      else if (dow === 6) borderRadius = '0 8px 8px 0'
    }

    return { bg, textColor, fontWeight, borderRadius }
  }

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-white"
        style={{ borderColor: '#E2E8F0', color: '#475569', background: '#FFFFFF' }}
      >
        <Calendar className="w-4 h-4" style={{ color: '#64748B' }} />
        <span>{formatLabel(value)}</span>
        <svg className="w-4 h-4" style={{ color: '#94A3B8' }} viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown Calendar */}
      {open && (
        <div
          className={`absolute top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ borderColor: '#E2E8F0', minWidth: 320, padding: '16px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
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
              const { bg, textColor, fontWeight, borderRadius } = getStyle(date, currentMonth)
              const isToday = isSameDay(date, new Date())

              return (
                <div
                  key={idx}
                  className="relative flex items-center justify-center"
                  style={{ height: 36 }}
                  onMouseEnter={() => setHovered(date)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Range background bar */}
                  {bg === '#DBEAFE' && (
                    <div
                      className="absolute inset-y-1"
                      style={{
                        left: 0, right: 0,
                        background: '#DBEAFE',
                        borderRadius,
                      }}
                    />
                  )}

                  {/* Day circle */}
                  <button
                    onClick={() => handleDayClick(date)}
                    className="relative z-10 flex items-center justify-center text-xs transition-all"
                    style={{
                      width: 30, height: 30,
                      background: bg === '#DBEAFE' ? 'transparent' : bg,
                      color: textColor,
                      fontWeight,
                      borderRadius: bg === '#DBEAFE' ? '50%' : borderRadius,
                      border: isToday && bg === 'transparent' ? '1.5px solid #94A3B8' : 'none',
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
              onClick={() => { onChange({ start: null, end: null }); setSelecting('start') }}
              className="text-xs font-medium hover:underline"
              style={{ color: '#94A3B8' }}
            >
              Limpiar
            </button>
            <span className="text-xs" style={{ color: '#94A3B8' }}>
              {selecting === 'start' ? 'Selecciona fecha inicio' : 'Selecciona fecha fin'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
