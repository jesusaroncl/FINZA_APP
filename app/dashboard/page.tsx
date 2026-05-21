'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  PeriodSelector,
  BalanceCard,
  ActivityChart,
  ExpenseStats,
  SavingsGoalCard,
  UpcomingExpensesCard,
  LargestTransactionsCard,
  TotalSavingCard
} from '@/components/dashboard'
import { formatSoles } from '@/lib/utils-currency'
import { DateRangePicker } from '@/components/date-range-picker'
import type { DateRange } from '@/components/date-range-picker'

type Period = 'week' | 'month' | 'year' | 'custom'

interface Profile {
  first_name: string
  last_name: string
}

interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  transaction_date: string
  description: string
}

interface DashboardStats {
  balance: number
  income: number
  expense: number
  savings: number
}

interface ChartData {
  name: string
  ingresos: number
  gastos: number
}

interface CategoryStats {
  name: string
  value: number
}

export default function DashboardPage() {
  const supabase = createClient()

  // State
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month')
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null })
  const [savingsTarget, setSavingsTarget] = useState(20000)

  // Load saved target from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('finza_savings_target')
    if (saved) setSavingsTarget(Number(saved))
  }, [])

  // Fetch data
  useEffect(() => {
    fetchDashboardData()
  }, [selectedPeriod, dateRange])

  const fetchDashboardData = async () => {
    try {
      if (!profile) setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Calculate date range based on period
      const effectiveRange = getDateRange(selectedPeriod, dateRange)

      // Fetch transactions
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', effectiveRange.start.toISOString())
        .order('transaction_date', { ascending: false })

      if (effectiveRange.end) {
        // Establecer a las 23:59:59 para incluir todo el día de fin
        const endOfDay = new Date(effectiveRange.end)
        endOfDay.setHours(23, 59, 59, 999)
        query = query.lte('transaction_date', endOfDay.toISOString())
      }

      const { data: transactionsData } = await query

      if (transactionsData) {
        setTransactions(transactionsData)
      }
    } catch (error) {
      console.error('[v0] Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Utilities
  const getDateRange = (period: Period, customRange?: DateRange) => {
    if (period === 'custom' && customRange?.start) {
      return { start: customRange.start, end: customRange.end || new Date() }
    }

    const end = new Date()
    const start = new Date()

    switch (period) {
      case 'week':
        start.setDate(end.getDate() - 7)
        break
      case 'month':
        start.setMonth(end.getMonth() - 1)
        break
      case 'year':
        start.setFullYear(end.getFullYear() - 1)
        break
    }

    return { start, end }
  }

  const calculateStats = (): DashboardStats => {
    let income = 0
    let expense = 0

    transactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount
      } else {
        expense += t.amount
      }
    })

    return {
      balance: income - expense,
      income,
      expense,
      savings: Math.max(0, income - expense),
    }
  }

  const getChartData = (): ChartData[] => {
    const days: Record<string, { ingresos: number; gastos: number }> = {}

    transactions.forEach((t) => {
      const date = new Date(t.transaction_date)
      const dayStr = date.toLocaleDateString('es-PE', {
        weekday: 'short',
      })

      if (!days[dayStr]) {
        days[dayStr] = { ingresos: 0, gastos: 0 }
      }

      if (t.type === 'income') {
        days[dayStr].ingresos += t.amount
      } else {
        days[dayStr].gastos += t.amount
      }
    })

    return Object.entries(days).map(([name, data]) => ({
      name,
      ...data,
    }))
  }

  const getCategoryStats = (): CategoryStats[] => {
    const categories: Record<string, number> = {}

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const category = t.description.split(' ')[0]
        categories[category] = (categories[category] || 0) + t.amount
      })

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
    }))
  }

  const stats = calculateStats()
  const chartData = getChartData()
  const categoryStats = getCategoryStats()

  const COLORS = [
    '#FF6B9D',
    '#FF8C42',
    '#4ECDC4',
    '#95E1D3',
    '#F38181',
    '#AA96DA',
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] px-8 pt-7 pb-8">
      <div className="w-full">
        
        {/* Top Header Row */}
        <div className="flex justify-between items-start mb-8">
          <h1 className="text-[32px] font-bold text-[#0F172A] tracking-tight">
            Hola, {profile?.first_name || 'Usuario'}!
          </h1>
          
          <div className="flex items-center gap-4 mt-2">
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={(p) => {
                setSelectedPeriod(p)
                setDateRange({ start: null, end: null })
              }}
            />
            <div className="bg-white rounded-lg border border-slate-200">
              <DateRangePicker
                value={dateRange}
                align="right"
                onChange={(range) => {
                  setDateRange(range)
                  if (range.start || range.end) setSelectedPeriod('custom')
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column (Main Content) - approx 65% */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-6 mb-8 overflow-x-auto pb-2">
              <TotalSavingCard savings={stats.savings || 0} />
              <BalanceCard balance={stats.balance} />
            </div>
            
            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Actividad Semanal</h3>
            <div className="mb-8">
              <ActivityChart data={chartData} />
            </div>

            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Estadística de Gastos</h3>
            <div>
              <ExpenseStats data={categoryStats} />
            </div>
          </div>

          {/* Right Column (Sidebar) - approx 35% */}
          <div className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col">
            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Meta de ahorro</h3>
            <div className="mb-8">
              <SavingsGoalCard 
                target={savingsTarget} 
                achieved={stats.savings} 
                onSave={(newTarget) => {
                  setSavingsTarget(newTarget)
                  localStorage.setItem('finza_savings_target', newTarget.toString())
                }}
              />
            </div>
            
            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Próximos Gastos</h3>
            <div className="mb-8">
              <UpcomingExpensesCard />
            </div>
            
            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Movimientos Más grandes</h3>
            <div>
              <LargestTransactionsCard transactions={transactions} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
