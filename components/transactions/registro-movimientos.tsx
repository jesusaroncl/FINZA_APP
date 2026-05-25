'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Delete } from 'lucide-react'
import { SingleDatePicker } from '@/components/single-date-picker'
import type { Transaction } from './transaction-table'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
}

interface RegistroMovimientosProps {
  categories: Category[]
  onSuccess: () => void
  editingTransaction?: Transaction | null
  onEditCancel?: () => void
}

const CUOTAS_OPTIONS = [1, 2, 3, 6, 9, 12, 18, 24]
const INTERES_OPTIONS = ['Sin Intereses', '5%', '10%', '15%', '20%', '25%', '30%']

export function RegistroMovimientos({
  categories,
  onSuccess,
  editingTransaction,
  onEditCancel,
}: RegistroMovimientosProps) {
  const [mode, setMode] = useState<'income' | 'expense'>('expense')
  const [display, setDisplay] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [cuotas, setCuotas] = useState(1)
  const [interesTipo, setInteresTipo] = useState('Sin Intereses')
  const [interesTasa, setInteresTasa] = useState(0)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const isEditing = !!editingTransaction

  useEffect(() => {
    if (editingTransaction) {
      setMode(editingTransaction.type)
      setDisplay(String(editingTransaction.amount))
      setDescription(editingTransaction.description)
      
      const txDate = editingTransaction.date ? new Date(editingTransaction.date) : new Date()
      const y = txDate.getFullYear()
      const m = String(txDate.getMonth() + 1).padStart(2, '0')
      const d = String(txDate.getDate()).padStart(2, '0')
      setDate(`${y}-${m}-${d}`)
      
      const cat = categories.find((c) => c.name === editingTransaction.category)
      setCategoryId(cat?.id ?? '')
      
      const ext = editingTransaction as any
      setCuotas(ext.cuotas ?? 1)
      setInteresTipo(ext.interes_tipo ?? 'Sin Intereses')
      setInteresTasa(ext.interes_tasa ?? 0)
    }
  }, [editingTransaction, categories])

  const filteredCategories = categories

  const rawAmount = parseFloat(display) || 0

  const getInteresRate = (): number => {
    if (interesTipo === 'Sin Intereses') return 0
    if (interesTipo === 'Personalizado') return interesTasa / 100
    return parseFloat(interesTipo) / 100
  }

  const totalConInteres =
    interesTipo === 'Sin Intereses' ? rawAmount : rawAmount * (1 + getInteresRate())
  const montoPorCuota = cuotas > 1 ? totalConInteres / cuotas : totalConInteres

  const handleKey = (key: string) => {
    if (key === 'backspace') { setDisplay((p) => p.slice(0, -1)); return }
    if (key === '.' && display.includes('.')) return
    if (display.length >= 10) return
    setDisplay((p) => p + key)
  }

  const handleCancel = () => {
    setDisplay(''); setDescription(''); setCategoryId('')
    setDate(new Date().toISOString().split('T')[0])
    setMode('expense'); setCuotas(1); setInteresTipo('Sin Intereses'); setInteresTasa(0)
    onEditCancel?.()
  }

  const handleConfirm = async () => {
    const amount = parseFloat(display)
    if (!amount || amount <= 0) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [year, month, day] = date.split('-').map(Number)
      const now = new Date()
      
      const localDate = new Date(
        year, month - 1, day,
        now.getHours(), now.getMinutes(), now.getSeconds()
      )

      const payload: Record<string, any> = {
        description: description || (mode === 'income' ? 'Ingreso' : 'Gasto'),
        amount,
        type: mode,
        category_id: categoryId || null,
        transaction_date: localDate.toISOString(),
      }

      // Solo guardar cuotas/interés en gastos
      if (mode === 'expense') {
        payload.cuotas = cuotas
        payload.interes_tipo = interesTipo
        payload.interes_tasa = interesTipo === 'Personalizado' ? interesTasa : getInteresRate() * 100
        payload.monto_por_cuota = cuotas > 1 ? montoPorCuota : null
      } else {
        // Ingresos: valores por defecto
        payload.cuotas = 1
        payload.interes_tipo = 'Sin Intereses'
        payload.interes_tasa = 0
        payload.monto_por_cuota = null
      }

      if (isEditing && editingTransaction) {
        await supabase.from('transactions').update(payload).eq('id', editingTransaction.id)
      } else {
        await supabase.from('transactions').insert({ ...payload, user_id: user.id })
      }

      handleCancel(); onSuccess()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const numpadRows: string[][] = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['3', '2', '1'],
    [',', '0', '.', 'backspace'],
  ]

  return (
    <div
      className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col gap-5 transition-all"
      style={{
        borderColor: isEditing ? '#3B82F6' : '#F1F5F9',
        boxShadow: isEditing
          ? '0 0 0 2px #BFDBFE, 0 4px 16px 0 rgba(59,130,246,0.08)'
          : '0 1px 4px 0 rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-2" style={{ color: '#1E293B' }}>
          {isEditing && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
              Editando
            </span>
          )}
          Registro de Movimientos
        </h3>
        {isEditing && (
          <button onClick={handleCancel} className="text-xs font-medium hover:underline" style={{ color: '#94A3B8' }}>
            Cancelar edición
          </button>
        )}
      </div>

      {/* Toggle */}
      <div className="flex rounded-xl overflow-hidden" style={{ background: '#F1F5F9' }}>
        {(['income', 'expense'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
            style={{ background: mode === m ? '#1E293B' : 'transparent', color: mode === m ? '#FFFFFF' : '#94A3B8' }}>
            {m === 'income' ? 'Mis Ingresos' : 'Mis Gastos'}
          </button>
        ))}
      </div>

      {/* Descripción */}
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: '#1E293B' }}>Descripción</p>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Spotify, Salario..."
          className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:ring-2 focus:ring-blue-200 transition"
          style={{ background: '#F8FAFC', borderColor: '#E2E8F0', color: '#1E293B' }} />
      </div>

      {/* Monto */}
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: '#1E293B' }}>
          Monto de {mode === 'income' ? 'Ingreso' : 'Gasto'}
        </p>
        <div className="w-full rounded-xl px-4 py-3 text-right text-xl font-bold tracking-widest border"
          style={{ background: '#F8FAFC', borderColor: display ? '#94A3B8' : '#E2E8F0', color: display ? '#1E293B' : '#CBD5E1', minHeight: 52 }}>
          {display || '#####'}
        </div>
      </div>

      {/* Numpad */}
      <div className="grid gap-2">
        {numpadRows.map((row, ri) => (
          <div key={ri} className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {row.map((k) => k === 'backspace' ? (
              <button key="backspace" onClick={() => handleKey('backspace')}
                className="flex items-center justify-center rounded-xl transition-all active:scale-95 hover:bg-red-100"
                style={{ height: 48, background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444' }}>
                <Delete className="w-5 h-5" />
              </button>
            ) : (
              <button key={k} onClick={() => handleKey(k)}
                className="flex items-center justify-center rounded-xl text-lg font-semibold transition-all active:scale-95 hover:bg-slate-100"
                style={{ height: 48, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#1E293B' }}>
                {k}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Categoría */}
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: '#1E293B' }}>Categoría</p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full appearance-none rounded-xl px-4 py-2.5 text-sm pr-8 font-medium border outline-none"
              style={{ background: '#F1F5F9', borderColor: '#E2E8F0', color: '#475569' }}>
              <option value="">Sin categoría</option>
              {filteredCategories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4" style={{ color: '#94A3B8' }} />
          </div>
          {display && (
            <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#1E293B' }}>
              S/ {rawAmount.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* ── CUOTAS E INTERESES — solo para Gastos ── */}
      {mode === 'expense' && (
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>Cuotas</p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select value={cuotas} onChange={(e) => setCuotas(Number(e.target.value))}
                className="w-full appearance-none rounded-xl px-4 py-2.5 text-sm pr-8 font-medium border outline-none"
                style={{ background: '#FFFFFF', borderColor: '#E2E8F0', color: '#475569' }}>
                {CUOTAS_OPTIONS.map((n) => <option key={n} value={n}>{n === 1 ? 'Sin cuotas' : `${n} cuotas`}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4" style={{ color: '#94A3B8' }} />
            </div>
            {rawAmount > 0 && cuotas > 1 && (
              <span className="text-sm font-semibold whitespace-nowrap px-3 py-2 rounded-xl" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                S/ {montoPorCuota.toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select value={interesTipo} onChange={(e) => setInteresTipo(e.target.value)}
                className="w-full appearance-none rounded-xl px-4 py-2.5 text-sm pr-8 font-medium border outline-none"
                style={{ background: '#FFFFFF', borderColor: '#E2E8F0', color: '#475569' }}>
                {INTERES_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                <option value="Personalizado">Personalizado</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4" style={{ color: '#94A3B8' }} />
            </div>
            {interesTipo === 'Personalizado' ? (
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={100} value={interesTasa}
                  onChange={(e) => setInteresTasa(Number(e.target.value))}
                  className="w-16 rounded-xl px-3 py-2.5 text-sm font-medium border text-center outline-none"
                  style={{ background: '#FFFFFF', borderColor: '#E2E8F0', color: '#1E293B' }} />
                <span className="text-sm font-medium" style={{ color: '#64748B' }}>%</span>
              </div>
            ) : (
              <div className="w-12 h-10 flex items-center justify-center rounded-xl border text-sm font-semibold"
                style={{ background: '#FFFFFF', borderColor: '#E2E8F0', color: interesTipo === 'Sin Intereses' ? '#94A3B8' : '#3B82F6' }}>
                {interesTipo === 'Sin Intereses' ? '0' : interesTipo.replace('%', '')}
              </div>
            )}
          </div>

          {rawAmount > 0 && interesTipo !== 'Sin Intereses' && (
            <div className="flex items-center justify-between rounded-xl px-4 py-2" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <span className="text-xs font-medium" style={{ color: '#C2410C' }}>Total con interés</span>
              <span className="text-sm font-bold" style={{ color: '#C2410C' }}>S/ {totalConInteres.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Fecha */}
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: '#1E293B' }}>Fecha de recibo</p>
        <SingleDatePicker
          value={
            new Date(
              Number(date.split('-')[0]),
              Number(date.split('-')[1]) - 1,
              Number(date.split('-')[2])
            )
          }
          onChange={(newDate) => {
            const y = newDate.getFullYear()
            const m = String(newDate.getMonth() + 1).padStart(2, '0')
            const d = String(newDate.getDate()).padStart(2, '0')
            setDate(`${y}-${m}-${d}`)
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleCancel}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50"
          style={{ borderColor: '#E2E8F0', color: '#475569' }}>
          Cancel
        </button>
        <button onClick={handleConfirm} disabled={saving || !display}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
          style={{ background: isEditing ? '#3B82F6' : '#1E293B' }}>
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}
