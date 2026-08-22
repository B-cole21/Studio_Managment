import { useState } from 'react'
import {
  CalendarClock, CalendarDays, Search, Trash2, ChevronLeft, ChevronRight,
  Filter, RotateCcw, Calendar as CalendarIcon,
} from 'lucide-react'
import { useStore, bookingsOnDate, serviceByName } from '../lib/store'
import {
  addDaysISO, ETHIOPIAN_MONTHS, ETHIOPIAN_WEEKDAYS, ethiopianFromISO,
  ethiopianWeekdayIndex, formatDate, todayISO, toEthiopianTime, formatFullDate,
} from '../lib/format'
import type { Booking } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Button, IconButton } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ChangeDateDialog } from '../components/ui/ChangeDateDialog'
import { Popover } from '../components/ui/Popover'
import { CalendarGrid } from '../components/ui/Calendar'

export type DateFilterMode = 'week' | 'today' | 'tomorrow' | 'customDate' | 'customRange' | 'all'

function getTargetDates(
  mode: DateFilterMode,
  today: string,
  anchorDate: string,
  selectedDate: string,
  startDate: string,
  endDate: string,
): string[] | null {
  if (mode === 'today') return [today]
  if (mode === 'tomorrow') return [addDaysISO(today, 1)]

  if (mode === 'week') {
    const monday = addDaysISO(anchorDate, -ethiopianWeekdayIndex(anchorDate))
    return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i))
  }


  if (mode === 'customDate') {
    return [selectedDate || today]
  }

  if (mode === 'customRange') {
    if (!startDate || !endDate) return null
    const start = startDate <= endDate ? startDate : endDate
    const end = startDate <= endDate ? endDate : startDate
    const dates: string[] = []
    let curr = start
    let count = 0
    while (curr <= end && count < 180) {
      dates.push(curr)
      curr = addDaysISO(curr, 1)
      count++
    }
    return dates
  }

  if (mode === 'all') return null
  return [today]
}

export function Dashboard() {
  const state = useStore()
  const removeBooking = useStore((s) => s.removeBooking)
  const updateBooking = useStore((s) => s.updateBooking)
  const pushToast = useStore((s) => s.pushToast)
  
  const today = todayISO()
  const [anchorDate, setAnchorDate] = useState<string>(today)
  const [filterMode, setFilterMode] = useState<DateFilterMode>('week')
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [startDate, setStartDate] = useState<string>(today)
  const [endDate, setEndDate] = useState<string>(addDaysISO(today, 7))
  const [search, setSearch] = useState('')

  const [pendingDelete, setPendingDelete] = useState<Booking | null>(null)
  const [pendingReschedule, setPendingReschedule] = useState<Booking | null>(null)

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

  // Calculate target dates based on filter mode
  const targetDates = getTargetDates(filterMode, today, anchorDate, selectedDate, startDate, endDate)
  
  let viewBookings: { date: string; booking: Booking }[] = []
  if (targetDates === null) {
    viewBookings = state.bookings.map((b) => ({ date: b.date, booking: b }))
  } else {
    for (const date of targetDates) {
      for (const b of bookingsOnDate(state, date)) {
        viewBookings.push({ date, booking: b })
      }
    }
  }

  const todayCount = bookingsOnDate(state, today).length
  const totalCount = state.bookings.length

  const q = search.trim().toLowerCase()
  const filteredBookings = q
    ? viewBookings.filter((r) => r.booking.customerName.toLowerCase().includes(q) || r.booking.phone.includes(q))
    : viewBookings

  const filteredDayCounts = new Map<string, number>()
  for (const r of filteredBookings) {
    filteredDayCounts.set(r.date, (filteredDayCounts.get(r.date) ?? 0) + 1)
  }

  // Navigation handlers for quick prev/next
  const handlePrev = () => {
    if (filterMode === 'week') {
      setAnchorDate((prev) => addDaysISO(prev, -7))
    } else if (filterMode === 'today' || filterMode === 'tomorrow' || filterMode === 'customDate') {
      const active = filterMode === 'customDate' ? selectedDate : (filterMode === 'tomorrow' ? addDaysISO(today, 1) : today)
      const prevDate = addDaysISO(active, -1)
      setSelectedDate(prevDate)
      setAnchorDate(prevDate)
      setFilterMode('customDate')
    }
  }

  const handleNext = () => {
    if (filterMode === 'week') {
      setAnchorDate((prev) => addDaysISO(prev, 7))
    } else if (filterMode === 'today' || filterMode === 'tomorrow' || filterMode === 'customDate') {
      const active = filterMode === 'customDate' ? selectedDate : (filterMode === 'tomorrow' ? addDaysISO(today, 1) : today)
      const nextDate = addDaysISO(active, 1)
      setSelectedDate(nextDate)
      setAnchorDate(nextDate)
      setFilterMode('customDate')
    }
  }

  const handleReset = () => {
    setAnchorDate(today)
    setSelectedDate(today)
    setFilterMode('week')
    setSearch('')
  }

  // Dynamic heading subtext
  const getSubtext = () => {
    if (filterMode === 'today') return `Bookings for today (${formatDate(today, { short: true })})`
    if (filterMode === 'tomorrow') return `Bookings for tomorrow (${formatDate(addDaysISO(today, 1), { short: true })})`
    if (filterMode === 'week') {
      const monday = addDaysISO(anchorDate, -ethiopianWeekdayIndex(anchorDate))
      const sunday = addDaysISO(monday, 6)
      return `Schedule from ${formatDate(monday, { short: true })} to ${formatDate(sunday, { short: true })}`
    }
    if (filterMode === 'customDate') return `Bookings on ${formatFullDate(selectedDate)}`
    if (filterMode === 'customRange') return `Bookings from ${formatDate(startDate, { short: true })} to ${formatDate(endDate, { short: true })}`
    return 'All scheduled bookings'
  }

  const isFiltered = filterMode !== 'week' || anchorDate !== today || search !== ''

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={formatDate(today)}
        title={` ${state.settings.studioName}`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Bookings today"
          value={String(todayCount)}
          icon={<CalendarDays size={16} />}
        />
        <StatCard
          label="In selected view"
          value={String(viewBookings.length)}
          icon={<Filter size={16} />}
        />
        <StatCard
          label="Total bookings"
          value={String(totalCount)}
          icon={<CalendarClock size={16} />}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-border-subtle bg-surface-2 p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <Filter size={16} className="text-accent" />
            <span>Date Filter</span>
            {isFiltered && (
              <Badge tone="info">Filter Active</Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <IconButton
              label="Previous period"
              icon={<ChevronLeft size={16} />}
              variant="secondary"
              size="sm"
              onClick={handlePrev}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={handleReset}
            >
              Today
            </Button>
            <IconButton
              label="Next period"
              icon={<ChevronRight size={16} />}
              variant="secondary"
              size="sm"
              onClick={handleNext}
            />
          </div>
        </div>

        {/* Filter Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setFilterMode('today')}
            className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors ${
              filterMode === 'today'
                ? 'bg-accent text-on-accent shadow-sm'
                : 'bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-3'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('tomorrow')}
            className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors ${
              filterMode === 'tomorrow'
                ? 'bg-accent text-on-accent shadow-sm'
                : 'bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-3'
            }`}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode('week')
              setAnchorDate(today)
            }}
            className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors ${
              filterMode === 'week' && anchorDate === today
                ? 'bg-accent text-on-accent shadow-sm'
                : 'bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-3'
            }`}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('customDate')}
            className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors ${
              filterMode === 'customDate'
                ? 'bg-accent text-on-accent shadow-sm'
                : 'bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-3'
            }`}
          >
            Specific Date
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('customRange')}
            className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors ${
              filterMode === 'customRange'
                ? 'bg-accent text-on-accent shadow-sm'
                : 'bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-3'
            }`}
          >
            Custom Range
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors ${
              filterMode === 'all'
                ? 'bg-accent text-on-accent shadow-sm'
                : 'bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-3'
            }`}
          >
            All Bookings
          </button>
        </div>

        {/* Date Inputs for Specific Date / Custom Range */}
        {filterMode === 'customDate' && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs font-medium text-text-muted flex items-center gap-1.5">
              <CalendarIcon size={14} />
              Select Ethiopian Date:
            </span>
            <Popover
              align="start"
              trigger={(toggle) => (
                <button
                  type="button"
                  onClick={toggle}
                  className="flex h-8 items-center gap-2 rounded-md border border-border-strong bg-surface-1 px-3 text-left text-xs font-medium text-text-primary transition-colors hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
                >
                  <CalendarIcon size={14} className="text-accent" />
                  <span>{formatFullDate(selectedDate)}</span>
                </button>
              )}
            >
              {(close) => (
                <div className="p-2">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-text-secondary">Ethiopian Calendar</span>
                    <button
                      type="button"
                      onClick={() => { setSelectedDate(today); close() }}
                      className="text-[12px] font-medium text-accent hover:underline"
                    >
                      Today
                    </button>
                  </div>
                  <CalendarGrid
                    value={selectedDate}
                    onChange={(d) => {
                      setSelectedDate(d)
                      close()
                    }}
                    marks={new Set(state.bookings.map((b) => b.date))}
                  />
                </div>
              )}
            </Popover>
          </div>
        )}

        {filterMode === 'customRange' && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-muted">From:</span>
              <Popover
                align="start"
                trigger={(toggle) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className="flex h-8 items-center gap-2 rounded-md border border-border-strong bg-surface-1 px-3 text-left text-xs font-medium text-text-primary transition-colors hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
                  >
                    <CalendarIcon size={14} className="text-accent" />
                    <span>{formatDate(startDate, { short: true })}</span>
                  </button>
                )}
              >
                {(close) => (
                  <div className="p-2">
                    <CalendarGrid
                      value={startDate}
                      onChange={(d) => {
                        setStartDate(d)
                        close()
                      }}
                      marks={new Set(state.bookings.map((b) => b.date))}
                    />
                  </div>
                )}
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-muted">To:</span>
              <Popover
                align="start"
                trigger={(toggle) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className="flex h-8 items-center gap-2 rounded-md border border-border-strong bg-surface-1 px-3 text-left text-xs font-medium text-text-primary transition-colors hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
                  >
                    <CalendarIcon size={14} className="text-accent" />
                    <span>{formatDate(endDate, { short: true })}</span>
                  </button>
                )}
              >
                {(close) => (
                  <div className="p-2">
                    <CalendarGrid
                      value={endDate}
                      onChange={(d) => {
                        setEndDate(d)
                        close()
                      }}
                      marks={new Set(state.bookings.map((b) => b.date))}
                    />
                  </div>
                )}
              </Popover>
            </div>
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-2">
        <div className="flex flex-wrap items-center justify-between border-b border-border-subtle px-5 py-4 gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Overview Schedule</h2>
            <p className="text-[13px] text-text-muted">{getSubtext()}</p>
          </div>
          
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
        </div>

        {filteredBookings.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarDays size={18} />}
            title={q ? 'No matching bookings' : 'No bookings found for selected period'}
            message={q ? 'Try adjusting your search query.' : 'Try changing your date filter or selecting a different week.'}
            action={
              isFiltered ? (
                <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={handleReset}>
                  Reset Date Filter
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-[12px] uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-2.5 font-medium">Day</th>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-5 py-2.5 font-medium">Time</th>
                  <th className="px-5 py-2.5 font-medium">Customer</th>
                  <th className="px-5 py-2.5 font-medium">Event</th>
                  <th className="px-5 py-2.5 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(({ date, booking }, i) => {
                  const firstOfDay = i === 0 || filteredBookings[i - 1].date !== date
                  const rowSpan = filteredDayCounts.get(date) ?? 1
                  const svc = serviceByName(state, booking.event)
                  const e = ethiopianFromISO(date)
                  return (
                    <tr key={booking.id} className="border-b border-border-subtle/60 last:border-b-0">
                      {firstOfDay && (
                        <>
                          <td className="whitespace-nowrap px-5 py-3 align-top" rowSpan={rowSpan}>
                            <span className="text-[13px] font-medium text-text-primary">
                              {ETHIOPIAN_WEEKDAYS[ethiopianWeekdayIndex(date)] ?? '—'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 align-top" rowSpan={rowSpan}>
                            <span className="text-[13px] text-text-secondary">
                              {e.month >= 1 ? `${ETHIOPIAN_MONTHS[e.month - 1]} ${e.day}, ${e.year}` : '—'}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="whitespace-nowrap px-5 py-3 tabular">
                        <span className="text-[13px] font-medium text-text-primary">
                          {toEthiopianTime(booking.time)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium text-text-primary">{booking.customerName}</p>
                        <p className="text-xs tabular text-text-muted">{booking.phone}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium text-text-primary">
                          {booking.event}
                          {svc?.isBirthday && <Badge tone="info">Birthday</Badge>}
                        </p>
                        {booking.age != null && <p className="text-xs text-text-muted">{booking.age} yrs</p>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="inline-flex items-center gap-1">
                          <IconButton
                            label={`Change date for ${booking.customerName}`}
                            variant="ghost"
                            icon={<CalendarClock size={15} />}
                            onClick={() => setPendingReschedule(booking)}
                          />
                          <IconButton
                            label={`Delete booking for ${booking.customerName}`}
                            variant="ghost"
                            icon={<Trash2 size={15} />}
                            onClick={() => setPendingDelete(booking)}
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

