'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Category {
  id: string
  name: string
  color: string
}

interface AddIncomeModalProps {
  onClose: () => void
  onAdd: (data: any) => void
  categories: Category[]
}

export function AddIncomeModal({
  onClose,
  onAdd,
  categories,
}: AddIncomeModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({
      description,
      amount,
      category_id: categoryId,
      date,
      type: 'income',
    })
    setDescription('')
    setAmount('')
    setCategoryId(categories[0]?.id || '')
    setDate(new Date().toISOString().split('T')[0])
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Añadir Ingreso</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <input
            type="number"
            placeholder="Monto"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
