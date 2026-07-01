'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Transaction {
  transaction_date: string
  type: 'income' | 'expense'
  amount: number
  category_id: string | null
}

interface Category {
  id: string
  name: string
  color: string
}

interface CategoryActivityChartProps {
  transactions: Transaction[]
  categories: Category[]
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

export function CategoryActivityChart({ transactions, categories }: CategoryActivityChartProps) {
  const { chartData, catNames } = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense')

    // byDay[0..4] = Mon..Fri
    const byDay: Record<number, Record<string, number>> = {}
    for (let i = 0; i < 5; i++) byDay[i] = {}

    const catSet = new Set<string>()

    expenses.forEach(t => {
      const [y, m, d] = t.transaction_date.split('T')[0].split('-').map(Number)
      const date = new Date(y, m - 1, d)
      const jsDay = date.getDay() // 0=Sun 1=Mon ... 6=Sat
      const dayIdx = jsDay === 0 ? -1 : jsDay - 1 // Mon=0 ... Fri=4, skip Sun/Sat
      if (dayIdx < 0 || dayIdx > 4) return

      const cat = categories.find(c => c.id === t.category_id)
      const catName = cat?.name || 'Otro'
      catSet.add(catName)
      byDay[dayIdx][catName] = (byDay[dayIdx][catName] || 0) + t.amount
    })

    // Convert to percentages per day
    const chartData = WEEKDAYS.map((day, i) => {
      const dayData = byDay[i]
      const total = Object.values(dayData).reduce((s, v) => s + v, 0)
      if (total === 0) return { day }
      const row: Record<string, any> = { day }
      Object.entries(dayData).forEach(([name, val]) => {
        row[name] = parseFloat(((val / total) * 100).toFixed(1))
      })
      return row
    })

    return { chartData, catNames: Array.from(catSet) }
  }, [transactions, categories])

  const getCatColor = (name: string) =>
    categories.find(c => c.name === name)?.color || '#94A3B8'

  const hasData = chartData.some(d => Object.keys(d).length > 1)

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50">
      {!hasData ? (
        <p className="text-sm text-slate-500 text-center py-8">Sin datos de gastos disponibles</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barCategoryGap="30%">
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                dx={-10}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
              {catNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  stackId="a"
                  fill={getCatColor(name)}
                  radius={i === catNames.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {catNames.map(name => (
              <div key={name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: getCatColor(name) }} />
                <span className="text-xs text-[#64748B] font-medium">{name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
