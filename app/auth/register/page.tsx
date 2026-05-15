'use client'

import { AuthContainer } from '@/components/auth/auth-container'
import { RegisterForm } from '@/components/auth/register-form'

export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return (
    <AuthContainer title="Regístrate">
      <RegisterForm />
    </AuthContainer>
  )
}
