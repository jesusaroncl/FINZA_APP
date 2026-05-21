'use client'

type TabType = 'all' | 'income' | 'expense'

interface TransactionTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function TransactionTabs({
  activeTab,
  onTabChange,
}: TransactionTabsProps) {
  const tabs = [
    { id: 'all' as const, label: 'Todas mis Transacciones' },
    { id: 'income' as const, label: 'Ingresos' },
    { id: 'expense' as const, label: 'Gastos' },
  ]

  return (
    <div className="flex space-x-8 border-b border-gray-200 mb-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="pb-3 text-sm font-medium transition-colors relative whitespace-nowrap"
          style={{
            color: activeTab === tab.id ? '#3B82F6' : '#94A3B8',
            borderBottom: activeTab === tab.id ? '2px solid #3B82F6' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
