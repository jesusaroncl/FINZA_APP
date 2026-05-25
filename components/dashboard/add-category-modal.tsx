'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { 
  Home, CreditCard, Car, ShoppingBag, Gamepad2, Zap, HeartPulse, GraduationCap,
  Briefcase, Coffee, Plane, Utensils, Monitor, Smartphone, Gift, MoreHorizontal,
  Music, Dog, BookOpen, Wrench, Scissors, Camera, Ticket, Clapperboard, Shirt,
  Dumbbell, Droplet, Flame, Leaf, Baby, Pill, Stethoscope, Bus, Train, Ship,
  Building, Trees, Smile, Star, Wifi, Tv, Sofa, Paintbrush, Trophy
} from 'lucide-react'

interface AddCategoryModalProps {
  onClose: () => void
  onSuccess: () => void
}

const PRESET_COLORS = [
  '#AA96DA', '#F38181', '#4ECDC4', '#FFB067', '#3B82F6', '#9CA3AF',
  '#F87171', '#FBBF24', '#34D399', '#A78BFA', '#F472B6', '#60A5FA'
]

const AVAILABLE_ICONS = [
  { id: 'home', icon: Home }, { id: 'credit-card', icon: CreditCard }, { id: 'car', icon: Car },
  { id: 'shopping-bag', icon: ShoppingBag }, { id: 'gamepad', icon: Gamepad2 }, { id: 'zap', icon: Zap },
  { id: 'heart-pulse', icon: HeartPulse }, { id: 'graduation-cap', icon: GraduationCap },
  { id: 'briefcase', icon: Briefcase }, { id: 'coffee', icon: Coffee }, { id: 'plane', icon: Plane },
  { id: 'utensils', icon: Utensils }, { id: 'monitor', icon: Monitor }, { id: 'smartphone', icon: Smartphone },
  { id: 'gift', icon: Gift }, { id: 'music', icon: Music }, { id: 'dog', icon: Dog },
  { id: 'book-open', icon: BookOpen }, { id: 'wrench', icon: Wrench }, { id: 'scissors', icon: Scissors },
  { id: 'camera', icon: Camera }, { id: 'ticket', icon: Ticket }, { id: 'clapperboard', icon: Clapperboard },
  { id: 'shirt', icon: Shirt }, { id: 'dumbbell', icon: Dumbbell }, { id: 'droplet', icon: Droplet },
  { id: 'flame', icon: Flame }, { id: 'leaf', icon: Leaf }, { id: 'baby', icon: Baby },
  { id: 'pill', icon: Pill }, { id: 'stethoscope', icon: Stethoscope }, { id: 'bus', icon: Bus },
  { id: 'train', icon: Train }, { id: 'ship', icon: Ship }, { id: 'building', icon: Building },
  { id: 'trees', icon: Trees }, { id: 'smile', icon: Smile }, { id: 'star', icon: Star },
  { id: 'wifi', icon: Wifi }, { id: 'tv', icon: Tv }, { id: 'sofa', icon: Sofa },
  { id: 'paintbrush', icon: Paintbrush }, { id: 'trophy', icon: Trophy }, { id: 'more-horizontal', icon: MoreHorizontal },
]

export function AddCategoryModal({ onClose, onSuccess }: AddCategoryModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0].id)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('categories').insert({
        user_id: user.id,
        name: name.trim(),
        type: 'expense', // Se asume Gasto por defecto
        color,
        icon: selectedIcon
      })

      onSuccess()
    } catch (error) {
      console.error('Error adding category:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Añadir Categoría</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nombre de la categoría
            </label>
            <input
              type="text"
              placeholder="Ej: Suscripciones"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Ícono
            </label>
            <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1 scrollbar-clean">
              {AVAILABLE_ICONS.map((item) => {
                const IconComp = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                      selectedIcon === item.id ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <IconComp size={20} />
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition mt-2"
          >
            {saving ? 'Guardando...' : 'Guardar Categoría'}
          </button>
        </form>
      </div>
    </div>
  )
}
