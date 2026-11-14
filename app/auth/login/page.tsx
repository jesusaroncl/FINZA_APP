'use client'

import { Suspense } from 'react'
import { AuthContainer } from '@/components/auth/auth-container'
import { LoginForm } from '@/components/auth/login-form'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <AuthContainer title="Iniciar Sesión">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthContainer>
  )
}
