'use client'

import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { formatSoles } from '@/lib/utils-currency'

export interface ChartDataPoint {
  name: string
  past: number | null
  current: number | null
  projectionMin: number | null
  projectionMax: number | null
  projectionMid: number | null
  impact: number | null
}

interface ProyeccionChartProps {
  data: ChartDataPoint[]
  totalProjection: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-md p-3 rounded-xl">
        <p className="font-bold text-gray-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => {
          if (!entry.value) return null
          return (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatSoles(entry.value)}
            </p>
          )
        })}
      </div>
    )
  }
  return null
}

export function ProyeccionChart({ data, totalProjection }: ProyeccionChartProps) {
  return (
    <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-50 flex flex-col h-full min-h-[400px]">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">Proyección Mensual</h3>
          <p className="text-[40px] font-bold text-gray-900 leading-none">{formatSoles(totalProjection)}</p>
        </div>
        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-gray-600" stroke="currentColor" strokeWidth="2">
            <path d="M12 20V10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18 20V4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 20V14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
            {/* Definiendo gradientes */}
            <defs>
              <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FDE047" stopOpacity={0.1}/>
              </linearGradient>
            </defs>

            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#94A3B8' }} 
              dy={10}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />

            {/* Barras de datos pasados */}
            <Bar dataKey="past" fill="#E2E8F0" radius={[4, 4, 0, 0]} barSize={24} name="Pasado" isAnimationActive={true} animationBegin={200} animationDuration={1200} animationEasing="ease-out" />
            <Bar dataKey="current" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} name="Actual" isAnimationActive={true} animationBegin={400} animationDuration={1200} animationEasing="ease-out" />

            {/* Area de incertidumbre (abanico) */}
            <Area 
              type="monotone" 
              dataKey="projectionMax" 
              stroke="none" 
              fill="url(#colorProjection)" 
              fillOpacity={1}
              isAnimationActive={true} animationBegin={600} animationDuration={1200} animationEasing="ease-out"
            />
            <Area 
              type="monotone" 
              dataKey="projectionMin" 
              stroke="none" 
              fill="#FFFFFF" 
              fillOpacity={1}
              isAnimationActive={true} animationBegin={600} animationDuration={1200} animationEasing="ease-out"
            />

            {/* Lineas principales */}
            <Line type="monotone" dataKey="projectionMax" stroke="#10B981" strokeWidth={2} dot={false} name="Max Proyectado" isAnimationActive={true} animationBegin={800} animationDuration={1200} animationEasing="ease-out" />
            <Line type="monotone" dataKey="projectionMin" stroke="#10B981" strokeWidth={2} dot={false} name="Min Proyectado" isAnimationActive={true} animationBegin={800} animationDuration={1200} animationEasing="ease-out" />
            <Line type="monotone" dataKey="projectionMid" stroke="#0F172A" strokeWidth={2.5} dot={false} name="Media" isAnimationActive={true} animationBegin={1000} animationDuration={1200} animationEasing="ease-out" />
            <Line type="monotone" dataKey="impact" stroke="#EF4444" strokeWidth={2.5} dot={false} name="Impacto" isAnimationActive={true} animationBegin={1200} animationDuration={1200} animationEasing="ease-out" />

          </ComposedChart>
        </ResponsiveContainer>
        {/* Etiqueta flotante de impacto */}
        <div className="absolute top-[60%] left-[55%] text-gray-900 font-bold text-sm pointer-events-none">
          Impacto
        </div>
      </div>
    </div>
  )
}
