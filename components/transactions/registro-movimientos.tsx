'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [mode, setMode] = useState<'income' | 'expense' | 'transfer'>('expense')
  const [display, setDisplay] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  })
  const [cuotas, setCuotas] = useState(1)
  const [interesTipo, setInteresTipo] = useState('Sin Intereses')
  const [interesTasa, setInteresTasa] = useState(0)
  const [time, setTime] = useState(() => {
    const n = new Date()
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const isEditing = !!editingTransaction

  useEffect(() => {
    if (editingTransaction) {
      const isAhorroTx = editingTransaction.category === 'Ahorro' && editingTransaction.type === 'income'
      setMode(isAhorroTx ? 'transfer' : editingTransaction.type)
      setDisplay(String(editingTransaction.amount))
      setDescription(editingTransaction.description)
      
      const dateStr = editingTransaction.date?.split('T')[0]
      if (dateStr) setDate(dateStr)
      const timeStr = editingTransaction.date?.split('T')[1]?.slice(0, 5)
      if (timeStr) setTime(timeStr)
      
      const cat = categories.find((c) => c.name === editingTransaction.category)
      setCategoryId(cat?.id ?? '')
      
      const ext = editingTransaction as any
      setCuotas(ext.cuotas ?? 1)
      setInteresTipo(ext.interes_tipo ?? 'Sin Intereses')
      setInteresTasa(ext.interes_tasa ?? 0)

    }
  }, [editingTransaction, categories])

  const ahorroCategory = categories.find((c) => c.name === 'Ahorro')
  const isTransfer = mode === 'transfer'

  // Al entrar en modo transferencia, forzar categoría Ahorro
  useEffect(() => {
    if (isTransfer && ahorroCategory) setCategoryId(ahorroCategory.id)
  }, [isTransfer, ahorroCategory?.id])

  const filteredCategories = categories
  const isAhorro = categories.find((c) => c.id === categoryId)?.name === 'Ahorro'

  const rawAmount = parseFloat(display) || 0

  const getInteresRate = (): number => {
    if (interesTipo === 'Sin Intereses') return 0
    if (interesTipo === 'Personalizado') return interesTasa / 100
    return parseFloat(interesTipo) / 100
  }

  const totalConInteres =
    interesTipo === 'Sin Intereses' ? rawAmount : rawAmount * (1 + getInteresRate())
  const montoPorCuota = cuotas > 1 ? totalConInteres / cuotas : totalConInteres

  const handleKey = useCallback((key: string) => {
    if (key === 'backspace') { setDisplay((p) => p.slice(0, -1)); return }
    if (key === '.' && display.includes('.')) return
    if (display.length >= 10) return
    setDisplay((p) => p + key)
  }, [display])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture when user is typing in a text input
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key >= '0' && e.key <= '9') { handleKey(e.key); return }
      if (e.key === '.' || e.key === ',') { handleKey('.'); return }
      if (e.key === 'Backspace') { handleKey('backspace'); return }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  const handleCancel = () => {
    setDisplay(''); setDescription(''); setCategoryId('')
    const _n = new Date()
    setDate(`${_n.getFullYear()}-${String(_n.getMonth() + 1).padStart(2, '0')}-${String(_n.getDate()).padStart(2, '0')}`)
    setTime(`${String(_n.getHours()).padStart(2, '0')}:${String(_n.getMinutes()).padStart(2, '0')}`)
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

      const [h, min] = time.split(':')
      const sec = '00'

      const txType = mode === 'transfer' ? 'income' : mode
      // Si hay cuotas, guardar solo el monto mensual (monto_por_cuota), no el total
      const savedAmount = !isTransfer && cuotas > 1 ? montoPorCuota : amount
      const payload: Record<string, any> = {
        description: description || (mode === 'income' ? 'Ingreso' : mode === 'transfer' ? 'Transferencia a Ahorros' : 'Gasto'),
        amount: savedAmount,
        type: txType,
        category_id: categoryId || null,
        transaction_date: `${date}T${h}:${min}:${sec}`,
      }

      // Cuotas/interés para ingresos y gastos (no transferencia)
      if (!isTransfer) {
        payload.cuotas = cuotas
        payload.interes_tipo = interesTipo
        payload.interes_tasa = interesTipo === 'Personalizado' ? interesTasa : getInteresRate() * 100
        payload.monto_por_cuota = cuotas > 1 ? montoPorCuota : null
      } else {
        payload.cuotas = 1
        payload.interes_tipo = 'Sin Intereses'
        payload.interes_tasa = 0
        payload.monto_por_cuota = null
      }

      if (isEditing && editingTransaction) {
        await supabase.from('transactions').update(payload).eq('id', editingTransaction.id)
      } else if (!isTransfer && cuotas > 1) {
        // Crear una transacción por cada cuota, en meses consecutivos
        const [baseY, baseM, baseD] = date.split('-').map(Number)
        const rows = Array.from({ length: cuotas }, (_, i) => {
          const d = new Date(baseY, baseM - 1 + i, baseD)
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return {
            ...payload,
            user_id: user.id,
            transaction_date: `${y}-${m}-${day}T${h}:${min}:${sec}`,
            description: `${payload.description} (${i + 1}/${cuotas})`,
            cuotas: 1,            // cada fila es 1 cuota individual
            monto_por_cuota: null,
          }
        })
        await supabase.from('transactions').insert(rows)
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
        {(['transfer', 'income', 'expense'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
            style={{
              background: mode === m ? (m === 'transfer' ? '#22C55E' : '#1E293B') : 'transparent',
              color: mode === m ? '#FFFFFF' : '#94A3B8',
            }}>
            {m === 'income' ? 'Ingresos' : m === 'expense' ? 'Gastos' : 'Transferencia'}
          </button>
        ))}
      </div>

      {/* Aviso modo transferencia */}
      {isTransfer && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" stroke="#22C55E" strokeWidth={2}>
            <path d="M12 2v20M2 12h20" strokeLinecap="round"/>
          </svg>
          <p className="text-xs font-medium" style={{ color: '#15803D' }}>
            El monto ingresado se transferirá directamente a tu cuenta de <strong>Ahorros</strong>.
          </p>
        </div>
      )}

      {/* Descripción — oculta en transferencia */}
      {!isTransfer && (
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: '#1E293B' }}>Descripción</p>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={mode === 'income' ? 'Ej: Salario, Freelance...' : 'Ej: Spotify, Almuerzo...'}
            className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:ring-2 focus:ring-blue-200 transition"
            style={{ background: '#F8FAFC', borderColor: '#E2E8F0', color: '#1E293B' }} />
        </div>
      )}

      {/* Monto */}
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: '#1E293B' }}>
          Monto de {mode === 'income' ? 'Ingreso' : mode === 'transfer' ? 'Transferencia' : 'Gasto'}
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

      {/* Categoría — oculta en transferencia */}
      {!isTransfer && <div>
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
      </div>}

      {/* ── CUOTAS E INTERESES — oculto solo en Transferencia y Ahorro ── */}
      {!isTransfer && !isAhorro && (
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


      {/* Fecha y hora — solo para Ingresos y Gastos */}
      {!isTransfer && (
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: '#1E293B' }}>Fecha y hora</p>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
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
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-xl px-3 py-2.5 text-sm border outline-none focus:ring-2 focus:ring-blue-200 transition"
              style={{ background: '#F8FAFC', borderColor: '#E2E8F0', color: '#1E293B', width: 110 }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleCancel}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50"
          style={{ borderColor: '#E2E8F0', color: '#475569' }}>
          Cancelar
        </button>
        <button onClick={handleConfirm} disabled={saving || !display}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
          style={{ background: isEditing ? '#3B82F6' : '#1E293B' }}>
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
