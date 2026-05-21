import { formatSoles } from '@/lib/utils-currency'

interface TotalSavingCardProps {
  savings: number
}

export function TotalSavingCard({ savings }: TotalSavingCardProps) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50/50 flex items-center gap-5 w-fit min-w-[260px]">
      <div className="w-14 h-14 rounded-full bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
        {/* Piggy bank icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-6 h-6 text-[#10B981]"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">Ahorro Total</p>
        <p className="text-2xl font-bold text-[#0F172A]">{formatSoles(savings)}</p>
      </div>
    </div>
  )
}
