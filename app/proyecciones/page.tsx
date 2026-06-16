'use client'

import { useEffect, useState, useCallback } from 'react'
import { PredictionSection } from '@/components/proyecciones/prediction-section'
import { RisksSection } from '@/components/proyecciones/risks-section'
import { RecommendationsSection } from '@/components/proyecciones/recommendations-section'

interface CategoryPrediction {
  category: string
  amount: number
  type: 'fixed' | 'variable'
}

interface PredictionData {
  total: number
  by_category: CategoryPrediction[]
}

interface Risk {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
}

interface Alert {
  priority: number
  message: string
  triggered_by: string
}

interface Tip {
  category: string
  suggestion: string
  potential_saving: number
}

interface MLResponse {
  mode: 'ml' | 'heuristic'
  generated_at: string
  prediction: {
    next_7_days: PredictionData
    next_30_days: PredictionData
  }
  risks: Risk[]
  recommendations: {
    alerts: Alert[]
    tips: Tip[]
  }
}

const EMPTY_PREDICTION: PredictionData = { total: 0, by_category: [] }
const EMPTY_ML: MLResponse = {
  mode: 'heuristic',
  generated_at: '',
  prediction: { next_7_days: EMPTY_PREDICTION, next_30_days: EMPTY_PREDICTION },
  risks: [],
  recommendations: { alerts: [], tips: [] },
}

export default function ProyeccionesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [data, setData] = useState<MLResponse>(EMPTY_ML)

  const fetchML = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await fetch('/api/ml/predict', { method: 'POST' })
      if (!res.ok) throw new Error('ML unavailable')
      const json: MLResponse = await res.json()
      setData(json)
    } catch {
      setError(true)
      setData(EMPTY_ML)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchML()
  }, [fetchML])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#1D4ED8] animate-spin" />
        <p className="text-sm text-slate-500">Analizando tus patrones financieros...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] px-8 pt-7 pb-8">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-[#0F172A] tracking-tight">
            Proyecciones
          </h1>
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                Servicio ML no disponible — mostrando análisis básico
              </span>
            )}
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: data.mode === 'ml' ? '#EFF6FF' : '#F1F5F9',
                color: data.mode === 'ml' ? '#1D4ED8' : '#64748B',
              }}
            >
              {data.mode === 'ml' ? 'ML Activo' : 'Análisis Básico'}
            </span>
          </div>
        </div>
        <div className="flex gap-6 border-b border-gray-200 mt-4">
          <button className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-3 px-1">
            Mis gastos
          </button>
        </div>
      </div>

      {/* 3-column grid on large screens, stacked on small */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Predicción — left, wider */}
        <div className="lg:col-span-5">
          <PredictionSection
            next7Days={data.prediction.next_7_days}
            next30Days={data.prediction.next_30_days}
            mode={data.mode}
          />
        </div>

        {/* Riesgos — center */}
        <div className="lg:col-span-4">
          <RisksSection risks={data.risks} />
        </div>

        {/* Recomendaciones — right */}
        <div className="lg:col-span-3">
          <RecommendationsSection
            alerts={data.recommendations.alerts}
            tips={data.recommendations.tips}
          />
        </div>

      </div>
    </div>
  )
}
