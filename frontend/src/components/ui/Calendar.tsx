import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from './Button'
import {
  ethiopianDaysInMonth, ethiopianFromISO, ethiopianMonthLabel, ethiopianToISO,
  ethiopianWeekdayIndex, isToday, todayISO,
} from '../../lib/format'

const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface EthiopianMonth {
  year: number
  month: number
}

function currentMonth(): EthiopianMonth {
  const e = ethiopianFromISO(todayISO())
  return { year: e.year, month: e.month }
}

function shiftMonth(m: EthiopianMonth, dir: 1 | -1): EthiopianMonth {
  let { year, month } = m
  month += dir
  if (month < 1) { month = 13; year -= 1 }
  if (month > 13) { month = 1; year += 1 }
  return { year, month }
}

function monthCells(m: EthiopianMonth): string[] {
  const firstISO = ethiopianToISO(m.year, m.month, 1)
  const start = ethiopianWeekdayIndex(firstISO)
  const cells: string[] = Array(start).fill('')
  for (let d = 1; d <= ethiopianDaysInMonth(m.year, m.month); d++) {
    cells.push(ethiopianToISO(m.year, m.month, d))
  }
  while (cells.length % 7 !== 0) cells.push('')
  return cells
}

export interface CalendarGridProps {
  value: string | null
  onChange: (iso: string) => void
  visibleMonth?: string
  marks?: Set<string>
  disabledDate?: (iso: string) => boolean
}

export function CalendarGrid({ value, onChange, visibleMonth, marks, disabledDate }: CalendarGridProps) {
  const [month, setMonth] = useState<EthiopianMonth>(() => {
    if (visibleMonth) {
      const e = ethiopianFromISO(visibleMonth)
      return { year: e.year, month: e.month }
    }
    return currentMonth()
  })
  const cells = monthCells(month)

  return (
    <div className="w-[280px] select-none">
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          className="text-[13px] font-semibold text-text-primary"
          onClick={() => setMonth(currentMonth())}
        >
          {ethiopianMonthLabel(month.year, month.month)}
        </button>
        <div className="flex items-center gap-0.5">
          <IconButton label="Previous month" size="sm" icon={<ChevronLeft size={15} />} onClick={() => setMonth(shiftMonth(month, -1))} />
          <IconButton label="Next month" size="sm" icon={<ChevronRight size={15} />} onClick={() => setMonth(shiftMonth(month, 1))} />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {dayHeaders.map((h) => (
          <span key={h} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {h}
          </span>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <span key={`e-${i}`} />
          const day = ethiopianFromISO(iso).day
          const disabled = disabledDate?.(iso)
          const selected = value === iso
          const marked = marks?.has(iso)
          const today = isToday(iso)
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-md text-[13px] tabular transition-colors duration-100 disabled:opacity-30 disabled:cursor-not-allowed ${
                selected
                  ? 'bg-accent font-semibold text-on-accent'
                  : today
                    ? 'font-semibold text-accent hover:bg-accent-soft'
                    : 'text-text-primary hover:bg-surface-3'
              }`}
            >
              {day}
              {marked && !selected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
