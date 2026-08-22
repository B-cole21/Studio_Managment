import type { ReactNode } from 'react'
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'

export type AlertTone = 'info' | 'success' | 'warning' | 'error'

const config: Record<AlertTone, { icon: ReactNode; cls: string; iconCls: string }> = {
  info: { icon: <Info size={16} />, cls: 'bg-info-soft border-info/20', iconCls: 'text-info' },
  success: { icon: <CircleCheck size={16} />, cls: 'bg-success-soft border-success/20', iconCls: 'text-success' },
  warning: { icon: <TriangleAlert size={16} />, cls: 'bg-warning-soft border-warning/20', iconCls: 'text-warning' },
  error: { icon: <CircleX size={16} />, cls: 'bg-danger-soft border-danger/20', iconCls: 'text-danger' },
}

export interface InlineAlertProps {
  tone?: AlertTone
  title: string
  message?: ReactNode
  action?: ReactNode
}

export function InlineAlert({ tone = 'info', title, message, action }: InlineAlertProps) {
  const c = config[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 ${c.cls}`}
    >
      <span className={`mt-0.5 shrink-0 ${c.iconCls}`}>{c.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-text-primary">{title}</p>
        {message && <div className="mt-0.5 text-[13px] text-text-secondary">{message}</div>}
      </div>
      {action}
    </div>
  )
}
