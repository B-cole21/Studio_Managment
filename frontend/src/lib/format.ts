export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function timeOf(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function addMinutes(time: string, minutes: number): string {
  return timeOf(minutesOf(time) + minutes)
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1)
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function datePartOf(input: string | null | undefined): string {
  if (typeof input !== 'string') return ''
  const s = input.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return toISODate(d)
}

export function addDaysISO(iso: string, days: number): string {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function isSameDay(a: string, b: string): boolean {
  return a === b
}

export function isToday(iso: string): boolean {
  return iso === todayISO()
}

// ─── Ethiopian calendar ────────────────────────────────────────────────
// Ethiopian New Year: Gregorian 2007-09-11 = Ethiopian 2000-01-01 (Meskerem 1)
const ANCHOR_MS = Date.UTC(2007, 8, 11)
const DAY_MS = 86400000

export const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit',
  'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagumē',
]

export const ETHIOPIAN_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function isEthiopianLeap(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

export interface EthiopianDate {
  year: number
  month: number
  day: number
}

export function ethiopianFromISO(iso: string): EthiopianDate {
  const clean = datePartOf(iso)
  if (!clean) return { year: 0, month: 0, day: 0 }
  const [gy, gm, gd] = clean.split('-').map(Number)
  const targetMs = Date.UTC(gy ?? 2000, (gm ?? 1) - 1, gd ?? 1)
  let days = Math.round((targetMs - ANCHOR_MS) / DAY_MS)

  let year = 2000
  if (days >= 0) {
    while (days >= (isEthiopianLeap(year) ? 366 : 365)) {
      days -= isEthiopianLeap(year) ? 366 : 365
      year++
    }
  } else {
    while (days < 0) {
      year--
      days += isEthiopianLeap(year) ? 366 : 365
    }
  }
  const month = Math.floor(days / 30) + 1
  const day = (days % 30) + 1
  return { year, month, day }
}

export function ethiopianToISO(year: number, month: number, day: number): string {
  let days = 0
  if (year >= 2000) {
    for (let y = 2000; y < year; y++) days += isEthiopianLeap(y) ? 366 : 365
  } else {
    for (let y = year; y < 2000; y++) days -= isEthiopianLeap(y) ? 366 : 365
  }
  days += (month - 1) * 30 + (day - 1)
  const d = new Date(ANCHOR_MS + days * DAY_MS)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function ethiopianDaysInMonth(year: number, month: number): number {
  if (month === 13) return isEthiopianLeap(year) ? 6 : 5
  return 30
}

export function ethiopianWeekdayIndex(iso: string): number {
  const clean = datePartOf(iso)
  if (!clean) return -1
  const d = new Date(Date.UTC(Number(clean.slice(0, 4)), Number(clean.slice(5, 7)) - 1, Number(clean.slice(8, 10))))
  return (d.getUTCDay() + 6) % 7
}

export function ethiopianMonthLabel(year: number, month: number): string {
  return `${ETHIOPIAN_MONTHS[month - 1]} ${year}`
}

// ─── Date display (Ethiopian calendar) ─────────────────────────────────
export function formatDate(iso: string, opts?: { short?: boolean }): string {
  const clean = datePartOf(iso)
  if (!clean) return '—'
  const e = ethiopianFromISO(clean)
  const weekdayName = ETHIOPIAN_WEEKDAYS[ethiopianWeekdayIndex(clean)]
  const today = todayISO()
  const tomorrow = addDaysISO(today, 1)
  const yesterday = addDaysISO(today, -1)

  if (opts?.short) return `${weekdayName}, ${ETHIOPIAN_MONTHS[e.month - 1]} ${e.day}`
  if (isSameDay(clean, today)) return 'Today'
  if (isSameDay(clean, tomorrow)) return 'Tomorrow'
  if (isSameDay(clean, yesterday)) return 'Yesterday'
  return `${weekdayName}, ${ETHIOPIAN_MONTHS[e.month - 1]} ${e.day}`
}

export function formatFullDate(iso: string): string {
  const clean = datePartOf(iso)
  if (!clean) return '—'
  const e = ethiopianFromISO(clean)
  const weekdayName = ETHIOPIAN_WEEKDAYS[ethiopianWeekdayIndex(clean)]
  return `${weekdayName}, ${ETHIOPIAN_MONTHS[e.month - 1]} ${e.day}, ${e.year}`
}

// ─── Ethiopian time (12-hour clock, day starts at 06:00 Gregorian = 12:00) ──
export function toEthiopianTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const eh = ((h ?? 0) + 6) % 24
  const e12 = eh % 12 === 0 ? 12 : eh % 12
  return `${e12}:${String(m ?? 0).padStart(2, '0')}`
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function formatEventName(event: string): string {
  if (event.trim().toLowerCase() === 'birthday package') return 'Birthday'
  return event
}
