'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-600 to-teal-700 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="text-4xl font-bold mb-4">Finza</div>
        <p className="text-lg">Cargando...</p>
      </div>
    </div>
  )
}
