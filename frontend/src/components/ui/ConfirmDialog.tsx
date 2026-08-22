import { useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Dialog } from './Dialog'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'primary' | 'success'
  icon?: ReactNode
  onConfirm: () => Promise<void> | void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  icon,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  const handleConfirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  const iconBg =
    variant === 'success' || variant === 'primary'
      ? 'bg-accent/15 text-accent'
      : 'bg-danger-soft text-danger'

  const buttonVariant =
    variant === 'success' || variant === 'primary'
      ? 'primary'
      : 'destructive'

  const defaultIcon =
    variant === 'success' || variant === 'primary' ? (
      <CheckCircle2 size={28} />
    ) : (
      <AlertTriangle size={28} />
    )

  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center gap-4 text-center py-1">
        <span className={`flex h-14 w-14 items-center justify-center rounded-full ${iconBg}`}>
          {icon ?? defaultIcon}
        </span>
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-lg font-bold text-text-primary sm:text-xl">{title}</h3>
          {message && (
            <div className="max-w-md text-base font-semibold leading-relaxed text-text-primary">
              {message}
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant={buttonVariant} loading={busy} onClick={handleConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
