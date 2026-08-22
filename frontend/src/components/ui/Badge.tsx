import type { ReactNode } from 'react'

export type BadgeTone = 'paid' | 'due' | 'partial' | 'cancelled' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const toneClass: Record<BadgeTone, string> = {
  paid: 'bg-success-soft text-success',
  success: 'bg-success-soft text-success',
  due: 'bg-danger-soft text-danger',
  danger: 'bg-danger-soft text-danger',
  partial: 'bg-warning-soft text-warning',
  warning: 'bg-warning-soft text-warning',
  cancelled: 'bg-surface-3 text-text-muted',
  neutral: 'bg-surface-3 text-text-secondary',
  info: 'bg-info-soft text-info',
}

export interface BadgeProps {
  tone: BadgeTone
  children: ReactNode
  icon?: ReactNode
  dot?: boolean
  className?: string
}

export function Badge({ tone, children, icon, dot, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${toneClass[tone]} ${className}`}
    >
      {dot && <StatusDot tone={tone} />}
      {icon}
      {children}
    </span>
  )
}

const dotColor: Record<BadgeTone, string> = {
  paid: 'bg-success',
  success: 'bg-success',
  due: 'bg-danger',
  danger: 'bg-danger',
  partial: 'bg-warning',
  warning: 'bg-warning',
  cancelled: 'bg-text-muted',
  neutral: 'bg-text-muted',
  info: 'bg-info',
}

export function StatusDot({ tone, className = '' }: { tone: BadgeTone; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotColor[tone]} ${className}`}
    />
  )
}
