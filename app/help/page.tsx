'use client'

import { Wallet, BarChart2, TrendingUp, Settings, Plus, Play } from 'lucide-react'

export default function HelpPage() {
  const sections = [
    {
      title: 'Registro de Movimientos',
      icon: <Wallet size={24} className="text-blue-600" />,
      color: 'bg-blue-50',
      description: 'Aquí puedes registrar tus ingresos y gastos diarios.',
      tips: [
        'Haz clic en el botón "+ Ingreso" o "+ Gasto" para registrar una nueva transacción.',
        'Asegúrate de seleccionar la categoría correcta para mantener tus finanzas organizadas.',
        'Usa el filtro por fechas si necesitas buscar un movimiento pasado.'
      ]
    },
    {
      title: 'Dashboard (Panel Principal)',
      icon: <BarChart2 size={24} className="text-teal-600" />,
      color: 'bg-teal-50',
      description: 'Tu centro de comando financiero general.',
      tips: [
        'La "Meta de Ahorro" es interactiva: haz clic en el ícono del lápiz para ajustarla.',
        'Añade "Próximos Gastos" fijos (ej. Netflix, Luz) para que la app te avise.',
        'Las gráficas muestran tus gastos contra tus ingresos. Fíjate qué día de la semana gastas más.'
      ]
    },
    {
      title: 'Proyecciones',
      icon: <TrendingUp size={24} className="text-yellow-600" />,
      color: 'bg-yellow-50',
      description: 'Tu analizador financiero automático y proyecciones futuras.',
      tips: [
        'El gráfico dibuja tu "abanico" de proyección en base a tu promedio histórico real.',
        'Revisa la sección "Explicación" todos los días: el sistema te advertirá si te excedes de tu presupuesto respecto a ayer.',
        'La sección "Recomendaciones" te sugerirá recortes porcentuales en la categoría donde estés quemando más dinero.'
      ]
    },
    {
      title: 'Configuración',
      icon: <Settings size={24} className="text-slate-600" />,
      color: 'bg-slate-50',
      description: 'Administración de tu perfil de usuario.',
      tips: [
        'Puedes cambiar tu Nombre y Apellido en cualquier momento.',
        'Para agregar una foto de perfil, simplemente copia la ruta de la imagen (URL) desde internet y pégala allí.'
      ]
    }
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] px-8 pt-7 pb-8">
      <div className="w-full max-w-4xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-[#0F172A] tracking-tight">
            Manual de Usuario
          </h1>
          <p className="text-gray-500 mt-1">
            Aprende a exprimir al máximo todas las funciones de Finza.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${section.color}`}>
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-800">{section.title}</h2>
                  <p className="text-slate-500 text-sm mb-4">{section.description}</p>
                  
                  <ul className="space-y-3">
                    {section.tips.map((tip, tipIdx) => (
                      <li key={tipIdx} className="flex gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <Play size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
