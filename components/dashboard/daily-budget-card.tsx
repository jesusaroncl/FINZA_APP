'use client'

import { useState } from 'react'
import { Pencil, X, Check } from 'lucide-react'
import { formatSoles } from '@/lib/utils-currency'

interface DailyBudgetCardProps {
  budget: number
  onSave: (value: number) => void
}

export function DailyBudgetCard({ budget, onSave }: DailyBudgetCardProps) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')

  const handleConfirm = () => {
    const val = Number(input)
    if (!isNaN(val) && val > 0) onSave(val)
    setEditing(false)
    setInput('')
  }

  return (
    <div className="bg-white rounded-3xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50 flex items-center gap-3 flex-1 min-w-0">
      <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-[#3B82F6]" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">Presupuesto Diario</p>

        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-[#94A3B8]">S/</span>
            <input
              autoFocus
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') { setEditing(false); setInput('') } }}
              className="w-24 text-xl font-bold text-[#0F172A] border-b-2 border-[#3B82F6] outline-none bg-transparent"
              placeholder="0"
            />
            <button onClick={handleConfirm} className="text-[#3B82F6] hover:text-blue-700 transition-colors">
              <Check size={16} strokeWidth={2.5} />
            </button>
            <button onClick={() => { setEditing(false); setInput('') }} className="text-[#94A3B8] hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-[#0F172A] truncate">{formatSoles(budget)}</p>
            <button onClick={() => { setInput(String(budget)); setEditing(true) }} className="text-[#94A3B8] hover:text-[#1E293B] transition-colors mt-0.5">
              <Pencil size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
