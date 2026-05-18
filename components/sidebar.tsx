'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Wallet, BarChart3, TrendingUp, Settings, HelpCircle } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navItems = [
    { icon: Wallet, label: 'Movimientos', href: '/movimientos' },
    { icon: BarChart3, label: 'Dashboard', href: '/dashboard' },
    { icon: TrendingUp, label: 'Proyección', href: '/proyeccion' },
  ]

  const bottomItems = [
    { icon: Settings, label: 'Configuración', href: '/settings' },
    { icon: HelpCircle, label: 'Manual', href: '/help' },
  ]

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Finza Logo"
            width={40}
            height={40}
            className="rounded-lg"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Items */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm ${
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-700 transition text-sm font-medium"
        >
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  )
}
