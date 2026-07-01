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
  MonthSelector,
  BalanceCard,
  ActivityChart,
  ExpenseStats,
  SavingsGoalCard,
  UpcomingExpensesCard,
  LargestTransactionsCard,
  TotalSavingCard,
  CuotasCard,
  DailyBudgetCard,
  CategoryActivityChart
} from '@/components/dashboard'
import { processRecurringExpenses } from '@/lib/process-recurring-expenses'
import { ensureDefaultCategories, cleanupNonDefaultCategories } from '@/lib/default-categories'

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
  category_id: string | null
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

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
  icon?: string
}

interface CategoryStats {
  name: string
  value: number
  color: string
  icon?: string
}

export default function DashboardPage() {
  const supabase = createClient()

  // State
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  )
  const [totalSavings, setTotalSavings] = useState(0)
  const [totalBalance, setTotalBalance] = useState(0)
  const [savingsTarget, setSavingsTarget] = useState(20000)
  const [dailyBudget, setDailyBudget] = useState(100)

  // Load saved target from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('finza_savings_target')
    if (saved) setSavingsTarget(Number(saved))
    const savedBudget = localStorage.getItem('finza_daily_budget')
    if (savedBudget) setDailyBudget(Number(savedBudget))
  }, [])

  // Fetch total savings (all time, not affected by month filter)
  useEffect(() => {
    const fetchTotalStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: txData }, { data: catData }] = await Promise.all([
        supabase.from('transactions').select('amount, type, category_id').eq('user_id', user.id),
        supabase.from('categories').select('id, name').eq('user_id', user.id),
      ])

      if (txData) {
        const income = txData.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const expense = txData.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        setTotalBalance(income - expense)

        const ahorroId = catData?.find(c => c.name === 'Ahorro')?.id ?? null
        const ahorroEntradas = txData.filter(t => t.type === 'income' && t.category_id === ahorroId).reduce((s, t) => s + t.amount, 0)
        const ahorroSalidas = txData.filter(t => t.type === 'expense' && t.category_id === ahorroId).reduce((s, t) => s + t.amount, 0)
        setTotalSavings(Math.max(0, ahorroEntradas - ahorroSalidas))
      }
    }
    fetchTotalStats()
  }, [])

  // Fetch data
  useEffect(() => {
    fetchDashboardData()
  }, [selectedMonth])

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

      await ensureDefaultCategories(supabase, user.id)
      await cleanupNonDefaultCategories(supabase, user.id)

      // Procesar gastos recurrentes antes de cargar las transacciones
      await processRecurringExpenses(supabase, user.id)

      // Calculate date range for selected month
      const { startStr, endStr } = getMonthRange(selectedMonth)

      // Fetch transactions
      const query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', startStr)
        .lte('transaction_date', endStr)
        .order('transaction_date', { ascending: false })

      const [transactionsRes, categoriesRes] = await Promise.all([
        query,
        supabase.from('categories').select('*').eq('user_id', user.id)
      ])

      if (transactionsRes.data) {
        setTransactions(transactionsRes.data)
      }
      if (categoriesRes.data) {
        setCategories(categoriesRes.data)
      }
    } catch (error) {
      console.error('[v0] Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMonthRange = (month: Date) => {
    const y = month.getFullYear()
    const m = String(month.getMonth() + 1).padStart(2, '0')
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return {
      startStr: `${y}-${m}-01`,
      endStr: `${y}-${m}-${String(lastDay).padStart(2, '0')}T23:59:59`,
    }
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

  const calculateMonthSavings = (): number => {
    const ahorroId = categories.find(c => c.name === 'Ahorro')?.id ?? null
    const entradas = transactions.filter(t => t.type === 'income' && t.category_id === ahorroId).reduce((s, t) => s + t.amount, 0)
    const salidas = transactions.filter(t => t.type === 'expense' && t.category_id === ahorroId).reduce((s, t) => s + t.amount, 0)
    return Math.max(0, entradas - salidas)
  }

  const getChartData = (): ChartData[] => {
    const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()
    const days: Record<number, { ingresos: number; gastos: number }> = {}

    for (let d = 1; d <= lastDay; d++) {
      days[d] = { ingresos: 0, gastos: 0 }
    }

    transactions.forEach((t) => {
      const [, , dayPart] = t.transaction_date.split('T')[0].split('-')
      const day = Number(dayPart)
      if (t.type === 'income') {
        days[day].ingresos += t.amount
      } else {
        days[day].gastos += t.amount
      }
    })

    return Object.keys(days)
      .map(Number)
      .sort((a, b) => a - b)
      .map((day) => ({ name: String(day), ...days[day] }))
  }

  const DEFAULT_EXPENSE_CATS = new Set(['Salud', 'Salario', 'Comida', 'Transporte', 'Servicios Básicos', 'Entretenimiento', 'Deudas', 'Ahorro'])

  const getCategoryStats = (): CategoryStats[] => {
    const stats: Record<string, { value: number; name: string; color: string; icon?: string }> = {}

    // Inicializar solo categorías default (sin filtrar por tipo, Ahorro es income pero puede tener gastos)
    categories.filter(c => DEFAULT_EXPENSE_CATS.has(c.name)).forEach((cat) => {
      stats[cat.name] = { value: 0, name: cat.name, color: cat.color || '#94A3B8', icon: cat.icon }
    })

    // Asegurar que "Servicios Básicos" existe como fallback
    if (!stats['Servicios Básicos']) {
      stats['Servicios Básicos'] = { value: 0, name: 'Servicios Básicos', color: '#8B5CF6', icon: 'zap' }
    }

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t: any) => {
        const cat = categories.find((c) => c.id === t.category_id)
        const name = cat?.name || ''

        if (DEFAULT_EXPENSE_CATS.has(name)) {
          stats[name].value += t.amount
        } else {
          stats['Servicios Básicos'].value += t.amount
        }
      })

    return Object.values(stats)
  }

  const getDailyDetails = (): Record<string, { name: string; amount: number; color?: string }[]> => {
    const details: Record<string, Record<string, { amount: number; color?: string }>> = {}

    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const day = String(Number(t.transaction_date.split('T')[0].split('-')[2]))
        const cat = categories.find(c => c.id === t.category_id)
        const catName = cat?.name || 'Sin categoría'
        if (!details[day]) details[day] = {}
        if (!details[day][catName]) details[day][catName] = { amount: 0, color: cat?.color }
        details[day][catName].amount += t.amount
      })

    const result: Record<string, { name: string; amount: number; color?: string }[]> = {}
    Object.entries(details).forEach(([day, cats]) => {
      result[day] = Object.entries(cats)
        .map(([name, { amount, color }]) => ({ name, amount, color }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
    })
    return result
  }

  const stats = calculateStats()
  const monthSavings = calculateMonthSavings()
  const chartData = getChartData()
  const categoryStats = getCategoryStats()
  const dailyDetails = getDailyDetails()

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
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#1D4ED8] animate-spin" />
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
            <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column (Main Content) - approx 65% */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-4 mb-8">
              <TotalSavingCard savings={totalSavings} />
              <BalanceCard balance={totalBalance} />
              <DailyBudgetCard
                budget={dailyBudget}
                onSave={(val) => {
                  setDailyBudget(val)
                  localStorage.setItem('finza_daily_budget', val.toString())
                }}
              />
            </div>
            
            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Actividad Mensual</h3>
            <div className="mb-8">
              <ActivityChart data={chartData} dailyBudget={dailyBudget} dailyDetails={dailyDetails} />
            </div>

            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Estadística de Gastos</h3>
            <div className="mb-8">
              <ExpenseStats data={categoryStats} />
            </div>

            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Actividad por Categoría</h3>
            <div>
              <CategoryActivityChart transactions={transactions} categories={categories} />
            </div>
          </div>

          {/* Right Column (Sidebar) - approx 35% */}
          <div className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col">
            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Meta de ahorro</h3>
            <div className="mb-8">
              <SavingsGoalCard
                target={savingsTarget}
                achieved={totalSavings}
                monthAchieved={monthSavings}
                onSave={(newTarget) => {
                  setSavingsTarget(newTarget)
                  localStorage.setItem('finza_savings_target', newTarget.toString())
                }}
              />
            </div>
            
            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Próximos Gastos</h3>
            <div className="mb-8">
              <UpcomingExpensesCard categories={categories} />
            </div>
            
            <h3 className="text-[17px] font-bold text-[#334155] mb-4">Seguimiento de Cuotas</h3>
            <div className="mb-8">
              <CuotasCard />
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
