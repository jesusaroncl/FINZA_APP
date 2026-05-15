'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatSoles } from '@/lib/utils-currency'

interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  transaction_date: string
}

export default function ProyeccionPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: true })

          if (data) {
            setTransactions(data)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const generateProjectionData = () => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    const avgIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) / Math.max(1, transactions.length)

    const avgExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) / Math.max(1, transactions.length)

    return meses.map((mes, index) => {
      const baseProjection = (avgIncome - avgExpense) * (index + 1)
      const uncertainty = Math.abs(avgExpense) * 0.2 * (index + 0.5)

      return {
        mes,
        proyectado: Math.max(0, baseProjection),
        superior: baseProjection + uncertainty,
        inferior: Math.max(baseProjection - uncertainty, -1000),
      }
    })
  }

  const getRecommendations = () => {
    return [
      {
        id: 1,
        title: 'Recomendación 1',
        amount: 150,
        date: '14 May, 2026',
      },
      {
        id: 2,
        title: 'Recomendación 1',
        amount: 150,
        date: '14 May, 2026',
      },
      {
        id: 3,
        title: 'Recomendación 1',
        amount: 150,
        date: '14 May, 2026',
      },
      {
        id: 4,
        title: 'Recomendación 1',
        amount: 150,
        date: '14 May, 2026',
      },
    ]
  }

  if (loading) {
    return <div className="p-8">Cargando...</div>
  }

  const projectionData = generateProjectionData()
  const recommendations = getRecommendations()

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const projectedMonthly = (totalIncome - totalExpense) * 3.3

  return (
    <div className="flex-1 p-8 bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Mis Gastos</h1>
        <div className="flex gap-4 items-center text-sm">
          <button className="text-teal-600 font-semibold">Mis gastos</button>
          <span className="text-gray-400">|</span>
          <button className="text-gray-600 hover:text-gray-900">Proyección Mensual</button>
          <span className="text-gray-400">|</span>
          <button className="text-gray-600 hover:text-gray-900">Recomendaciones</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Section - Projection Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projection Chart */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Proyección Mensual</h2>
            <p className="text-3xl font-bold text-slate-900 mb-6">{formatSoles(projectedMonthly)}</p>
            {projectionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatSoles(value as number)} />
                  <Area type="monotone" dataKey="proyectado" stroke="#4ECDC4" fillOpacity={1} fill="url(#colorProjected)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">Sin datos disponibles para proyección</p>
            )}
            <p className="text-sm text-gray-600 mt-4 flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-teal-500 rounded-full"></span>
              Impacto
            </p>
          </div>

          {/* Explanation Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Explanation */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-slate-900 mb-4">Explicación</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-700 font-semibold text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Tu Gasto Bajó En Gustitos</p>
                    <p className="text-gray-600 text-xs">En este Mes</p>
                    <p className="text-gray-500 text-xs">14 May, 2026</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 text-yellow-700 font-semibold text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Gastaste Más De Lo Habitual</p>
                    <p className="text-gray-600 text-xs">En "Salidas"</p>
                    <p className="text-gray-500 text-xs">14 May, 2026</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 text-gray-700 font-semibold text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Vas Por Un Buen Camino</p>
                    <p className="text-gray-600 text-xs">Siguiendo Así Ahorrarás 15% Más Este Mes</p>
                    <p className="text-gray-500 text-xs">14 May, 2026</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-slate-900 mb-4">Análisis</h3>
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="font-semibold text-yellow-900 text-sm">Gasto Total Hoy</p>
                  <p className="text-yellow-700 font-bold">{formatSoles(totalExpense)}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="font-semibold text-yellow-900 text-sm">Categoría Más Gastada</p>
                  <p className="text-yellow-700 font-bold">Ingreso por Ventas</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="font-semibold text-red-900 text-sm">Comparado a Ayer</p>
                  <p className="text-red-700 font-bold">15% ▲</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button className="flex-1 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">
                  Cancelar
                </button>
                <button className="flex-1 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 font-medium text-sm">
                  Tomar consejo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Recommendations */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 h-fit">
          <h3 className="font-semibold text-slate-900 mb-4">Recomendaciones</h3>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={rec.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                <div className="flex items-start gap-3">
                  <div className="text-sm text-gray-600 font-medium flex-shrink-0">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{rec.title}</p>
                    <p className="text-gray-600 text-xs">{rec.date}</p>
                  </div>
                  <p className="font-semibold text-gray-900 flex-shrink-0 text-sm">{formatSoles(rec.amount)}</p>
                </div>
                <button className="mt-2 text-teal-600 text-xs font-semibold hover:text-teal-700">
                  Ver recomendación →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
