'use client'

import { useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'

interface DeleteConfirmModalProps {
  onConfirm: () => void
  onCancel: () => void
  isCuotaSeries?: boolean
}

export function DeleteConfirmModal({ onConfirm, onCancel, isCuotaSeries }: DeleteConfirmModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(2px)' }}
      onClick={onCancel}
    >
      {/* Modal card */}
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full"
        style={{ maxWidth: 380, padding: '24px 24px 20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 flex items-center justify-center rounded-full transition hover:bg-gray-100"
          style={{ width: 28, height: 28 }}
        >
          <X className="w-4 h-4" style={{ color: '#94A3B8' }} />
        </button>

        {/* Header: icon + title */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 44, height: 44, background: '#FEF2F2' }}
          >
            <Trash2 className="w-5 h-5" style={{ color: '#EF4444' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>
              ¿Desea eliminar el movimiento?
            </h2>
            {isCuotaSeries && (
              <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                Esto eliminará todas las cuotas del plan.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-xl text-sm font-semibold border transition hover:bg-gray-50"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: '#EF4444' }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
