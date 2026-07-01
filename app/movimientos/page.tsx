'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ensureDefaultCategories } from '@/lib/default-categories'
import { processRecurringExpenses } from '@/lib/process-recurring-expenses'
import {
  TransactionIndicators,
  TransactionTabs,
  TransactionTable,
  RegistroMovimientos,
  DeleteConfirmModal,
  type Transaction as BaseTransaction,
} from '@/components/transactions'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DateRangePicker, type DateRange } from '@/components/date-range-picker'

type TabType = 'all' | 'income' | 'expense'

interface Transaction extends BaseTransaction {
  transaction_date: string
  user_id: string
  category_id: string | null
  cuotas?: number
  interes_tipo?: string
  interes_tasa?: number
  monto_por_cuota?: number | null
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

const PAGE_SIZE = 5

export default function MovimientosPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingTransaction, setEditingTransaction] = useState<BaseTransaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return { start: today, end: today }
  })

  const supabase = createClient()

  const calculateStats = useCallback((txs: Transaction[], cats: Category[]) => {
    const ahorroId = cats.find((c) => c.name === 'Ahorro')?.id ?? null
    const income = txs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    const expense = txs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    // Ahorro Total = entradas de ahorro - salidas de ahorro (acumulado histórico)
    const ahorroEntradas = txs
      .filter((t) => t.type === 'income' && t.category_id === ahorroId)
      .reduce((sum, t) => sum + t.amount, 0)
    const ahorroSalidas = txs
      .filter((t) => t.type === 'expense' && t.category_id === ahorroId)
      .reduce((sum, t) => sum + t.amount, 0)
    const savings = ahorroEntradas - ahorroSalidas
    return { balance: income - expense, income, expense, savings }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await ensureDefaultCategories(supabase, user.id)
      await processRecurringExpenses(supabase, user.id)

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
      }
      if (catData) setCategories(catData)
    } catch (error) {
      console.error('[movimientos] Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, calculateStats])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Abre el modal de confirmación
  const handleDelete = (id: string) => {
    setDeletingId(id)
  }

  // Confirma y ejecuta el borrado
  const confirmDelete = async () => {
    if (!deletingId) return

    const tx = transactions.find((t) => t.id === deletingId)
    const cuotaMatch = tx?.description?.match(/^(.*)\((\d+)\/(\d+)\)$/)

    if (cuotaMatch) {
      const baseName = cuotaMatch[1].trim()
      const total = Number(cuotaMatch[3])

      // Consultar Supabase directamente para obtener todas las cuotas de la serie
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setDeletingId(null); return }

      const { data: allTxs } = await supabase
        .from('transactions')
        .select('id, description')
        .eq('user_id', user.id)

      const seriesIds = (allTxs ?? [])
        .filter((t) => {
          const m = t.description?.match(/^(.*)\((\d+)\/(\d+)\)$/)
          return m && m[1].trim() === baseName && Number(m[3]) === total
        })
        .map((t) => t.id)

      if (seriesIds.length > 0) {
        await supabase.from('transactions').delete().in('id', seriesIds)
        setTransactions((prev) => prev.filter((t) => !seriesIds.includes(t.id)))
      }
    } else {
      const { error } = await supabase.from('transactions').delete().eq('id', deletingId)
      if (!error) {
        setTransactions((prev) => prev.filter((t) => t.id !== deletingId))
      }
    }

    setDeletingId(null)
  }

  const cancelDelete = () => setDeletingId(null)

  const handleEdit = (transaction: BaseTransaction) => {
    setEditingTransaction(transaction)
    // Scroll to top so the panel is visible
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEditCancel = () => {
    setEditingTransaction(null)
  }

  const getCategoryName = (catId: string | null): string => {
    if (!catId) return 'Sin categoría'
    const cat = categories.find((c) => c.id === catId)
    return cat?.name ?? 'Sin categoría'
  }

  // Filtered by date range — usa fechas locales en ambos lados para coincidir con el display
  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const dateFiltered = transactions.filter((t) => {
    if (!dateRange.start && !dateRange.end) return true
    // Usar directamente la parte de fecha del string (transaction_date, no created_at)
    const txStr = t.transaction_date.split('T')[0]
    const aStr = dateRange.start ? toLocalDateStr(dateRange.start) : null
    const bStr = dateRange.end   ? toLocalDateStr(dateRange.end)   : aStr
    const lo = aStr && bStr ? (aStr <= bStr ? aStr : bStr) : (aStr ?? bStr)
    const hi = aStr && bStr ? (aStr <= bStr ? bStr : aStr) : (aStr ?? bStr)
    if (lo && txStr < lo) return false
    if (hi && txStr > hi) return false
    return true
  })

  // Cards: solo transacciones hasta hoy (excluye cuotas futuras)
  const todayStr = toLocalDateStr(new Date())
  const pastTransactions = transactions.filter((t) => t.transaction_date.split('T')[0] <= todayStr)
  const currentStats = calculateStats(pastTransactions, categories)

  // Filtered by tab for the table
  const filtered = dateFiltered
    .filter((t) => {
      if (activeTab !== 'all' && t.type !== activeTab) return false
      return true
    })
    .map((t) => ({
      id: t.id,
      description: t.description,
      type: t.type,
      category: getCategoryName(t.category_id),
      date: t.transaction_date,
      amount: t.amount,
      cuotas: t.cuotas,
      interes_tipo: t.interes_tipo,
      interes_tasa: t.interes_tasa,
      monto_por_cuota: t.monto_por_cuota,
    }))

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#1D4ED8] animate-spin" />
      </div>
    )
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: '100vh', overflow: 'hidden', background: '#F8FAFC', padding: '28px 32px 0 32px' }}
    >
      {/* Modal de confirmación de eliminación */}
      {deletingId && (
        <DeleteConfirmModal
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isCuotaSeries={!!transactions.find((t) => t.id === deletingId)?.description?.match(/\(\d+\/\d+\)$/)}
        />
      )}

      {/* ── FIXED TOP SECTION ── */}
      <div className="flex-shrink-0">
        {/* Title */}
        <h1 className="text-2xl font-bold mb-5" style={{ color: '#0F172A' }}>
          Mis Movimientos
        </h1>

        {/* Stats cards */}
        <TransactionIndicators
          balance={currentStats.balance}
          income={currentStats.income}
          expense={currentStats.expense}
          savings={currentStats.savings}
          disponible={currentStats.balance - currentStats.savings}
        />

        {/* Date range picker */}
        <div className="mb-5">
          <DateRangePicker
            value={dateRange}
            onChange={(range) => { setDateRange(range); setCurrentPage(1) }}
          />
        </div>
      </div>

      {/* ── SCROLLABLE GRID (fills remaining screen height) ── */}
      <div
        className="grid flex-1 min-h-0 gap-8 pb-6"
        style={{ gridTemplateColumns: '1fr 480px' }}
      >
        {/* ── LEFT: table column ── */}
        <div className="flex flex-col min-h-0">
          <h2 className="flex-shrink-0 text-base font-bold mb-4" style={{ color: '#0F172A' }}>
            Mis Movimientos
          </h2>

          {/* Tabs */}
          <div className="flex-shrink-0">
            <TransactionTabs activeTab={activeTab} onTabChange={handleTabChange} />
          </div>

          {/* Table — scrollable area */}
          <div className="flex-1 overflow-y-auto mt-5 min-h-0">
            <TransactionTable
              transactions={paginated}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          {/* Pagination — always visible, pinned at bottom of left column */}
          {totalPages > 1 && (
            <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40"
                style={{ borderColor: '#E2E8F0', color: '#475569' }}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>

              {(() => {
                const pages: (number | 'ellipsis')[] = []
                const delta = 2
                const left = currentPage - delta
                const right = currentPage + delta

                for (let p = 1; p <= totalPages; p++) {
                  if (p === 1 || p === totalPages || (p >= left && p <= right)) {
                    pages.push(p)
                  } else if (pages[pages.length - 1] !== 'ellipsis') {
                    pages.push('ellipsis')
                  }
                }

                return pages.map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e-${i}`} className="w-8 text-center text-sm" style={{ color: '#94A3B8' }}>
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className="w-8 h-8 rounded-lg text-sm font-semibold border transition-colors"
                      style={{
                        borderColor: currentPage === p ? '#3B82F6' : '#E2E8F0',
                        background: currentPage === p ? '#3B82F6' : '#FFFFFF',
                        color: currentPage === p ? '#FFFFFF' : '#475569',
                      }}
                    >
                      {p}
                    </button>
                  )
                )
              })()}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40"
                style={{ borderColor: '#E2E8F0', color: '#475569' }}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Registro de Movimientos con scroll interno ── */}
        <div className="min-h-0 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <RegistroMovimientos
            categories={categories}
            onSuccess={fetchData}
            editingTransaction={editingTransaction}
            onEditCancel={handleEditCancel}
          />
        </div>
      </div>
    </div>
  )
}

