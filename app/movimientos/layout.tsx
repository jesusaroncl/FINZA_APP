import { Sidebar } from '@/components/sidebar'

export const dynamic = 'force-dynamic'

export default function MovimientosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50" style={{ overflow: 'hidden' }}>
      <Sidebar />
      <div className="flex-1 overflow-hidden min-w-0">
        {children}
      </div>
    </div>
  )
}
