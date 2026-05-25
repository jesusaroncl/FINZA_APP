'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ProyeccionChart,
  RecomendacionesList,
  ExplicacionList,
  AnalisisPanel,
  ChartDataPoint,
  ExplicacionItem,
  RecomendacionItem,
} from '@/components/proyecciones'

export default function ProyeccionesPage() {
  const [loading, setLoading] = useState(true)
  
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [totalProjection, setTotalProjection] = useState(0)
  
  const [todayExpense, setTodayExpense] = useState(0)
  const [mostSpentCategory, setMostSpentCategory] = useState('Ninguna')
  const [diffPercentage, setDiffPercentage] = useState(0)
  const [isPositive, setIsPositive] = useState(true)
  
  const [explicaciones, setExplicaciones] = useState<ExplicacionItem[]>([])
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionItem[]>([])

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: txData }, { data: catData }] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id),
      ])

      if (!txData || !catData) return

      const now = new Date()
      // Helper local date string YYYY-MM-DD to avoid timezone shifts
      const localDateStr = (d: Date) => {
        const yy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yy}-${mm}-${dd}`
      }

      const todayString = localDateStr(now)
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = localDateStr(yesterday)
      
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // 1. Chart Data (Gastos por mes del año actual)
      const monthlyTotals = new Array(12).fill(0)
      txData.forEach(tx => {
        if (tx.type === 'expense') {
          // Extraemos YYYY-MM-DD
          const [y, m] = tx.transaction_date.split('T')[0].split('-').map(Number)
          if (y === currentYear) {
            monthlyTotals[m - 1] += tx.amount
          }
        }
      })

      const pastMonthsWithData = monthlyTotals.slice(0, currentMonth + 1).filter(v => v > 0)
      const avgExpense = pastMonthsWithData.length > 0 
        ? pastMonthsWithData.reduce((a, b) => a + b, 0) / pastMonthsWithData.length 
        : 0

      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      const newChartData: ChartDataPoint[] = monthNames.map((name, i) => {
        const isFuture = i > currentMonth
        return {
          name,
          past: i < currentMonth ? monthlyTotals[i] : null,
          current: i === currentMonth ? monthlyTotals[i] : null,
          projectionMin: isFuture ? avgExpense * 0.8 : (i === currentMonth ? monthlyTotals[i] : null),
          projectionMax: isFuture ? avgExpense * 1.2 : (i === currentMonth ? monthlyTotals[i] : null),
          projectionMid: isFuture ? avgExpense : (i === currentMonth ? monthlyTotals[i] : null),
          impact: isFuture ? avgExpense * 0.9 : (i === currentMonth ? monthlyTotals[i] : null),
        }
      })
      setChartData(newChartData)
      setTotalProjection(newChartData[currentMonth].current || 0)

      // 2. Analisis Panel Data
      let todaySum = 0
      let yesterdaySum = 0
      const categorySumsThisMonth: Record<string, number> = {}

      txData.forEach(tx => {
        if (tx.type === 'expense') {
          const txDateString = tx.transaction_date.split('T')[0]
          if (txDateString === todayString) todaySum += tx.amount
          if (txDateString === yesterdayString) yesterdaySum += tx.amount

          const [y, m] = tx.transaction_date.split('T')[0].split('-').map(Number)
          if (y === currentYear && (m - 1) === currentMonth) {
            const catId = tx.category_id || 'unassigned'
            categorySumsThisMonth[catId] = (categorySumsThisMonth[catId] || 0) + tx.amount
          }
        }
      })

      setTodayExpense(todaySum)

      let maxCatId = 'Ninguna'
      let maxCatSum = 0
      for (const [id, sum] of Object.entries(categorySumsThisMonth)) {
        if (sum > maxCatSum) {
          maxCatSum = sum
          maxCatId = id
        }
      }
      
      let catName = 'Ninguna'
      if (maxCatId !== 'Ninguna' && maxCatId !== 'unassigned') {
        const found = catData.find(c => c.id === maxCatId)
        if (found) catName = found.name
      } else if (maxCatId === 'unassigned') {
        catName = 'Sin categoría'
      }
      setMostSpentCategory(catName)

      let diff = 0
      let pos = true
      if (yesterdaySum > 0) {
        diff = ((todaySum - yesterdaySum) / yesterdaySum) * 100
        pos = diff <= 0 // Si gastó menos o igual, es positivo
      } else if (todaySum > 0) {
        diff = 100 // Gastó hoy pero no ayer
        pos = false
      }
      setDiffPercentage(Math.abs(diff))
      setIsPositive(pos)

      // 3. Explicacion List (Heurísticas simples)
      const newExps: ExplicacionItem[] = []
      let expId = 1
      
      const formatDisplayDate = (d: Date) => {
        const day = d.getDate()
        const monthNamesEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        const month = monthNamesEs[d.getMonth()]
        const yy = d.getFullYear()
        return `${day} ${month}, ${yy}`
      }
      const displayDateStr = formatDisplayDate(now)
      
      if (todaySum === 0) {
        newExps.push({
          id: expId++,
          iconType: 1,
          bgColor: '#ECFCCB', textColor: '#65A30D',
          title: 'Excelente, no has registrado gastos el día de hoy',
          date: displayDateStr,
        })
      }
      if (diff > 20) {
        newExps.push({
          id: expId++,
          iconType: 2,
          bgColor: '#FEF08A', textColor: '#CA8A04',
          title: 'Has gastado considerablemente más hoy que el día de ayer',
          date: displayDateStr,
        })
      } else if (diff < -20 && yesterdaySum > 0) {
        newExps.push({
          id: expId++,
          iconType: 1,
          bgColor: '#ECFCCB', textColor: '#65A30D',
          title: '¡Bien! Has reducido tus gastos en comparación a ayer',
          date: displayDateStr,
        })
      }

      if (maxCatSum > 0) {
        newExps.push({
          id: expId++,
          iconType: 2,
          bgColor: '#E2E8F0', textColor: '#64748B',
          title: `Tu mayor fuente de gastos este mes es "${catName}"`,
          date: displayDateStr,
        })
      }

      if (newExps.length === 0) {
        newExps.push({
          id: expId++,
          iconType: 1,
          bgColor: '#E2E8F0', textColor: '#64748B',
          title: 'Mantienes un ritmo de gastos estable',
          date: displayDateStr,
        })
      }
      setExplicaciones(newExps)

      // 4. Recomendaciones
      if (maxCatSum > 0) {
        setRecomendaciones([
          {
            id: 1,
            title: `Intenta reducir gastos en ${catName}`,
            date: displayDateStr,
            amount: Number((maxCatSum * 0.15).toFixed(2)) // Sugerir ahorrar el 15%
          }
        ])
      }

    } catch (error) {
      console.error('Error fetching data for proyecciones:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#1D4ED8] animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] px-8 pt-7 pb-8">
      {/* Top Header Row / Tabs */}
      <div className="w-full mb-8">
        <div className="flex gap-8 border-b border-gray-200">
          <button className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-3 px-1">
            Mis gastos
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          
          {/* Top Row */}
          <div className="lg:col-span-8 flex flex-col min-w-0">
            <ProyeccionChart data={chartData} totalProjection={totalProjection} />
          </div>
          
          <div className="lg:col-span-4 flex flex-col min-w-0">
            <RecomendacionesList recommendations={recomendaciones} />
          </div>

          {/* Bottom Row */}
          <div className="lg:col-span-8 flex flex-col min-w-0">
            <ExplicacionList explicaciones={explicaciones} />
          </div>
          
          <div className="lg:col-span-4 flex flex-col min-w-0">
            <AnalisisPanel 
              todayExpense={todayExpense}
              mostSpentCategory={mostSpentCategory}
              diffPercentage={diffPercentage}
              isPositive={isPositive}
            />
          </div>
          
        </div>
      </div>
    </div>
  )
}
