import { Sidebar } from '@/components/sidebar'

export const dynamic = 'force-dynamic'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
