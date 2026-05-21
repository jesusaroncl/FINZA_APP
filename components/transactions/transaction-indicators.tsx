'use client'

import { formatSoles } from '@/lib/utils-currency'

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
  const indicators = [
    {
      label: 'Mi Balance',
      amount: balance,
      bgColor: '#FFF7E6',
      iconColor: '#F59E0B',
      // Coin / lock icon as SVG
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v1m0 8v1M9.5 9.5a2.5 2.5 0 015 0c0 1.5-1 2-2.5 2.5S9.5 13 9.5 14.5a2.5 2.5 0 005 0" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'Ingresos',
      amount: income,
      bgColor: '#EEF2FF',
      iconColor: '#6366F1',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="8" r="3" />
          <path d="M3 20c0-4 3.6-7 9-7" strokeLinecap="round" />
          <path d="M17 14v6m-3-3l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Gastos',
      amount: expense,
      bgColor: '#FFF0F3',
      iconColor: '#F43F5E',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M8 10V7" strokeLinecap="round" />
          <circle cx="16" cy="15" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      label: 'Ahorro Total',
      amount: savings,
      bgColor: '#E6FAF8',
      iconColor: '#14B8A6',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={1.8}>
          <path d="M19 7c0-1.1-.9-2-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7z" />
          <path d="M16 11a4 4 0 01-8 0" strokeLinecap="round" />
          <path d="M12 4v3" strokeLinecap="round" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {indicators.map((ind) => (
        <div
          key={ind.label}
          className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          {/* Circular icon */}
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              background: ind.bgColor,
              color: ind.iconColor,
              width: 52,
              height: 52,
            }}
          >
            {ind.icon}
          </div>
          {/* Text */}
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: '#94A3B8' }}>
              {ind.label}
            </p>
            <p className="text-xl font-bold" style={{ color: '#0F172A' }}>
              {formatSoles(ind.amount)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
