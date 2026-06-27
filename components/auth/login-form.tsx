'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthInput } from './auth-input'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(
          signInError.message === 'Invalid login credentials'
            ? 'Email o contraseña incorrectos'
            : signInError.message
        )
        return
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Error al iniciar sesión. Intenta de nuevo.')
      console.error('[v0] Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Inputs */}
      <div className="space-y-3">
        <AuthInput
          type="email"
          placeholder="ejemplo@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        <AuthInput
          type="password"
          placeholder="*******"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showPasswordToggle
          showPassword={showPassword}
          onPasswordToggle={() => setShowPassword(!showPassword)}
          required
          disabled={loading}
        />
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center justify-center mt-4 mb-5">
        <input
          type="checkbox"
          id="rememberMe"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="w-[15px] h-[15px] border-[#9CA3AF] rounded-[3px] focus:ring-[#587FD9] text-[#587FD9] cursor-pointer bg-transparent"
          disabled={loading}
        />
        <label
          htmlFor="rememberMe"
          className="ml-2 text-[13px] text-[#6B7280] cursor-pointer select-none font-normal"
        >
          Recordar datos de usuario
        </label>
      </div>

      {/* Forgot Password Link */}
      <div className="text-center mb-6">
        <Link
          href="/auth/forgot-password"
          className="text-[14px] text-[#5C8AEC] transition-colors font-semibold hover:text-[#38508B]"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Login Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0B1C3F] text-white py-[16px] rounded-[24px] text-[16px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(11,28,63,0.12)]"
      >
        {loading ? 'Iniciando sesión...' : 'Ingresar'}
      </button>

      {/* Register Link */}
      <p className="text-center text-[13px] text-[#6B7280] mt-6">
        ¿Aún no tienes tu cuenta?{' '}
        <Link
          href="/auth/register"
          className="text-[#5C8AEC] font-bold underline underline-offset-2 hover:text-[#38508B] transition-colors"
        >
          Regístrate
        </Link>
      </p>
    </form>
  )
}
