'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartData {
  name: string
  ingresos: number
  gastos: number
}

interface ActivityChartProps {
  data: ChartData[]
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50">
      <div className="flex justify-end items-center mb-6">
        {/* Custom Legend to match mockup exactly */}
        <div className="flex gap-6 items-center text-sm font-medium text-[#64748B]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#4ECDC4]"></div>
            Gastos
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#1D4ED8]"></div>
            Ingresos
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
            dx={-10}
          />
          <Tooltip 
            cursor={{ fill: '#F8FAFC' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="ingresos" fill="#1D4ED8" radius={[10, 10, 10, 10]} barSize={12} isAnimationActive={true} animationBegin={200} animationDuration={1200} animationEasing="ease-out" />
          <Bar dataKey="gastos" fill="#4ECDC4" radius={[10, 10, 10, 10]} barSize={12} isAnimationActive={true} animationBegin={400} animationDuration={1200} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
