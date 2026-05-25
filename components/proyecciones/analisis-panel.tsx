'use client'

import { formatSoles } from '@/lib/utils-currency'

interface AnalisisPanelProps {
  todayExpense: number
  mostSpentCategory: string
  diffPercentage: number // e.g. 15 for 15%
  isPositive: boolean // if true -> arrow points down (good, less spent)
}

export function AnalisisPanel({ todayExpense, mostSpentCategory, diffPercentage, isPositive }: AnalisisPanelProps) {
  return (
    <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-50 flex flex-col h-full min-h-[300px]">
      <h3 className="text-[17px] font-bold text-gray-900 mb-6">Análisis</h3>
      
      <p className="text-[13px] font-medium text-gray-800 leading-relaxed mb-8 pr-4">
        Tienes un saldo {isPositive ? 'positivo' : 'negativo'}; tu mayor gasto ha sido '{mostSpentCategory}'.
      </p>

      <div className="mt-auto">
        <h4 className="text-base font-bold text-gray-900 mb-4">Recomendación</h4>
        
        <div className="flex flex-col gap-2 mb-6 text-sm font-semibold text-gray-800">
          <div className="flex justify-between items-center rounded-sm">
            <span className="bg-[#D9F920] px-3 py-1.5 w-1/2 rounded-sm mr-2">Gasto Total Hoy</span>
            <span className="bg-[#EAECCA] px-3 py-1.5 w-1/2 text-right rounded-sm">{formatSoles(todayExpense)}</span>
          </div>
          
          <div className="flex justify-between items-center rounded-sm">
            <span className="bg-[#C8F920] px-3 py-1.5 w-1/2 rounded-sm mr-2">Categoría Mayor</span>
            <span className="bg-[#EAECCA] px-3 py-1.5 w-1/2 text-right rounded-sm truncate" title={mostSpentCategory}>{mostSpentCategory}</span>
          </div>
          
          <div className="flex justify-between items-center rounded-sm">
            <span className="bg-[#C8F920] px-3 py-1.5 w-1/2 rounded-sm mr-2">vs. Ayer</span>
            <div className="bg-[#EAECCA] px-3 py-1.5 w-1/2 text-right rounded-sm flex items-center justify-end gap-1">
              <span>{diffPercentage.toFixed(1)}%</span>
              <div 
                className={`w-3 h-3 flex items-center justify-center ${isPositive ? 'bg-green-500' : 'bg-red-600 rotate-180'}`}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5 text-white" stroke="currentColor" strokeWidth="3">
                  <path d="M12 4v16M5 11l7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-6 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors rounded-3xl text-sm font-semibold text-gray-600">
            Cancelar
          </button>
          <button className="px-6 py-2.5 bg-[#D9F920] hover:bg-[#c9e61c] transition-colors rounded-3xl text-sm font-semibold text-gray-900 shadow-sm">
            Tomar consejo
          </button>
        </div>
      </div>
    </div>
  )
}
