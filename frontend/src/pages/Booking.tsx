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
import { formatDate, formatFullDate, toEthiopianTime, todayISO } from '../lib/format'
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
      pushToast({ tone: 'success', title: 'Booking deleted', message: `${pendingDelete.customerName} · slot released` })
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
        customerName: booking.customerName,
        event: booking.event,
        date: newDate,
        time: newTime,
        phone: booking.phone,
        age: booking.age,
      })
      pushToast({
        tone: 'success',
        title: 'Booking rescheduled',
        message: `${booking.customerName} · ${formatDate(newDate, { short: true })} ${toEthiopianTime(newTime)}`,
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
  const filtered = q ? list.filter((b) => b.customerName.toLowerCase().includes(q) || b.phone.includes(q)) : list

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
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Today's bookings</h2>
            <p className="text-[13px] text-text-muted">
              {list.length === 0
                ? 'Nothing scheduled yet'
                : `${list.length} ${list.length === 1 ? 'booking' : 'bookings'} scheduled`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {list.length > 0 && (
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search name or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-48 rounded-md border border-border-strong bg-surface-2 pl-8 pr-3 text-[13px] text-text-primary placeholder:text-text-muted transition-colors hover:border-accent focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
              </div>
            )}
            <span className="flex items-center gap-1.5 text-[13px] text-text-muted">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-[12px] uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-2.5 font-medium">Time</th>
                  <th className="px-5 py-2.5 font-medium">Customer</th>
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
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium text-text-primary">{b.customerName}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] tabular text-text-secondary">{b.phone}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium text-text-primary">
                          {b.event}
                          {svc?.isBirthday && <Badge tone="info">Birthday</Badge>}
                        </p>
                        {b.age != null && <p className="text-xs text-text-muted">{b.age} yrs</p>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="inline-flex items-center gap-1">
                          <IconButton
                            label={`Change date for ${b.customerName}`}
                            variant="ghost"
                            icon={<CalendarClock size={15} />}
                            onClick={() => setPendingReschedule(b)}
                          />
                          <IconButton
                            label={`Delete booking for ${b.customerName}`}
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
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="Delete booking?"
        message={
          pendingDelete
            ? `The booking for ${pendingDelete.customerName} will be permanently removed and the time slot released.`
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
