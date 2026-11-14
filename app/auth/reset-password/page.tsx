'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthContainer } from '@/components/auth/auth-container'
import { AuthInput } from '@/components/auth/auth-input'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
      setChecking(false)
    })
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    await supabase.auth.signOut()
    window.location.replace('/auth/login?reset=1')
  }

  return (
    <AuthContainer title="Nueva contraseña">
      {checking ? (
        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#1D4ED8] animate-spin" />
        </div>
      ) : !hasSession ? (
        <>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            El enlace expiró o no es válido.
          </div>
          <Link href="/auth/forgot-password" className="text-center text-[#5C8AEC] font-bold underline underline-offset-2 hover:text-[#38508B] transition-colors">
            Solicitar un nuevo enlace
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showPasswordToggle
            showPassword={show}
            onPasswordToggle={() => setShow(!show)}
            required
            disabled={loading}
          />
          <AuthInput
            type="password"
            placeholder="Confirma tu contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            showPasswordToggle
            showPassword={show}
            onPasswordToggle={() => setShow(!show)}
            required
            disabled={loading}
          />
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0B1C3F] text-white py-[16px] rounded-[24px] text-[16px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(11,28,63,0.12)]"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      )}
    </AuthContainer>
  )
}
