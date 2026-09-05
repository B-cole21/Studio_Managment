import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, CircleCheck, Clock } from 'lucide-react'
import { useStore, serviceById, serviceByName, getMaxBookingsPerSlot } from '../lib/store'
import {
  addMinutes, formatDate, formatFullDate, todayISO,
  ethiopianFromISO, ETHIOPIAN_MONTHS, toEthiopianTime,
} from '../lib/format'
import type { Booking } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CalendarGrid } from '../components/ui/Calendar'
import { TimeSlotGrid } from '../components/ui/TimeSlotGrid'
import { Popover } from '../components/ui/Popover'
import { InlineAlert } from '../components/ui/InlineAlert'

export function NewBooking() {
  const state = useStore()
  const createBooking = useStore((s) => s.createBooking)
  const updateBooking = useStore((s) => s.updateBooking)
  const pushToast = useStore((s) => s.pushToast)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const editId = params.get('edit')
  const editing = useMemo(
    () => (editId ? state.bookings.find((b) => String(b.id) === editId) : undefined),
    [editId, state.bookings],
  )

  const [phone, setPhone] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState<string>(params.get('date') ?? todayISO())
  const [start, setStart] = useState<string>(params.get('time') ?? '')
  const [age, setAge] = useState<string>('')
  const [created, setCreated] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setPhone(editing.phone)
      setServiceId(state.services.find((s) => s.name === editing.event)?.id ?? '')
      setDate(editing.date)
      setStart(editing.time)
      setAge(editing.age != null ? String(editing.age) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const service = serviceById(state, serviceId)
  const duration = service?.durationMin ?? 60
  const needAge = Boolean(service?.isBirthday)
  const ageNum = age.trim() === '' ? undefined : Number(age)

  const phoneDigits = phone.replace(/\D/g, '')
  const phoneValid = /^(09|07)\d{8}$/.test(phoneDigits)

  const dateBookings = state.bookings.filter((b) => b.date === date)
  const conflicts = useMemo(() => {
    if (!start || !service) return []
    return dateBookings.filter((b) => {
      if (editing && b.id === editing.id) return false
      const other = serviceByName(state, b.event)
      const aEnd = addMinutes(start, duration)
      const bEnd = addMinutes(b.time, other?.durationMin ?? 60)
      return start < bEnd && b.time < aEnd
    })
  }, [start, duration, dateBookings, service, editing, state])

  const maxBookings = getMaxBookingsPerSlot(state.settings)
  const slotFree = start && service ? conflicts.length < maxBookings : false

  const timeInFuture =
    date !== todayISO() ||
    (() => {
      const [h, m] = start.split(':').map(Number)
      const now = new Date()
      return (h ?? 0) * 60 + (m ?? 0) > now.getHours() * 60 + now.getMinutes()
    })()

  const valid = Boolean(serviceId && date && start && slotFree && timeInFuture && phoneValid) &&
    (!needAge || (ageNum != null && ageNum > 0))

  const submit = async () => {
    if (!valid || !service) return
    setSaving(true)
    const input = {
      customerName: '',
      event: service.name,
      date,
      time: start,
      phone: phoneDigits,
      age: needAge ? ageNum : undefined,
    }
    try {
      if (editing) {
        await updateBooking(editing.id, input)
        pushToast({
          tone: 'success',
          title: 'Booking updated',
          message: `${phoneDigits} · ${formatDate(date, { short: true })} ${toEthiopianTime(start)}`,
        })
        navigate('/bookings')
      } else {
        const booking = await createBooking(input)
        pushToast({
          tone: 'success',
          title: 'Booking created',
          message: `${phoneDigits} · ${formatDate(date, { short: true })} ${toEthiopianTime(start)}`,
        })
        setCreated(booking.id)
      }
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not save booking',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setSaving(false)
    }
  }

  if (created != null) {
    const createdBooking: Booking | undefined = state.bookings.find((b) => b.id === created)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center pt-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
          <CircleCheck size={32} className="text-success" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary">Booking confirmed</h1>
        <p className="mt-2 text-sm text-text-secondary">
          {createdBooking ? formatFullDate(createdBooking.date) : formatFullDate(date)}
          {service ? ` · ${service.name}` : ''}
          {createdBooking?.age != null && ` · Age ${createdBooking.age}`}
        </p>
        <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
          <Clock size={14} className="text-text-muted" />
          {service ? toEthiopianTime(start) : ''}
        </div>
        <div className="mt-8 flex w-full flex-col gap-2">
          <Button onClick={() => navigate('/bookings')}>
            Back to bookings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Scheduling"
        title={editing ? 'Edit booking' : 'New booking'}
        description="Enter the phone number, event, date and time slot"
      />

      <div className="max-w-2xl flex flex-col gap-5">
        <section className="rounded-xl border border-border-subtle bg-surface-2 p-5">
          <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-text-muted">1 · Date & time</h2>
          <Popover
            align="start"
            trigger={(toggle) => (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-text-secondary">Date</span>
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
              </div>
            )}
          >
            {() => (
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => { setDate(todayISO()); setStart('') }}
                  className="mb-2 ml-2 text-[13px] font-medium text-accent hover:underline"
                >
                  Jump to today
                </button>
                <CalendarGrid
                  value={date}
                  onChange={(d) => { setDate(d); setStart('') }}
                  disabledDate={(iso) => iso < todayISO()}
                  marks={new Set(state.bookings.map((b) => b.date))}
                />
              </div>
            )}
          </Popover>

          <div className="mt-4">
            <span className="mb-2 block text-[13px] font-medium text-text-secondary">
              Start time
            </span>
            <TimeSlotGrid date={date} durationMin={duration} value={start} onChange={setStart} />
          </div>
        </section>

        <section className="rounded-xl border border-border-subtle bg-surface-2 p-5">
          <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-text-muted">2 · Phone</h2>
          <Input
            label="Phone number"
            type="tel"
            placeholder="09... or 07... (10 digits)"
            maxLength={10}
            value={phone}
            onChange={(e) => {
              let val = e.target.value.replace(/\D/g, '')
              if (val.startsWith('251') && val.length >= 12) {
                val = '0' + val.slice(3)
              }
              setPhone(val.slice(0, 10))
            }}
            error={phone.length > 0 && !phoneValid ? 'Must start with 09 or 07 followed by 8 digits' : undefined}
            required
          />
        </section>

        <section className="rounded-xl border border-border-subtle bg-surface-2 p-5">
          <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-text-muted">3 · Event</h2>
          <Select
            label="What event"
            placeholder="Choose the event"
            value={serviceId || ''}
            onChange={(e) => setServiceId(e.target.value)}
            options={state.services.map((s) => ({
              value: s.id,
              label: `${s.name}${s.isBirthday ? ' · Birthday' : ''}`,
            }))}
          />
          {service && (
            <div className="mt-3 flex items-center gap-4 rounded-lg bg-surface-3 px-3.5 py-2.5 text-[13px]">
              <span className="text-text-secondary">{service.name}</span>
              <span className="flex items-center gap-1.5 text-text-muted"><Clock size={13} />1 hour</span>
            </div>
          )}
          {needAge && (
            <div className="mt-3">
              <Input
                label="Age"
                type="number"
                min={0}
                max={120}
                placeholder="e.g. 6"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
          )}
        </section>

        {start && service && !slotFree && conflicts.length >= maxBookings && (
          <InlineAlert
            tone="error"
            title="Time conflict"
            message={
              maxBookings === 1
                ? `This time slot is already booked (${conflicts[0]?.phone}). Double booking is currently disabled (1 camera active).`
                : `This time is fully booked (${conflicts.map((c) => c.phone).join(', ')}). Pick another slot.`
            }
          />
        )}
        {start && service && slotFree && conflicts.length === 1 && (
          <InlineAlert
            tone="info"
            title="Double booking"
            message={`There is already a booking at this time (${conflicts[0].phone}). Your active camera capacity (${maxBookings} cameras) allows double booking.`}
          />
        )}
        {start && service && slotFree && conflicts.length === 0 && (
          <InlineAlert tone="success" title="Slot is available" />
        )}

        <div className="flex items-center justify-end gap-4 rounded-xl border border-border-strong bg-surface-2 px-5 py-4">
          <Button disabled={!valid || saving} loading={saving} onClick={submit} size="lg">
            {editing ? 'Save changes' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

