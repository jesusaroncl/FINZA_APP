'use client'

import { formatSoles } from '@/lib/utils-currency'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { 
  Home, CreditCard, Car, ShoppingBag, Gamepad2, MoreHorizontal, Zap, HeartPulse, GraduationCap,
  Briefcase, Coffee, Plane, Utensils, Monitor, Smartphone, Gift, Music, Dog, BookOpen, Wrench,
  Scissors, Camera, Ticket, Clapperboard, Shirt, Dumbbell, Droplet, Flame, Leaf, Baby, Pill,
  Stethoscope, Bus, Train, Ship, Building, Trees, Smile, Star, Wifi, Tv, Sofa, Paintbrush, Trophy
} from 'lucide-react'
import { useState } from 'react'
import { AddCategoryModal } from './add-category-modal'

interface CategoryStat {
  name: string
  value: number
  color?: string
  icon?: string
}

interface ExpenseStatsProps {
  data: CategoryStat[]
  onCategoryAdded?: () => void
}

const COLORS = [
  '#AA96DA', '#F38181', '#4ECDC4', '#FFB067', '#3B82F6', '#9CA3AF'
]

const ICON_MAP: Record<string, any> = {
  'home': Home, 'credit-card': CreditCard, 'car': Car, 'shopping-bag': ShoppingBag,
  'gamepad': Gamepad2, 'zap': Zap, 'heart-pulse': HeartPulse, 'graduation-cap': GraduationCap,
  'briefcase': Briefcase, 'coffee': Coffee, 'plane': Plane, 'utensils': Utensils,
  'monitor': Monitor, 'smartphone': Smartphone, 'gift': Gift, 'more-horizontal': MoreHorizontal,
  'music': Music, 'dog': Dog, 'book-open': BookOpen, 'wrench': Wrench, 'scissors': Scissors,
  'camera': Camera, 'ticket': Ticket, 'clapperboard': Clapperboard, 'shirt': Shirt,
  'dumbbell': Dumbbell, 'droplet': Droplet, 'flame': Flame, 'leaf': Leaf, 'baby': Baby,
  'pill': Pill, 'stethoscope': Stethoscope, 'bus': Bus, 'train': Train, 'ship': Ship,
  'building': Building, 'trees': Trees, 'smile': Smile, 'star': Star, 'wifi': Wifi,
  'tv': Tv, 'sofa': Sofa, 'paintbrush': Paintbrush, 'trophy': Trophy
}

// Icon mapping based on mockup
const getCategoryIcon = (name: string, color: string, iconName?: string) => {
  const iconProps = { size: 16, className: "text-white" }
  let Icon = MoreHorizontal

  if (iconName && ICON_MAP[iconName]) {
    Icon = ICON_MAP[iconName]
  } else {
    const lower = name.toLowerCase()
    if (lower.includes('house') || lower.includes('casa') || lower.includes('hogar')) Icon = Home
    else if (lower.includes('credit') || lower.includes('tarjeta') || lower.includes('deudas')) Icon = CreditCard
    else if (lower.includes('transport') || lower.includes('transporte')) Icon = Car
    else if (lower.includes('groceries') || lower.includes('comida') || lower.includes('supermercado') || lower.includes('alimentación') || lower.includes('alimentacion')) Icon = ShoppingBag
    else if (lower.includes('entertainment') || lower.includes('entretenimiento')) Icon = Gamepad2
    else if (lower.includes('shopping') || lower.includes('compras')) Icon = ShoppingBag
    else if (lower.includes('servicios básicos') || lower.includes('servicios basicos')) Icon = Zap
    else if (lower.includes('salud')) Icon = HeartPulse
    else if (lower.includes('educación') || lower.includes('educacion')) Icon = GraduationCap
  }

  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
      <Icon {...iconProps} />
    </div>
  )
}

export function ExpenseStats({ data, onCategoryAdded }: ExpenseStatsProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const total = data.reduce((acc, curr) => acc + curr.value, 0)
  
  // Sort data descending to find the largest for the center
  const sortedData = [...data].sort((a, b) => b.value - a.value)
  const largest = sortedData[0]
  const largestPercentage = largest && total > 0 ? ((largest.value / total) * 100).toFixed(0) : '0'

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50 relative">

      {data.length > 0 ? (
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Donut Chart */}
          <div className="w-full lg:w-1/2 h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sortedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={true}
                  animationBegin={200}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-[#1E293B]">{largestPercentage}%</span>
              <span className="text-xs font-medium text-[#64748B] text-center px-4 max-w-[120px] truncate">
                {largest?.name || ''}
              </span>
            </div>
          </div>

          {/* Custom Legend / List */}
          <div className="w-full lg:w-1/2 flex flex-col">
            
            <div className="flex justify-end mb-2 pr-2">
               <button 
                 onClick={() => setShowAddModal(true)}
                 className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition shadow-sm"
                 title="Añadir Categoría"
               >
                 <span className="text-xl font-light leading-none mb-0.5">+</span>
               </button>
            </div>

            <div className="flex flex-col gap-0 max-h-[350px] overflow-y-auto pr-2 scrollbar-clean">
              {sortedData.map((item, index) => {
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(2) : '0.00'
                const color = item.color || COLORS[index % COLORS.length]
                
                return (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-4">
                      {getCategoryIcon(item.name, color, item.icon)}
                      <span className="text-[15px] font-medium text-[#1E293B]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[15px]">
                      <span className="text-[#64748B] font-medium">{formatSoles(item.value)}</span>
                      <span className="text-[#64748B] font-medium w-14 text-right">{percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">Sin datos de gastos disponibles</p>
      )}

      {showAddModal && (
        <AddCategoryModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            onCategoryAdded?.()
          }}
        />
      )}
    </div>
  )
}
