import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { formatSoles } from '@/lib/utils-currency'

interface FixedExpense {
  id: string
  name: string
  amount: number
  frequency: 'semanal' | 'mensual' | 'anual'
  startDate: string
}

export function UpcomingExpensesCard() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newFreq, setNewFreq] = useState<'semanal' | 'mensual' | 'anual'>('mensual')
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('finza_fixed_expenses')
    if (saved) {
      setExpenses(JSON.parse(saved))
    } else {
      // Default mock data if empty
      setExpenses([
        {
          id: '1',
          name: 'Figma - Mensual',
          amount: 150,
          frequency: 'mensual',
          startDate: new Date(new Date().getFullYear(), 4, 15).toISOString() // May 15
        },
        {
          id: '2',
          name: 'Adobe - Anual',
          amount: 559,
          frequency: 'anual',
          startDate: new Date(new Date().getFullYear(), 5, 16).toISOString() // Jun 16
        }
      ])
    }
  }, [])

  const saveToStorage = (data: FixedExpense[]) => {
    setExpenses(data)
    localStorage.setItem('finza_fixed_expenses', JSON.stringify(data))
  }

  const openAddModal = () => {
    setEditingId(null)
    setNewName('')
    setNewAmount('')
    setNewFreq('mensual')
    setNewDate(new Date().toISOString().split('T')[0])
    setIsModalOpen(true)
  }

  const openEditModal = (expense: FixedExpense) => {
    setEditingId(expense.id)
    setNewName(expense.name)
    setNewAmount(expense.amount.toString())
    setNewFreq(expense.frequency)
    const dateStr = expense.startDate || (expense as any).createdAt || new Date().toISOString()
    setNewDate(dateStr.split('T')[0])
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (!newName || !newAmount || !newDate) return
    const val = Number(newAmount)
    if (isNaN(val) || val <= 0) return

    if (editingId) {
      // Update existing
      const updated = expenses.map(e => 
        e.id === editingId 
          ? { ...e, name: newName, amount: val, frequency: newFreq, startDate: new Date(newDate).toISOString() }
          : e
      )
      saveToStorage(updated)
    } else {
      // Create new
      const newExpense: FixedExpense = {
        id: crypto.randomUUID(),
        name: newName,
        amount: val,
        frequency: newFreq,
        startDate: new Date(newDate).toISOString()
      }
      saveToStorage([newExpense, ...expenses])
    }
    
    setIsModalOpen(false)
    setEditingId(null)
    setNewName('')
    setNewAmount('')
    setNewFreq('mensual')
    setNewDate('')
  }

  const handleDelete = (id: string) => {
    saveToStorage(expenses.filter(e => e.id !== id))
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
          ) : (
            expenses.map((expense) => {
              // Convert stored ISO string to local Date object correctly avoiding timezone shifts
              const dateStr = expense.startDate || (expense as any).createdAt || new Date().toISOString()
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

                  {/* Amount Block */}
                  <div className="px-4 py-2 rounded-xl border border-slate-100 text-sm font-bold text-[#1E293B]">
                    {formatSoles(expense.amount).replace('.00', '')}
                  </div>
                </div>
              )
            })
          )}
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
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[#0F172A] placeholder:text-[#94A3B8]"
              />
              <input 
                type="number"
                placeholder="Ingresa un monto"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[#0F172A] placeholder:text-[#94A3B8]"
              />
              <input 
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[#0F172A]"
              />
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

            <div className="flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-[#1E293B] font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-[#1D4ED8] text-white font-semibold hover:bg-blue-800 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
