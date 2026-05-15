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
    <div className="flex space-x-8 border-b border-gray-200 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`pb-4 font-medium text-sm transition-colors ${
            activeTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
