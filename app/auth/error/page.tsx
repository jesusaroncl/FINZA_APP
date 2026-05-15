'use client'

import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-600 to-teal-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="bg-slate-900 text-white rounded-xl px-4 py-2 font-bold text-lg">
            Finza
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="text-4xl mb-4">⚠️</div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Error de Autenticación
          </h1>

          <p className="text-gray-600 mb-8">
            Ha ocurrido un error durante el proceso de autenticación. Por favor, intenta de nuevo.
          </p>

          <Link
            href="/auth/login"
            className="w-full block bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition"
          >
            Volver al Login
          </Link>
        </div>
      </div>
    </div>
  )
}
