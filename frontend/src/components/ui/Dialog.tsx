import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './Button'

interface Base {
  open: boolean
  onClose: () => void
  children: ReactNode
}

function useDialogBehavior(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const panel = ref.current
    if (panel) {
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      ;(focusables[0] ?? panel).focus()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'Tab' && panel) {
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [open, ref])
}

export interface DialogProps extends Base {
  title?: string
  description?: string
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}

const dialogWidth = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  icon,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  useDialogBehavior(open, onClose, ref)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
      <div
        className="fixed inset-0 animate-fade-in bg-overlay backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${dialogWidth[size]} animate-scale-in rounded-xl border border-border-strong bg-surface-overlay shadow-2`}
      >
        {(title || icon) && (
          <div className="flex items-start gap-3 px-5 pt-5">
            {icon && (
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent [&>svg]:h-5 [&>svg]:w-5">
                {icon}
              </span>
            )}
            <div className="flex-1">
              {title && <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>}
              {description && (
                <p className="mt-0.5 text-[13px] text-text-secondary">{description}</p>
              )}
            </div>
            <IconButton label="Close dialog" icon={<X size={16} />} onClick={onClose} />
          </div>
        )}
        <div className="px-5 pb-5 pt-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
