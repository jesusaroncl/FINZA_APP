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
import { StatsCard, PeriodSelector } from '@/components/dashboard'
import { formatSoles } from '@/lib/utils-currency'

type Period = 'week' | 'month' | 'year'

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

  // Fetch data
  useEffect(() => {
    fetchDashboardData()
  }, [selectedPeriod])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
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
      const dateRange = getDateRange(selectedPeriod)

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', dateRange.start.toISOString())
        .order('transaction_date', { ascending: false })

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
  const getDateRange = (period: Period) => {
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
      savings: income * 0.2, // Estimate 20% savings
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
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Hola, {profile?.first_name}!
        </h1>
      </div>

      {/* Period Selector */}
      <div className="mb-8 flex justify-between items-center">
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Balance"
          amount={stats.balance}
          icon="💰"
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatsCard
          title="Ingresos"
          amount={stats.income}
          icon="📈"
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatsCard
          title="Gastos"
          amount={stats.expense}
          icon="📉"
          color="bg-gradient-to-br from-red-500 to-red-600"
        />
        <StatsCard
          title="Ahorro"
          amount={stats.savings}
          icon="🎯"
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Activity Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actividad Semanal
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
              <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribución por Categoría
          </h3>
          {categoryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    `${name}: ${formatSoles(value)}`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatSoles(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Sin datos disponibles
            </p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Transacciones Recientes
        </h3>
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Descripción
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Tipo
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Fecha
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{t.description}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          t.type === 'income'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {t.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(t.transaction_date).toLocaleDateString(
                        'es-PE'
                      )}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-semibold ${
                        t.type === 'income'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {formatSoles(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Sin transacciones disponibles
          </p>
        )}
      </div>
    </div>
  )
}
