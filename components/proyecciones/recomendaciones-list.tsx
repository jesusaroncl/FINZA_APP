'use client'

export interface RecomendacionItem {
  id: number
  title: string
  date: string
  amount: number
}

interface RecomendacionesListProps {
  recommendations: RecomendacionItem[]
}

export function RecomendacionesList({ recommendations }: RecomendacionesListProps) {
  return (
    <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-50 flex flex-col h-full min-h-[400px]">
      <h3 className="text-[17px] font-bold text-gray-900 mb-6">Recomendaciones</h3>
      
      <div className="flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-clean">
        {recommendations.length === 0 ? (
          <p className="text-sm text-gray-400">No hay recomendaciones en este momento.</p>
        ) : (
          recommendations.map((rec, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0 pb-4 last:pb-2">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-500">
                {i + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{rec.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{rec.date}</p>
              </div>
              
              <div className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-800">
                ${rec.amount}
              </div>
              
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 transition-colors rounded-lg text-xs font-semibold text-gray-600 whitespace-nowrap">
                Ver recomendación
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
