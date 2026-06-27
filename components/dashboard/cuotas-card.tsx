'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatSoles } from '@/lib/utils-currency'

interface CuotaSerie {
  key: string
  name: string
  type: 'income' | 'expense'
  cuotaTotal: number    // N from (X/N) pattern — the original plan total
  cuotasPagadas: number
  montoPorCuota: number
  nextDateStr?: string
}

export function CuotasCard() {
  const [series, setSeries] = useState<CuotaSerie[]>([])
  const supabase = createClient()

  const loadSeries = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('transactions')
      .select('id,description,amount,transaction_date,type')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: true })

    if (!data) return

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const cuotaTxs = data.filter((t) => /\(\d+\/\d+\)$/.test(t.description))

    const groupMap = new Map<string, { txs: typeof cuotaTxs; type: string }>()
    for (const tx of cuotaTxs) {
      const match = tx.description.match(/^(.*)\((\d+)\/(\d+)\)$/)
      if (!match) continue
      const baseName = match[1].trim()
      const total = Number(match[3])
      const key = `${baseName}__${total}`
      if (!groupMap.has(key)) groupMap.set(key, { txs: [], type: tx.type })
      groupMap.get(key)!.txs.push(tx)
    }

    const result: CuotaSerie[] = []
    for (const [key, { txs, type }] of groupMap) {
      const firstMatch = txs[0].description.match(/^(.*)\((\d+)\/(\d+)\)$/)
      const name = firstMatch ? firstMatch[1].trim() : ''
      // Use the N from the pattern (original plan total), not txs.length (remaining)
      const cuotaTotal = firstMatch ? Number(firstMatch[3]) : txs.length
      const cuotasPagadas = txs.filter((t) => t.transaction_date.split('T')[0] <= todayStr).length
      const montoPorCuota = txs[0].amount
      const nextTx = txs.find((t) => t.transaction_date.split('T')[0] > todayStr)
      result.push({
        key,
        name,
        type: type as 'income' | 'expense',
        cuotaTotal,
        cuotasPagadas,
        montoPorCuota,
        nextDateStr: nextTx?.transaction_date.split('T')[0],
      })
    }

    setSeries(result)
  }, [supabase])

  useEffect(() => {
    loadSeries()
    const onVisible = () => { if (document.visibilityState === 'visible') loadSeries() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadSeries])

  const deleteSeries = useCallback(async (baseName: string, total: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: allTxs } = await supabase
      .from('transactions')
      .select('id, description')
      .eq('user_id', user.id)

    const ids = (allTxs ?? [])
      .filter((t) => {
        const m = t.description?.match(/^(.*)\((\d+)\/(\d+)\)$/)
        return m && m[1].trim() === baseName && Number(m[3]) === total
      })
      .map((t) => t.id)

    if (ids.length > 0) {
      await supabase.from('transactions').delete().in('id', ids)
    }
    await loadSeries()
  }, [supabase, loadSeries])

  if (series.length === 0) return null

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50">
      <div className="flex flex-col gap-4">
        {series.map((s) => {
          const paidAmount = s.montoPorCuota * s.cuotasPagadas
          const pendingAmount = s.montoPorCuota * (s.cuotaTotal - s.cuotasPagadas)
          const totalAmount = s.montoPorCuota * s.cuotaTotal
          const progress = Math.round((s.cuotasPagadas / s.cuotaTotal) * 100)
          const isExpense = s.type === 'expense'
          const color = isExpense ? '#F97316' : '#22C55E'

          let nextLabel = ''
          if (s.nextDateStr) {
            const [ty, tm, td] = s.nextDateStr.split('-').map(Number)
            const d = new Date(ty, tm - 1, td)
            nextLabel = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
          }

          return (
            <div key={s.key} className="rounded-2xl p-4 border border-slate-100">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#1E293B]">{s.name}</p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: isExpense ? '#FFF7ED' : '#F0FDF4', color }}
                  >
                    {isExpense ? 'Gasto' : 'Ingreso'} · {s.cuotaTotal} cuotas
                  </span>
                  <button
                    onClick={() => deleteSeries(s.name, s.cuotaTotal)}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                    title="Eliminar plan de cuotas"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: color }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#94A3B8] mb-3">
                <span>{s.cuotasPagadas} de {s.cuotaTotal} pagadas ({progress}%)</span>
                {nextLabel && <span>Próximo: {nextLabel}</span>}
              </div>

              {/* Montos */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl p-2.5 text-center" style={{ background: '#F8FAFC' }}>
                  <p className="text-[10px] text-[#94A3B8] mb-0.5">Por cuota</p>
                  <p className="text-xs font-bold text-[#1E293B]">{formatSoles(s.montoPorCuota)}</p>
                </div>
                <div className="rounded-xl p-2.5 text-center" style={{ background: '#F0FDF4' }}>
                  <p className="text-[10px] text-[#15803D] mb-0.5">Pagado</p>
                  <p className="text-xs font-bold text-[#15803D]">{formatSoles(paidAmount)}</p>
                </div>
                <div className="rounded-xl p-2.5 text-center" style={{ background: '#FFF7ED' }}>
                  <p className="text-[10px] text-[#C2410C] mb-0.5">Pendiente</p>
                  <p className="text-xs font-bold text-[#C2410C]">{formatSoles(pendingAmount)}</p>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100">
                <span className="text-xs text-[#94A3B8]">Total del plan</span>
                <span className="text-sm font-bold text-[#1E293B]">{formatSoles(totalAmount)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
