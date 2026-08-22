import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface PopoverProps {
  trigger: (toggle: () => void, open: boolean) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  className?: string
  onOpenChange?: (open: boolean) => void
}

const GAP = 6

export function Popover({ trigger, children, align = 'start', className = '', onOpenChange }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const toggle = () => setOpen((o) => !o)

  useEffect(() => {
    onOpenChange?.(open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapperRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const update = (clamp: boolean) => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = clamp ? (panelRef.current?.offsetWidth ?? 0) : 0
      let left = align === 'end' ? rect.right - width : rect.left
      if (clamp && width > 0) {
        left = Math.max(GAP, Math.min(left, window.innerWidth - width - GAP))
      }
      setPos({ top: rect.bottom + GAP, left })
    }
    const reflow = () => update(true)
    update(false)
    const raf = requestAnimationFrame(reflow)
    window.addEventListener('resize', reflow)
    window.addEventListener('scroll', reflow, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', reflow)
      window.removeEventListener('scroll', reflow, true)
    }
  }, [open, align])

  return (
    <div ref={wrapperRef} className={`relative inline-flex ${className}`} onClick={(e) => e.stopPropagation()}>
      {trigger(toggle, open)}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 50 }}
            className="min-w-44 animate-scale-in rounded-lg border border-border-strong bg-surface-overlay p-1 shadow-2"
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </div>
  )
}
