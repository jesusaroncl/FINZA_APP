'use client'

export interface ExplicacionItem {
  id: number
  iconType: number
  bgColor: string
  textColor: string
  title: string
  date: string
}

interface ExplicacionListProps {
  explicaciones: ExplicacionItem[]
}

export function ExplicacionList({ explicaciones }: ExplicacionListProps) {
  return (
    <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-50 flex flex-col h-full min-h-[300px]">
      <h3 className="text-[17px] font-bold text-gray-900 mb-6">Explicación</h3>
      
      <div className="flex flex-col gap-6">
        {explicaciones.map((exp) => (
          <div key={exp.id} className="flex items-start gap-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{ background: exp.bgColor, color: exp.textColor }}
            >
              {exp.iconType}
            </div>
            
            <div className="flex-1 min-w-0 pt-0.5 border-b border-gray-50 pb-5">
              <p className="text-[15px] font-bold text-gray-700 leading-snug pr-4">
                {exp.title}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {exp.date}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
