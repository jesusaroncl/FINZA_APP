'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { forceSignOut } from '@/lib/supabase/sign-out'
import {
  Wallet,
  BarChart2,
  TrendingUp,
  Settings,
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.replace('/auth/login')
    })
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', onPageShow)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.replace('/auth/login')
    })
    return () => {
      data.subscription.unsubscribe()
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  const handleLogout = async () => {
    await forceSignOut(supabase)
    window.location.replace('/auth/login')
  }

  const navItems = [
    { icon: Wallet, label: 'Movimientos', href: '/movimientos' },
    { icon: BarChart2, label: 'Dashboard', href: '/dashboard' },
    { icon: TrendingUp, label: 'Proyecciones', href: '/proyecciones' },
  ]

  const bottomItems = [
    { icon: Settings, label: 'Configuración', href: '/settings' },
  ]

  return (
    <div
      className="flex flex-col h-screen bg-white border-r border-gray-100"
      style={{ width: '200px', minWidth: '200px' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center py-8 px-4">
        <Link href="/movimientos" className="block">
          <Image
            src="/logo.png"
            alt="Finza Logo"
            width={72}
            height={72}
            className="rounded-2xl"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 pt-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
              style={{
                color: isActive ? '#111827' : '#9CA3AF',
                fontWeight: isActive ? '600' : '400',
                background: isActive ? '#F3F4F6' : 'transparent',
              }}
            >
              {/* Active left indicator */}
              {isActive && (
                <span
                  className="absolute left-0 h-8 w-[3px] rounded-r-full"
                  style={{ background: '#111827' }}
                  aria-hidden="true"
                />
              )}
              <Icon
                size={20}
                strokeWidth={isActive ? 2 : 1.5}
                style={{ color: isActive ? '#111827' : '#9CA3AF', flexShrink: 0 }}
              />
              <span className="text-sm tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Items */}
      <div className="px-3 pb-6 space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
              style={{
                color: isActive ? '#111827' : '#9CA3AF',
                fontWeight: isActive ? '600' : '400',
                background: isActive ? '#F3F4F6' : 'transparent',
              }}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                style={{ color: isActive ? '#111827' : '#9CA3AF', flexShrink: 0 }}
              />
              <span className="text-sm tracking-wide">{item.label}</span>
            </Link>
          )
        })}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 mt-4 text-[#EF4444] hover:bg-red-50 hover:text-red-600"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px] text-current" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm tracking-wide font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  )
}
