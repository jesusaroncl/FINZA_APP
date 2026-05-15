'use client'

import { formatSoles } from '@/lib/utils-currency'
import { Lock, TrendingUp, ShoppingCart, PiggyBank } from 'lucide-react'

interface TransactionIndicator {
  label: string
  amount: number
  icon: React.ReactNode
  bgColor: string
}

interface TransactionIndicatorsProps {
  balance: number
  income: number
  expense: number
  savings: number
}

export function TransactionIndicators({
  balance,
  income,
  expense,
  savings,
}: TransactionIndicatorsProps) {
  const indicators: TransactionIndicator[] = [
    {
      label: 'Mi Balance',
      amount: balance,
      icon: <Lock className="w-6 h-6" />,
      bgColor: 'bg-yellow-100',
    },
    {
      label: 'Ingresos',
      amount: income,
      icon: <TrendingUp className="w-6 h-6" />,
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Gastos',
      amount: expense,
      icon: <ShoppingCart className="w-6 h-6" />,
      bgColor: 'bg-pink-100',
    },
    {
      label: 'Ahorro Total',
      amount: savings,
      icon: <PiggyBank className="w-6 h-6" />,
      bgColor: 'bg-teal-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {indicators.map((indicator) => (
        <div
          key={indicator.label}
          className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">{indicator.label}</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatSoles(indicator.amount)}
              </p>
            </div>
            <div
              className={`${indicator.bgColor} p-3 rounded-lg text-gray-700`}
            >
              {indicator.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
