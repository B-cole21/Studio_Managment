import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export interface StatCardProps {
  label: string
  value: string
  delta?: { value: string; positive: boolean }
  icon?: ReactNode
  onClick?: () => void
  loading?: boolean
}

export function StatCard({ label, value, delta, icon, onClick, loading }: StatCardProps) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-2 p-4 text-left transition-colors duration-150 ${
        onClick ? 'cursor-pointer hover:border-border-strong hover:bg-surface-3' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-secondary">{label}</span>
        {icon && <span className="text-text-muted [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      </div>
      {loading ? (
        <div className="skeleton animate-shimmer h-8 w-24 rounded-md" />
      ) : (
        <div className="flex items-baseline gap-2.5">
          <span className="text-[26px] font-semibold leading-none tracking-tight text-text-primary tabular">
            {value}
          </span>
          {delta && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium tabular ${
                delta.positive ? 'text-success' : 'text-danger'
              }`}
            >
              {delta.positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {delta.value}
            </span>
          )}
        </div>
      )}
    </Comp>
  )
}
