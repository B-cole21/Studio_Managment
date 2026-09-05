import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useStore, serviceByName, isSlotFree } from '../../lib/store'
import { todayISO, formatDate, ethiopianFromISO, ETHIOPIAN_MONTHS } from '../../lib/format'
import type { Booking } from '../../lib/types'
import { Dialog } from './Dialog'
import { Button } from './Button'
import { CalendarGrid } from './Calendar'
import { TimeSlotGrid } from './TimeSlotGrid'
import { Popover } from './Popover'

interface Props {
  open: boolean
  booking: Booking | null
  onClose: () => void
  onConfirm: (booking: Booking, newDate: string, newTime: string) => Promise<void>
}

export function ChangeDateDialog({ open, booking, onClose, onConfirm }: Props) {
  const state = useStore()
  const [date, setDate] = useState(booking?.date ?? todayISO())
  const [time, setTime] = useState(booking?.time ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && booking) {
      setDate(booking.date)
      setTime(booking.time)
    }
  }, [open, booking])

  const svc = booking ? serviceByName(state, booking.event) : undefined
  const duration = svc?.durationMin ?? 60

  const slotAvailable = time && isSlotFree(state, date, time, duration)
  const sameSlot = booking ? date === booking.date && time === booking.time : false

  const handleConfirm = async () => {
    if (!booking || !time || saving) return
    setSaving(true)
    try {
      await onConfirm(booking, date, time)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change booking date"
      description={booking ? `Rescheduling booking for ${booking.phone}` : undefined}
      icon={<CalendarDays size={20} />}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button disabled={!time || sameSlot || !slotAvailable || saving} loading={saving} onClick={handleConfirm}>
            Change date
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Popover
            align="start"
            trigger={(toggle) => (
              <button
                type="button"
                onClick={toggle}
                className="flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3 text-left text-sm text-text-primary transition-colors hover:border-accent focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              >
                <CalendarDays size={15} className="text-text-muted" />
                <span className="flex-1">{formatDate(date)}</span>
                <span className="text-xs text-text-muted tabular">
                  {(() => { const e = ethiopianFromISO(date); return `${e.day} ${ETHIOPIAN_MONTHS[e.month - 1]?.slice(0, 4) ?? ''}` })()}
                </span>
              </button>
            )}
          >
            {() => (
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => { setDate(todayISO()); setTime('') }}
                  className="mb-2 ml-2 text-[13px] font-medium text-accent hover:underline"
                >
                  Jump to today
                </button>
                <CalendarGrid
                  value={date}
                  onChange={(d) => { setDate(d); setTime('') }}
                  disabledDate={(iso) => iso < todayISO()}
                  marks={new Set(state.bookings.map((b) => b.date))}
                />
              </div>
            )}
          </Popover>
        </div>

        <div>
          <span className="mb-2 block text-[13px] font-medium text-text-secondary">New time</span>
          <TimeSlotGrid date={date} durationMin={duration} value={time} onChange={setTime} />
        </div>

        {time && !slotAvailable && (
          <p className="text-[13px] text-danger">This time slot is fully booked. Pick another.</p>
        )}
        {sameSlot && (
          <p className="text-[13px] text-text-muted">Same date and time — pick a different slot to change.</p>
        )}
      </div>
    </Dialog>
  )
}
