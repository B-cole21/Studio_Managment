import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, CalendarDays, Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ChangeDateDialog } from '../components/ui/ChangeDateDialog'
import { useStore, bookingsOnDate, serviceByName } from '../lib/store'
import { formatDate, formatFullDate, toEthiopianTime, todayISO, formatEventName } from '../lib/format'
import type { Booking } from '../lib/types'

export function BookingPage() {
  const state = useStore()
  const navigate = useNavigate()
  const removeBooking = useStore((s) => s.removeBooking)
  const updateBooking = useStore((s) => s.updateBooking)
  const pushToast = useStore((s) => s.pushToast)
  const today = todayISO()
  const list = bookingsOnDate(state, today)
  const [pendingDelete, setPendingDelete] = useState<Booking | null>(null)
  const [pendingReschedule, setPendingReschedule] = useState<Booking | null>(null)
  const [search, setSearch] = useState('')

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await removeBooking(pendingDelete.id)
      pushToast({ tone: 'success', title: 'Booking deleted', message: `${pendingDelete.phone} · slot released` })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not delete booking',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    }
    setPendingDelete(null)
  }

  const confirmReschedule = async (booking: Booking, newDate: string, newTime: string) => {
    try {
      await updateBooking(booking.id, {
        customerName: booking.customerName || '',
        event: booking.event,
        date: newDate,
        time: newTime,
        phone: booking.phone,
        age: booking.age,
      })
      pushToast({
        tone: 'success',
        title: 'Booking rescheduled',
        message: `${booking.phone} · ${formatDate(newDate, { short: true })} ${toEthiopianTime(newTime)}`,
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not reschedule booking',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    }
    setPendingReschedule(null)
  }

  const q = search.trim().toLowerCase()
  const filtered = q ? list.filter((b) => b.phone.includes(q) || b.event.toLowerCase().includes(q)) : list

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Scheduling"
        title="Bookings"
        description={formatFullDate(today)}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => navigate('/bookings/new')}>
            New booking
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-2">
        <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3.5 sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Today's bookings</h2>
            <p className="text-[13px] text-text-muted">
              {list.length === 0
                ? 'Nothing scheduled yet'
                : `${list.length} ${list.length === 1 ? 'booking' : 'bookings'} scheduled`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {list.length > 0 && (
              <div className="relative flex-1 sm:w-56 sm:flex-initial">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search phone or event…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-full rounded-md border border-border-strong bg-surface-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted transition-colors hover:border-accent focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
              </div>
            )}
            <span className="flex items-center gap-1.5 text-xs sm:text-[13px] text-text-muted shrink-0">
              <CalendarDays size={14} />
              Today
            </span>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarDays size={18} />}
            title="No bookings today"
            message="Book a time slot and it will appear here."
            action={
              <Button icon={<Plus size={15} />} onClick={() => navigate('/bookings/new')}>
                New booking
              </Button>
            }
          />
        ) : (
          <>
            {/* Mobile Card List View (< md) */}
            <div className="flex flex-col divide-y divide-border-subtle md:hidden">
              {filtered.map((b) => {
                const svc = serviceByName(state, b.event)
                return (
                  <div key={b.id} className="flex flex-col gap-2.5 p-4 transition-colors hover:bg-surface-3/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <a href={`tel:${b.phone}`} className="text-sm font-semibold text-text-primary hover:text-accent hover:underline tabular">
                            {b.phone}
                          </a>
                          <span className="rounded bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent tabular">
                            {toEthiopianTime(b.time)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
                          <span className="text-text-secondary">{formatEventName(b.event)}</span>
                          {svc?.isBirthday && !b.event.toLowerCase().includes('birthday') && <Badge tone="info">Birthday</Badge>}
                          {b.age != null && <span>({b.age} yrs)</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <IconButton
                          label={`Change date for ${b.phone}`}
                          variant="ghost"
                          icon={<CalendarClock size={16} />}
                          onClick={() => setPendingReschedule(b)}
                        />
                        <IconButton
                          label={`Delete booking for ${b.phone}`}
                          variant="ghost"
                          icon={<Trash2 size={16} />}
                          onClick={() => setPendingDelete(b)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-[12px] uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-2.5 font-medium">Time</th>
                    <th className="px-5 py-2.5 font-medium">Phone</th>
                    <th className="px-5 py-2.5 font-medium">Event</th>
                    <th className="px-5 py-2.5 font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const svc = serviceByName(state, b.event)
                    return (
                      <tr key={b.id} className="border-b border-border-subtle/60 last:border-b-0">
                        <td className="whitespace-nowrap px-5 py-3 tabular">
                          <p className="text-[13px] font-medium text-text-primary">
                            {toEthiopianTime(b.time)}
                          </p>
                        </td>
                        <td className="px-5 py-3 tabular">
                          <a href={`tel:${b.phone}`} className="text-[13px] font-medium text-text-secondary hover:text-accent hover:underline">
                            {b.phone}
                          </a>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[13px] font-medium text-text-primary">
                            {formatEventName(b.event)}
                            {svc?.isBirthday && !b.event.toLowerCase().includes('birthday') && <Badge tone="info">Birthday</Badge>}
                          </p>
                          {b.age != null && <p className="text-xs text-text-muted">{b.age} yrs</p>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex items-center gap-1">
                            <IconButton
                              label={`Change date for ${b.phone}`}
                              variant="ghost"
                              icon={<CalendarClock size={15} />}
                              onClick={() => setPendingReschedule(b)}
                            />
                            <IconButton
                              label={`Delete booking for ${b.phone}`}
                              variant="ghost"
                              icon={<Trash2 size={15} />}
                              onClick={() => setPendingDelete(b)}
                            />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="Delete booking?"
        message={
          pendingDelete
            ? `The booking for ${pendingDelete.phone} (${pendingDelete.event}) will be permanently removed and the time slot released.`
            : undefined
        }
        onConfirm={confirmDelete}
      />
      <ChangeDateDialog
        open={pendingReschedule != null}
        booking={pendingReschedule}
        onClose={() => setPendingReschedule(null)}
        onConfirm={confirmReschedule}
      />
    </div>
  )
}
