'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { X } from 'lucide-react'
import { formatSoles } from '@/lib/utils-currency'

interface ChartData {
  name: string
  ingresos: number
  gastos: number
}

interface DailyDetail {
  name: string
  amount: number
  color?: string
}

interface ActivityChartProps {
  data: ChartData[]
  dailyBudget?: number
  dailyDetails?: Record<string, DailyDetail[]>
}

// Dot on the cumulative line: red + clickable on anomaly days
function CumDot(props: any) {
  const { cx, cy, payload, dailyBudget, onDotClick } = props
  if (!payload || payload.gastos === 0) return <g />
  const exceeded = !!dailyBudget && payload.gastos > dailyBudget
  if (!exceeded) return <g />

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="#EF4444"
      stroke="white"
      strokeWidth={1.5}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation()
        onDotClick({ day: payload.name, x: e.clientX, y: e.clientY })
      }}
    />
  )
}

export function ActivityChart({ data, dailyBudget, dailyDetails }: ActivityChartProps) {
  const [popup, setPopup] = useState<{ day: string; x: number; y: number } | null>(null)

  // Build cumulative dataset
  const chartData = useMemo(() => {
    let cum = 0
    return data.map(entry => {
      cum += entry.gastos
      return { ...entry, cumulative: cum }
    })
  }, [data])

  const peakDay = data.length > 0
    ? data.reduce((max, d) => d.gastos > max.gastos ? d : max, data[0])
    : null

  const isAnomaly = (gastos: number) => !!dailyBudget && gastos > dailyBudget

  const handleDotClick = ({ day, x, y }: { day: string; x: number; y: number }) => {
    setPopup(prev => prev?.day === day ? null : { day, x, y })
  }

  return (
    <div
      className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50 relative"
      onClick={() => setPopup(null)}
    >
      {/* Category breakdown popup */}
      {popup && dailyDetails?.[popup.day] && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-2xl shadow-xl min-w-[220px] p-4"
          style={{ left: popup.x + 12, top: popup.y, transform: 'translateY(-50%)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-[#1E293B]">Top gastos — Día {popup.day}</p>
            <button onClick={() => setPopup(null)} className="text-[#94A3B8] hover:text-slate-600 transition-colors">
              <X size={13} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {dailyDetails[popup.day].map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color || '#94A3B8' }} />
                  <span className="text-xs font-medium text-[#334155] truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-[#0F172A]">{formatSoles(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peak day banner */}
      {peakDay && peakDay.gastos > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-[#64748B]">Mayor movimiento:</span>
          <span className="text-xs font-bold text-[#1E293B]">Día {peakDay.name}</span>
          <span className="text-xs font-semibold" style={{ color: isAnomaly(peakDay.gastos) ? '#EF4444' : '#0F172A' }}>
            {formatSoles(peakDay.gastos)}
          </span>
          {isAnomaly(peakDay.gastos) && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Anomalía</span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-end items-center mb-6">
        <div className="flex flex-wrap gap-4 items-center text-sm font-medium text-[#64748B]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#4ECDC4]"></div>
            Gastos
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#1D4ED8]"></div>
            Ingresos
          </div>
          <div className="flex items-center gap-2">
            <svg width="20" height="8">
              <line x1="0" y1="4" x2="20" y2="4" stroke="#F97316" strokeWidth="2" />
            </svg>
            Acumulado
          </div>
          {dailyBudget && (
            <div className="flex items-center gap-2">
              <svg width="20" height="8">
                <line x1="0" y1="4" x2="20" y2="4" stroke="#EF4444" strokeWidth="2" strokeDasharray="5 3" />
              </svg>
              Límite diario
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 16, right: 48, left: -20, bottom: 0 }} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
            dy={10}
          />
          {/* Eje izquierdo: valores diarios (barras + límite) */}
          <YAxis
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
            dx={-10}
          />
          {/* Eje derecho: gasto acumulado */}
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#F97316', fontSize: 10, fontWeight: 600 }}
            dx={8}
            tickFormatter={(v) => `S/${Math.round(v)}`}
          />
          <Tooltip
            cursor={{ fill: '#F8FAFC' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: number, name: string) => [
              formatSoles(value),
              name === 'cumulative' ? 'Acumulado' : name === 'ingresos' ? 'Ingresos' : 'Gastos'
            ]}
          />
          {dailyBudget && (
            <ReferenceLine
              yAxisId="left"
              y={dailyBudget}
              stroke="#EF4444"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: `S/ ${dailyBudget}`, position: 'insideTopRight', fill: '#EF4444', fontSize: 10, fontWeight: 700, dy: -6 }}
            />
          )}
          <Bar
            yAxisId="left"
            dataKey="ingresos"
            fill="#1D4ED8"
            radius={0}
            barSize={10}
            isAnimationActive={true}
            animationBegin={200}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Bar
            yAxisId="left"
            dataKey="gastos"
            radius={0}
            barSize={10}
            isAnimationActive={true}
            animationBegin={400}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={isAnomaly(entry.gastos) ? '#EF4444' : '#4ECDC4'} />
            ))}
          </Bar>
          {/* Línea de gasto acumulado — naranja, eje derecho */}
          <Line
            yAxisId="right"
            dataKey="cumulative"
            type="monotone"
            stroke="#F97316"
            strokeWidth={2}
            dot={(props: any) => (
              <CumDot
                {...props}
                dailyBudget={dailyBudget}
                onDotClick={handleDotClick}
              />
            )}
            activeDot={false}
            isAnimationActive={true}
            animationBegin={600}
            animationDuration={1200}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
