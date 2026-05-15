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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email Input */}
      <AuthInput
        type="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
      />

      {/* Password Input */}
      <AuthInput
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        showPasswordToggle
        showPassword={showPassword}
        onPasswordToggle={() => setShowPassword(!showPassword)}
        required
        disabled={loading}
      />

      {/* Remember Me Checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="rememberMe"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          disabled={loading}
        />
        <label
          htmlFor="rememberMe"
          className="ml-2 text-sm text-gray-700 cursor-pointer"
        >
          Recordar datos de usuario
        </label>
      </div>

      {/* Forgot Password Link */}
      <div className="text-center">
        <Link
          href="/auth/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Login Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
      >
        {loading ? 'Iniciando sesión...' : 'Ingresar'}
      </button>

      {/* Register Link */}
      <p className="text-center text-sm text-gray-600 mt-6">
        ¿Aún no tienes tu cuenta?{' '}
        <Link
          href="/auth/register"
          className="text-blue-600 font-medium hover:text-blue-700"
        >
          Regístrate
        </Link>
      </p>
    </form>
  )
}
