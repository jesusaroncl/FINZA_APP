'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthInput } from './auth-input'

interface RegisterFormProps {
  onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      setError('El nombre es requerido')
      return false
    }
    if (!lastName.trim()) {
      setError('El apellido es requerido')
      return false
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Email inválido')
      return false
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      })

      if (signUpError) {
        setError(
          signUpError.message === 'User already registered'
            ? 'Este email ya está registrado'
            : signUpError.message
        )
        return
      }

      // Si el registro fue exitoso y tenemos un usuario, insertamos en profiles
      if (data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
          })

        if (profileError) {
          console.error('Error insertando profile:', profileError)
          // No bloqueamos el flujo si falla el perfil, pero se loggea.
        }
      }

      if (onSuccess) {
        onSuccess()
      } else {
        // Redirigir directamente al dashboard
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Error al registrarse. Intenta de nuevo.')
      console.error('[v0] Register error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* First Name & Last Name */}
      <div className="grid grid-cols-2 gap-3">
        <AuthInput
          type="text"
          placeholder="Nombre"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          disabled={loading}
        />
        <AuthInput
          type="text"
          placeholder="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          disabled={loading}
        />
      </div>

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

      {/* Confirm Password Input */}
      <AuthInput
        type="password"
        placeholder="Confirma tu contraseña"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        showPasswordToggle
        showPassword={showConfirmPassword}
        onPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
        required
        disabled={loading}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Register Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
      >
        {loading ? 'Registrando...' : 'Regístrate'}
      </button>

      {/* Login Link */}
      <p className="text-center text-sm text-gray-600 mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/auth/login"
          className="text-blue-600 font-medium hover:text-blue-700"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}
