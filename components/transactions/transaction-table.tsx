'use client'

import { formatSoles } from '@/lib/utils-currency'
import { Pencil, Trash2 } from 'lucide-react'

export interface Transaction {
  id: string
  description: string
  type: 'income' | 'expense'
  category: string
  date: string
  amount: number
  // Cuotas e interés (opcionales, solo en gastos)
  cuotas?: number
  interes_tipo?: string
  interes_tasa?: number
  monto_por_cuota?: number | null
}

interface TransactionTableProps {
  transactions: Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
}

function TransactionTypeIcon({ type }: { type: 'income' | 'expense' }) {
  const isIncome = type === 'income'
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: 30, height: 30,
        background: isIncome ? '#F0FDF4' : '#FFF1F2',
        color: isIncome ? '#22C55E' : '#EF4444',
        border: `1.5px solid ${isIncome ? '#BBF7D0' : '#FECDD3'}`,
      }}
    >
      {isIncome ? (
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 12V4M4 8l4-4 4 4" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 4v8M4 8l4 4 4-4" />
        </svg>
      )}
    </div>
  )
}

export function TransactionTable({ transactions, onEdit, onDelete }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <p className="text-gray-400 text-sm">No hay transacciones para mostrar</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
            <th className="px-5 py-4 text-left text-xs font-semibold" style={{ color: '#3B82F6' }}>Description</th>
            <th className="px-4 py-4 text-left text-xs font-semibold" style={{ color: '#3B82F6' }}>Acciones</th>
            <th className="px-4 py-4 text-left text-xs font-semibold" style={{ color: '#3B82F6' }}>Type</th>
            <th className="px-4 py-4 text-left text-xs font-semibold" style={{ color: '#3B82F6' }}>Date</th>
            <th className="px-5 py-4 text-right text-xs font-semibold" style={{ color: '#F97316' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => {
            const hasCuotas = tx.type === 'expense' && tx.cuotas && tx.cuotas > 1
            const hasInteres = tx.type === 'expense' && tx.interes_tipo && tx.interes_tipo !== 'Sin Intereses'

            return (
              <tr
                key={tx.id}
                className="hover:bg-slate-50 transition-colors"
                style={{ borderBottom: i < transactions.length - 1 ? '1px solid #F8FAFC' : 'none' }}
              >
                {/* Description */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <TransactionTypeIcon type={tx.type} />
                    <span className="text-sm font-medium" style={{ color: '#1E293B' }}>
                      {tx.description}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(tx)} className="hover:opacity-70 transition-opacity" title="Editar">
                      <Pencil className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                    </button>
                    <button onClick={() => onDelete(tx.id)} className="hover:opacity-70 transition-opacity" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                    </button>
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3.5 text-sm" style={{ color: '#64748B' }}>
                  {tx.category}
                </td>

                {/* Date */}
                <td className="px-4 py-3.5 text-sm" style={{ color: '#64748B' }}>
                  {(() => {
                    // Ahora que la base de datos es timestamptz, tx.date contiene
                    // la fecha y hora exactas con su zona horaria.
                    const d = new Date(tx.date)
                    return d.toLocaleDateString('es-PE', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit', hour12: true,
                    })
                  })()}
                </td>

                {/* Amount + cuotas/interés info */}
                <td className="px-5 py-3.5 text-right">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: tx.type === 'income' ? '#22C55E' : '#EF4444' }}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatSoles(Math.abs(tx.amount))}
                  </span>

                  {/* Sub-info: cuotas */}
                  {hasCuotas && (
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: '#EFF6FF', color: '#3B82F6' }}
                      >
                        {tx.cuotas} cuotas
                        {tx.monto_por_cuota != null && (
                          <span style={{ color: '#60A5FA' }}>
                            · S/ {tx.monto_por_cuota.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Sub-info: interés */}
                  {hasInteres && (
                    <div className="flex items-center justify-end mt-0.5">
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: '#FFF7ED', color: '#C2410C' }}
                      >
                        {tx.interes_tipo}
                        {tx.interes_tasa ? ` (${tx.interes_tasa}%)` : ''}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
