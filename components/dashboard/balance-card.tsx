import { formatSoles } from '@/lib/utils-currency'

interface BalanceCardProps {
  balance: number
}

export function BalanceCard({ balance }: BalanceCardProps) {
  return (
    <div className="bg-white rounded-3xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50 flex items-center gap-3 flex-1 min-w-0">
      <div className="w-10 h-10 rounded-full bg-[#FFFBEB] flex items-center justify-center flex-shrink-0">
        {/* Money bag / Coin icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-6 h-6 text-[#F59E0B]"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">Mi Balance</p>
        <p className="text-lg font-bold text-[#0F172A] truncate">{formatSoles(balance)}</p>
      </div>
    </div>
  )
}
