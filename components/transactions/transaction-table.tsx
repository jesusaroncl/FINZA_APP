'use client'

import { formatSoles } from '@/lib/utils-currency'
import { Edit2, Trash2 } from 'lucide-react'

export interface Transaction {
  id: string
  description: string
  type: 'income' | 'expense'
  category: string
  date: string
  amount: number
}

interface TransactionTableProps {
  transactions: Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
        <p className="text-gray-500">No hay transacciones para mostrar</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
              Descripción
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
              Acciones
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
              Tipo
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
              Fecha
            </th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
              Monto
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-700">
                {transaction.description}
              </td>
              <td className="px-6 py-4 flex gap-2">
                <button
                  onClick={() => onEdit(transaction)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(transaction.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {new Date(transaction.date).toLocaleDateString('es-PE', {
                  year: 'numeric',
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td
                className={`px-6 py-4 text-right text-sm font-semibold ${
                  transaction.type === 'income'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {transaction.type === 'income' ? '+' : '-'}
                {formatSoles(Math.abs(transaction.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
