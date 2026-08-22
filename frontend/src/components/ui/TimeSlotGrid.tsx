import { useMemo } from 'react'
import { useStore, isSlotFree } from '../../lib/store'
import { minutesOf, toEthiopianTime, todayISO } from '../../lib/format'

export interface TimeSlotGridProps {
  date: string
  durationMin: number
  value: string | null
  onChange: (start: string) => void
}

export function TimeSlotGrid({ date, durationMin, value, onChange }: TimeSlotGridProps) {
  const state = useStore()
  const hours = state.settings.hours[0]

  const slots = useMemo(() => {
    if (!hours) return []
    const open = minutesOf(hours.open)
    const close = minutesOf(hours.close)
    const now = new Date()
    const currentMin = now.getHours() * 60 + now.getMinutes()
    const isToday = date === todayISO()
    const list: { start: string; free: boolean }[] = []
    for (let m = open; m < close; m += 60) {
      const h = Math.floor(m / 60)
      const mm = m % 60
      const start = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      const past = isToday && m <= currentMin
      list.push({ start, free: isSlotFree(state, date, start, durationMin) && !past })
    }
    return list
  }, [state, date, durationMin, hours])

  if (!hours) return null

  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Available start times">
        {slots.map((slot) => {
          const selected = slot.start === value
          return (
            <button
              key={slot.start}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!slot.free}
              onClick={() => onChange(slot.start)}
              className={`h-9 rounded-md border text-[13px] tabular transition-all duration-100 ${
                selected
                  ? 'border-accent bg-accent font-medium text-on-accent'
                  : slot.free
                    ? 'border-border-strong bg-surface-2 text-text-primary hover:border-accent hover:bg-accent-soft'
                    : 'cursor-not-allowed border-border-subtle bg-surface-2/50 text-text-muted/40 line-through decoration-border-strong'
              }`}
            >
              {toEthiopianTime(slot.start)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
