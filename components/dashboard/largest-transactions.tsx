'use client'

import { formatSoles } from '@/lib/utils-currency'
import { Wallet, CreditCard, ShoppingBag, ArrowRightLeft, DollarSign } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  transaction_date: string
  description: string
}

interface LargestTransactionsCardProps {
  transactions: Transaction[]
}

const getTransactionIcon = (description: string, type: 'income' | 'expense') => {
  const lower = description.toLowerCase()
  const iconProps = { size: 18 }
  
  if (lower.includes('paypal') || lower.includes('deposit')) {
    return (
      <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
        <ArrowRightLeft {...iconProps} />
      </div>
    )
  }
  if (lower.includes('card') || lower.includes('tarjeta')) {
    return (
      <div className="w-12 h-12 rounded-full bg-[#FFF1F2] flex items-center justify-center text-[#E11D48]">
        <CreditCard {...iconProps} />
      </div>
    )
  }
  if (type === 'income') {
    return (
      <div className="w-12 h-12 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#10B981]">
        <DollarSign {...iconProps} />
      </div>
    )
  }
  
  return (
    <div className="w-12 h-12 rounded-full bg-[#FFFBEB] flex items-center justify-center text-[#F59E0B]">
      <Wallet {...iconProps} />
    </div>
  )
}

export function LargestTransactionsCard({ transactions }: LargestTransactionsCardProps) {
  // Sort by absolute amount descending, take top 4
  const largestTransactions = [...transactions]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 4)

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50">
      {largestTransactions.length > 0 ? (
        <div className="flex flex-col gap-5">
          {largestTransactions.map((tx) => {
            const isIncome = tx.type === 'income'
            const sign = isIncome ? '+' : '-'
            const colorClass = isIncome ? 'text-[#10B981]' : 'text-[#EF4444]'
            const date = new Date(tx.transaction_date)
            const dateString = date.toLocaleDateString('es-PE', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })

            const isAuto = tx.description.endsWith('[AUTO]') || tx.description.endsWith('(Automático)')
            const cleanDescription = tx.description.replace(' [AUTO]', '').replace(' (Automático)', '')

            return (
              <div key={tx.id} className="flex items-center gap-4">
                {getTransactionIcon(cleanDescription, tx.type)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#1E293B] truncate">
                      {cleanDescription}
                    </p>
                    {isAuto && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                        Automático
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#94A3B8]">{dateString}</p>
                </div>

                <div className={`text-sm font-semibold ${colorClass}`}>
                  {sign}{formatSoles(tx.amount).replace('.00', '')}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">Sin transacciones</p>
      )}
    </div>
  )
}
