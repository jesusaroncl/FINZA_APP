'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TransactionIndicators,
  TransactionTabs,
  TransactionTable,
  type Transaction as BaseTransaction,
} from '@/components/transactions'
import { Calendar } from 'lucide-react'

type TabType = 'all' | 'income' | 'expense'

interface Transaction extends BaseTransaction {
  transaction_date: string
  user_id: string
  category_id: string | null
}

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
}

interface TransactionStats {
  balance: number
  income: number
  expense: number
  savings: number
}

export default function MovimientosPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [stats, setStats] = useState<TransactionStats>({
    balance: 0,
    income: 0,
    expense: 0,
    savings: 0,
  })

  const supabase = createClient()

  const calculateStats = useCallback((txs: Transaction[]) => {
    const income = txs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const expense = txs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      balance: income - expense,
      income,
      expense,
      savings: Math.max(0, income - expense),
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log('[v0] No user found')
        return
      }

      const [{ data: txData }, { data: catData }] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id),
      ])

      if (txData) {
        setTransactions(txData)
        setStats(calculateStats(txData))
      }

      if (catData) {
        setCategories(catData)
      }
    } catch (error) {
      console.error('[v0] Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, calculateStats])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return

    const { error } = await supabase.from('transactions').delete().eq('id', id)

    if (!error) {
      const updated = transactions.filter((t) => t.id !== id)
      setTransactions(updated)
      setStats(calculateStats(updated))
    } else {
      console.error('[v0] Error deleting transaction:', error)
    }
  }

  const handleEdit = (transaction: BaseTransaction) => {
    console.log('[v0] Editing transaction:', transaction)
    // TODO: Implementar modal de edición
  }

  const getFilteredTransactions = (): BaseTransaction[] => {
    return transactions
      .filter((t) => {
        if (activeTab === 'all') return true
        return t.type === activeTab
      })
      .map((t) => ({
        id: t.id,
        description: t.description,
        type: t.type,
        category: t.category_id ? 'Categoría' : 'Sin categoría',
        date: t.transaction_date,
        amount: t.amount,
      }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Cargando transacciones...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Mis Movimientos</h1>
        <TransactionIndicators
          balance={stats.balance}
          income={stats.income}
          expense={stats.expense}
          savings={stats.savings}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 border border-gray-300 rounded-lg px-4 py-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-700">
            {new Date().toLocaleDateString('es-PE')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Mis Movimientos</h2>
          <TransactionTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <TransactionTable
            transactions={getFilteredTransactions()}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Registro de Movimientos
          </h3>
          <p className="text-gray-500 text-sm">
            Formulario de registro próximamente
          </p>
        </div>
      </div>
    </div>
  )
}
