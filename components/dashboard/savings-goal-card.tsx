'use client'

import { useState } from 'react'
import { formatSoles } from '@/lib/utils-currency'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Trophy, Target, Pencil, X } from 'lucide-react'

interface SavingsGoalCardProps {
  target: number
  achieved: number
  monthAchieved: number
  onSave?: (newTarget: number) => void
}


export function SavingsGoalCard({ target, achieved, monthAchieved, onSave }: SavingsGoalCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tempTarget, setTempTarget] = useState(target.toString())
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)

  // Cap achieved at target for the chart visually
  const chartAchieved = Math.min(achieved, target)
  const remaining = Math.max(0, target - achieved)

  const data = [
    { name: 'Achieved', value: chartAchieved },
    { name: 'Remaining', value: remaining },
  ]

  const handleSave = () => {
    const val = Number(tempTarget)
    if (!isNaN(val) && val > 0 && onSave) {
      onSave(val)
      setIsModalOpen(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50">
        
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[#94A3B8]">Meta de Ahorro Anual</span>
            <button
              onClick={() => { setTempTarget(target.toString()); setIsModalOpen(true); }}
              className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <Pencil size={10} />
            </button>
          </div>
          <span className="text-2xl font-bold text-[#0F172A]">{formatSoles(target)}</span>
        </div>

        <div className="flex gap-4">
          {/* Stats Column */}
          <div className="flex flex-col gap-4 w-1/2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={14} className="text-[#94A3B8]" />
                <span className="text-xs font-medium text-[#94A3B8]">Logrado</span>
              </div>
              <span className="text-lg font-bold text-[#0F172A]">{formatSoles(achieved)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target size={14} className="text-[#94A3B8]" />
                <span className="text-xs font-medium text-[#94A3B8]">Logro del mes</span>
              </div>
              <span className="text-lg font-bold text-[#0F172A]">{formatSoles(monthAchieved)}</span>
            </div>
          </div>

          {/* Gauge Chart Column */}
          <div className="w-1/2 flex flex-col items-center">
            <div
              className="h-[100px] w-full relative"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {tooltip && (
                <div
                  className="absolute z-10 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-md text-xs font-semibold text-[#0F172A] pointer-events-none whitespace-nowrap"
                  style={{ left: tooltip.x, top: tooltip.y - 36, transform: 'translateX(-50%)' }}
                >
                  {formatSoles(achieved)}
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={65}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={10}
                    isAnimationActive={true}
                    animationBegin={200}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    <Cell fill="#4ECDC4" />
                    <Cell fill="#F1F5F9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Needle approximation */}
              <div className="absolute bottom-0 left-1/2 w-0.5 h-[65px] bg-slate-700 origin-bottom" style={{
                transform: `rotate(${-90 + (target > 0 ? (chartAchieved / target) : 0) * 180}deg)`,
                marginLeft: '-1px'
              }}>
                <div className="w-2 h-2 rounded-full bg-slate-700 absolute -top-1 -left-[3px]"></div>
              </div>
            </div>

            <div className="flex justify-between w-full px-2 mt-2 text-xs font-medium text-[#94A3B8]">
              <span>S/ 0</span>
              <span>{formatSoles(target).replace('.00', '')}</span>
            </div>
            <span className="text-xs font-semibold text-[#0F172A] mt-2 text-center">
              Logro vs Meta
            </span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-[320px] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X size={14} />
            </button>
            
            <h2 className="text-xl font-bold text-center text-[#0F172A] mb-6 mt-2">Nueva meta de Ahorro</h2>
            
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
              <input 
                type="number"
                value={tempTarget}
                onChange={(e) => setTempTarget(e.target.value)}
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[#0F172A] font-medium"
              />
            </div>

            <button 
              onClick={handleSave}
              className="w-full py-3.5 rounded-xl bg-black text-white font-medium hover:bg-slate-900 transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
