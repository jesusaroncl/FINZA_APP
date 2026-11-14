import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { formatSoles } from '@/lib/utils-currency'
import { createClient } from '@/lib/supabase/client'

function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

interface FixedExpense {
  id: string
  name: string
  amount: number
  category_id?: string
  frequency: 'semanal' | 'mensual' | 'anual'
  start_date: string
  last_processed_date?: string | null
}

function isPaid(expense: FixedExpense): boolean {
  if (!expense.last_processed_date) return false
  const now = new Date()
  const last = new Date(expense.last_processed_date)
  switch (expense.frequency) {
    case 'mensual':
      return last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth()
    case 'semanal': {
      const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      return diffDays < 7
    }
    case 'anual':
      return last.getFullYear() === now.getFullYear()
    default:
      return false
  }
}

interface Category {
  id: string
  name: string
  type: string
}

interface UpcomingExpensesCardProps {
  categories?: Category[]
}

export function UpcomingExpensesCard({ categories = [] }: UpcomingExpensesCardProps) {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newFreq, setNewFreq] = useState<'semanal' | 'mensual' | 'anual'>('mensual')
  const [newDate, setNewDate] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [formError, setFormError] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)

  useEffect(() => {
    fetchExpenses()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchExpenses() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const fetchExpenses = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

    const { data: recurring } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true })

    if (recurring) setExpenses(recurring)
  }

  const openAddModal = () => {
    setFormError('')
    setEditingId(null)
    setNewName('')
    setNewAmount('')
    setNewFreq('mensual')
    setNewDate(todayLocal())
    setNewCategory('')
    setIsModalOpen(true)
  }

  const openEditModal = (expense: FixedExpense) => {
    setFormError('')
    setEditingId(expense.id)
    setNewName(expense.name)
    setNewAmount(expense.amount.toString())
    setNewFreq(expense.frequency)
    setNewDate(expense.start_date ? expense.start_date.split('T')[0] : todayLocal())
    setNewCategory(expense.category_id || '')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    const missing: string[] = []
    if (!newName.trim()) missing.push('tipo de gasto')
    if (!newAmount) missing.push('monto')
    if (!newDate) missing.push('fecha')
    if (!newCategory) missing.push('categoría')
    if (missing.length > 0) {
      setFormError(`Completa todos los campos obligatorios: ${missing.join(', ')}.`)
      return
    }
    const val = Number(newAmount)
    if (!Number.isFinite(val) || val <= 0) {
      setFormError('El monto debe ser mayor a 0.')
      return
    }
    setFormError('')
    setSavingExpense(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setFormError('Tu sesión expiró. Vuelve a iniciar sesión.')
        return
      }
      const row = { name: newName.trim(), amount: val, frequency: newFreq, start_date: newDate, category_id: newCategory }
      const { data, error } = editingId
        ? await supabase.from('recurring_expenses').update(row).eq('id', editingId).select('id')
        : await supabase.from('recurring_expenses').insert({ ...row, user_id: user.id }).select('id')
      if (error || !data || data.length === 0) {
        console.error('Error guardando gasto fijo:', error)
        setFormError('No se pudo guardar el gasto fijo. Intenta de nuevo.')
        return
      }
      await fetchExpenses()

      setIsModalOpen(false)
      setEditingId(null)
      setNewName('')
      setNewAmount('')
      setNewFreq('mensual')
      setNewDate('')
      setNewCategory('')
    } catch (e) {
      console.error('Error guardando gasto fijo:', e)
      setFormError('No se pudo guardar el gasto fijo. Intenta de nuevo.')
    } finally {
      setSavingExpense(false)
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('recurring_expenses').delete().eq('id', id)
    await fetchExpenses()
  }

  return (
    <>
      <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50">
        <div className="flex justify-end items-center mb-6">
          <button 
            onClick={openAddModal}
            className="w-6 h-6 rounded-full bg-[#1D4ED8] flex items-center justify-center text-white hover:bg-blue-800 transition-colors"
          >
            <Plus size={14} strokeWidth={3} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No hay gastos recurrentes</p>
          ) : expenses.map((expense) => {
              // Convert stored ISO string to local Date object correctly avoiding timezone shifts
              const dateStr = expense.start_date || new Date().toISOString()
              const [yearStr, monthStr, dayStr] = dateStr.split('T')[0].split('-')
              const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr))
              
              const month = date.toLocaleString('es-PE', { month: 'short' })
              const day = date.getDate()
              const year = date.getFullYear()

              return (
                <div key={expense.id} className="flex items-center gap-4">
                  {/* Date Block */}
                  <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-[#94A3B8] uppercase">{month}</span>
                    <span className="text-lg font-bold text-[#0F172A] leading-tight">{day}</span>
                  </div>
                  
                  {/* Info Block */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1E293B] truncate">{expense.name}</p>
                    <p className="text-xs font-medium text-[#94A3B8] truncate mb-1">
                      Inicio: {day} {month}, {year} • <span className="capitalize">{expense.frequency}</span>
                    </p>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => openEditModal(expense)}
                        className="text-[#64748B] hover:text-[#1E293B] transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button 
                        onClick={() => handleDelete(expense.id)}
                        className="text-[#64748B] hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Amount + Estado */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-sm font-bold text-[#1E293B]">
                      {formatSoles(expense.amount).replace('.00', '')}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                      style={isPaid(expense)
                        ? { background: '#DCFCE7', color: '#16A34A' }
                        : { background: '#FEF9C3', color: '#CA8A04' }
                      }
                    >
                      {isPaid(expense) ? 'Pagado' : 'Sin pagar'}
                    </span>
                  </div>
                </div>
              )
          })}

        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 w-[400px] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-[#1E293B] mb-2 pr-6">
              {editingId ? 'Editar Gasto Fijo' : 'Añadir Gastos Fijos'}
            </h2>
            <p className="text-sm text-[#64748B] mb-6 pr-4">
              Añade tus gastos fijos mensuales/semanales/anuales para tenerlos mapeados
            </p>
            
            <div className="space-y-4 mb-6">
              <input 
                type="text"
                placeholder="Ingresa Tipo de Gasto"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setFormError('') }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[#0F172A] placeholder:text-[#94A3B8]"
              />
              <input 
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Ingresa un monto"
                value={newAmount}
                onChange={(e) => { setNewAmount(e.target.value); setFormError('') }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[#0F172A] placeholder:text-[#94A3B8]"
              />
              <input 
                type="date"
                value={newDate}
                onChange={(e) => { setNewDate(e.target.value); setFormError('') }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[#0F172A]"
              />
              <select
                value={newCategory}
                onChange={(e) => { setNewCategory(e.target.value); setFormError('') }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[#0F172A] bg-white"
              >
                <option value="" disabled>Selecciona una categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-6 mb-8 px-1">
              <label 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setNewFreq('semanal')}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${newFreq === 'semanal' ? 'bg-[#1D4ED8] border-[#1D4ED8]' : 'border-slate-300 group-hover:border-slate-400'}`}>
                  {newFreq === 'semanal' && <div className="w-2 h-2 bg-white rounded-[2px]" />}
                </div>
                <span className="text-sm text-[#334155] select-none">Semanal</span>
              </label>

              <label 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setNewFreq('mensual')}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${newFreq === 'mensual' ? 'bg-[#1D4ED8] border-[#1D4ED8]' : 'border-slate-300 group-hover:border-slate-400'}`}>
                  {newFreq === 'mensual' && <div className="w-2 h-2 bg-white rounded-[2px]" />}
                </div>
                <span className="text-sm text-[#334155] select-none">Mensual</span>
              </label>

              <label 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setNewFreq('anual')}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${newFreq === 'anual' ? 'bg-[#1D4ED8] border-[#1D4ED8]' : 'border-slate-300 group-hover:border-slate-400'}`}>
                  {newFreq === 'anual' && <div className="w-2 h-2 bg-white rounded-[2px]" />}
                </div>
                <span className="text-sm text-[#334155] select-none">Anual</span>
              </label>
            </div>

            {formError && (<div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>)}
            <div className="flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-[#1E293B] font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={savingExpense}
                className="flex-1 py-3 rounded-xl bg-[#1D4ED8] text-white font-semibold hover:bg-blue-800 transition-colors disabled:opacity-60"
              >
                {savingExpense ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
