import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ML_API_URL = process.env.ML_API_URL

export async function POST() {
  if (!ML_API_URL) {
    return NextResponse.json({ error: 'ML service not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60_000)

    const response = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`ML service error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[ml/predict] Error:', error)
    return NextResponse.json({ error: 'ML service unavailable' }, { status: 503 })
  }
}
