import { ReactNode } from 'react'
import { formatSoles } from '@/lib/utils-currency'

interface StatsCardProps {
  title: string
  amount: number
  icon: ReactNode
  color: string
}

export function StatsCard({ title, amount, icon, color }: StatsCardProps) {
  return (
    <div className={`${color} rounded-lg p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-2">{formatSoles(amount)}</p>
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </div>
  )
}
