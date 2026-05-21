'use client'

import { formatSoles } from '@/lib/utils-currency'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Home, CreditCard, Car, ShoppingBag, Gamepad2, MoreHorizontal } from 'lucide-react'

interface CategoryStat {
  name: string
  value: number
}

interface ExpenseStatsProps {
  data: CategoryStat[]
}

const COLORS = [
  '#AA96DA', // Purple
  '#F38181', // Coral/Red
  '#4ECDC4', // Teal/Mint
  '#FFB067', // Orange/Yellow
  '#3B82F6', // Blue
  '#9CA3AF', // Gray
]

// Icon mapping based on mockup
const getCategoryIcon = (name: string, color: string) => {
  const lower = name.toLowerCase()
  const iconProps = { size: 16, className: "text-white" }
  let Icon = MoreHorizontal
  
  if (lower.includes('house') || lower.includes('casa') || lower.includes('hogar')) Icon = Home
  else if (lower.includes('credit') || lower.includes('tarjeta')) Icon = CreditCard
  else if (lower.includes('transport') || lower.includes('transporte')) Icon = Car
  else if (lower.includes('groceries') || lower.includes('comida') || lower.includes('supermercado')) Icon = ShoppingBag
  else if (lower.includes('entertainment') || lower.includes('entretenimiento')) Icon = Gamepad2
  else if (lower.includes('shopping') || lower.includes('compras')) Icon = ShoppingBag

  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
      <Icon {...iconProps} />
    </div>
  )
}

export function ExpenseStats({ data }: ExpenseStatsProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0)
  
  // Sort data descending to find the largest for the center
  const sortedData = [...data].sort((a, b) => b.value - a.value)
  const largest = sortedData[0]
  const largestPercentage = largest && total > 0 ? ((largest.value / total) * 100).toFixed(0) : '0'

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50">
      
      {data.length > 0 ? (
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Donut Chart */}
          <div className="w-full lg:w-1/2 h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sortedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-[#1E293B]">{largestPercentage}%</span>
              <span className="text-xs font-medium text-[#64748B] text-center px-4 max-w-[120px] truncate">
                {largest?.name || ''}
              </span>
            </div>
          </div>

          {/* Custom Legend / List */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            {sortedData.slice(0, 5).map((item, index) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(2) : '0.00'
              const color = COLORS[index % COLORS.length]
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(item.name, color)}
                    <span className="text-sm font-semibold text-[#1E293B]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-[#64748B]">{formatSoles(item.value)}</span>
                    <span className="text-[#94A3B8] font-medium w-12 text-right">{percentage}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">Sin datos de gastos disponibles</p>
      )}
    </div>
  )
}
