import { createPortal } from 'react-dom'
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'
import { useStore } from '../../lib/store'
import type { Toast } from '../../lib/store'

const toneIcon = {
  success: <CircleCheck size={16} className="text-success" />,
  error: <CircleX size={16} className="text-danger" />,
  warning: <TriangleAlert size={16} className="text-warning" />,
  info: <Info size={16} className="text-info" />,
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div
      role="status"
      className="pointer-events-auto flex w-80 animate-toast-in items-start gap-3 rounded-lg border border-border-strong bg-surface-overlay p-3 shadow-2"
    >
      <span className="mt-0.5 shrink-0">{toneIcon[toast.tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-text-primary">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-text-secondary">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismiss(toast.id)}
        className="rounded p-0.5 text-text-muted transition-colors hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastRegion() {
  const toasts = useStore((s) => s.toasts)
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col items-end gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body,
  )
}
