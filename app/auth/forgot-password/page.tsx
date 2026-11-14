'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthContainer } from '@/components/auth/auth-container'
import { AuthInput } from '@/components/auth/auth-input'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSent(false)
    setLoading(true)
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      if (error) {
        if (error.status === 429) {
          setError('Demasiados intentos. Espera un momento e inténtalo de nuevo.')
        } else {
          console.error('Error enviando correo de recuperación:', error)
          setError('No pudimos enviar el correo. Intenta de nuevo más tarde.')
        }
        return
      }
      setSent(true)
    } catch (error) {
      console.error('Error enviando correo de recuperación:', error)
      setError('No pudimos enviar el correo. Intenta de nuevo más tarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContainer title="Recuperar contraseña">
      <p className="text-center text-[13px] text-[#6B7280] mb-4">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          type="email"
          placeholder="ejemplo@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        {sent && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0B1C3F] text-white py-[16px] rounded-[24px] text-[16px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(11,28,63,0.12)]"
        >
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>
      <p className="text-center text-[13px] text-[#6B7280] mt-6">
        <Link href="/auth/login" className="text-[#5C8AEC] font-bold underline underline-offset-2 hover:text-[#38508B] transition-colors">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthContainer>
  )
}
