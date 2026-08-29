import { create } from 'zustand'
import type {
  Booking, ID, Package, Service, StudioSettings, Theme,
} from './types'
import { buildSeed } from './mock'
import { addMinutes, minutesOf } from './format'
import {
  loginRequest, getMe, logoutRequest, updateAccountApi,
  type AuthUser, type AccountInput, type BookingInput, type ServiceInput,
  getBookings, createBookingApi, updateBookingApi, deleteBookingApi,
  getServices, createServiceApi, updateServiceApi, deleteServiceApi,
  getSettings, updateSettingsApi, getPackages, createPackageApi, updatePackageApi,
  confirmFirstApi, confirmRemainderApi, cashierConfirmFirstApi, cashierConfirmRemainderApi,
  cashierConfirmSecondApi, confirmSecondApi,
  type PackageInput as PackageApiInput, type PackageRecord,
} from './api'

export interface ToastInput {
  tone: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
}

export interface Toast extends ToastInput {
  id: ID
}

export interface PackageInput {
  name: string
  phone: string
  quantity?: number
  frame?: string
  firstPayment?: number
  secondPayment?: number
  remainder?: number
  date?: string
  paymentType?: 'Cash' | 'Bank'
  fullPayment?: boolean
  pendingSelection?: boolean
}

function toPackage(r: PackageRecord): Package {
  return {
    ...r,
    firstPayment: Number(r.firstPayment),
    secondPayment: Number(r.secondPayment ?? 0),
    remainder: r.remainder != null ? Number(r.remainder) : null,
    pendingSelection: r.pendingSelection ?? false,
    firstCashierConfirmed: r.firstCashierConfirmed ?? false,
    remainderCashierConfirmed: r.remainderCashierConfirmed ?? false,
    remainderPaymentType: r.remainderPaymentType ?? null,
    secondPaymentConfirmed: r.secondPaymentConfirmed ?? false,
    secondPaymentCashierConfirmed: r.secondPaymentCashierConfirmed ?? false,
  }
}

interface StoreState {
  services: Service[]
  bookings: Booking[]
  packages: Package[]
  settings: StudioSettings
  currentUser: { name: string; role: string; initials: string }
  authUser: AuthUser | null
  loading: boolean

  theme: Theme
  sidebarCollapsed: boolean
  toasts: Toast[]

  login: (userName: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  validateSession: () => Promise<void>
  updateAccount: (input: AccountInput) => Promise<AuthUser>
  loadData: () => Promise<void>

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  pushToast: (toast: ToastInput) => void
  dismissToast: (id: ID) => void

  createBooking: (input: BookingInput) => Promise<Booking>
  updateBooking: (id: number, input: BookingInput) => Promise<void>
  removeBooking: (id: number) => Promise<void>
  addPackage: (input: PackageInput) => Promise<Package>
  updatePackage: (
    id: ID,
    input: Partial<PackageInput> & {
      name?: string
      phone?: string
      remainderReceived?: boolean
      pendingSelection?: boolean
      remainderPaymentType?: 'Cash' | 'Bank' | null
    },
  ) => Promise<void>
  confirmFirst: (id: ID) => Promise<void>
  cashierConfirmFirst: (id: ID) => Promise<void>
  confirmRemainder: (id: ID) => Promise<void>
  cashierConfirmRemainder: (id: ID) => Promise<void>
  cashierConfirmSecond: (id: ID) => Promise<void>
  confirmSecond: (id: ID) => Promise<void>
  updateSettings: (partial: Partial<StudioSettings>) => Promise<void>
  addService: (input: ServiceInput) => Promise<Service>
  updateService: (id: ID, partial: Partial<Service>) => Promise<void>
  removeService: (id: ID) => Promise<void>
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

const seed = buildSeed()

function initialTheme(): Theme {
  return 'system'
}

const initialThemeValue = initialTheme()
applyTheme(initialThemeValue)

function initialsOf(name: string): string {
  const parts = name.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const letters = parts.map((p) => p.charAt(0).toUpperCase()).join('')
  return letters.slice(0, 2)
}

export const useStore = create<StoreState>()((set, get) => ({
  services: seed.services,
  bookings: [],
  packages: seed.packages,
  settings: seed.settings,
  currentUser: seed.currentUser,
  authUser: null,
  loading: false,

  theme: initialThemeValue,
  sidebarCollapsed: false,
  toasts: [],

  login: async (userName, password) => {
    const user = await loginRequest(userName, password)
    set({
      authUser: user,
      currentUser: {
        name: user.userName,
        role: user.role,
        initials: initialsOf(user.userName),
      },
    })
    get().loadData().catch(() => {})
    return user
  },
  logout: async () => {
    set({ authUser: null })
    try {
      await logoutRequest()
    } catch {
      /* session already gone */
    }
  },

  validateSession: async () => {
    try {
      const user = await getMe()
      if (user) {
        set({
          authUser: user,
          currentUser: {
            name: user.userName,
            role: user.role,
            initials: initialsOf(user.userName),
          },
        })
      } else {
        set({ authUser: null })
      }
    } catch {
      set({ authUser: null })
    }
  },

  updateAccount: async (input) => {
    const user = await updateAccountApi(input)
    set({
      authUser: user,
      currentUser: {
        name: user.userName,
        role: user.role,
        initials: initialsOf(user.userName),
      },
    })
    return user
  },

  loadData: async () => {
    set({ loading: true })
    try {
      const [bookingsRes, servicesRes, settingsRes, packagesRes] = await Promise.allSettled([
        getBookings(),
        getServices(),
        getSettings(),
        getPackages(),
      ])
      const updates: Partial<StoreState> = {}
      if (bookingsRes.status === 'fulfilled') updates.bookings = bookingsRes.value
      if (servicesRes.status === 'fulfilled') updates.services = servicesRes.value
      if (settingsRes.status === 'fulfilled') updates.settings = settingsRes.value
      if (packagesRes.status === 'fulfilled') updates.packages = packagesRes.value.map(toPackage)
      set(updates)
    } finally {
      set({ loading: false })
    }
  },

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  pushToast: (toast) => {
    const id = `toast-${Math.random().toString(36).slice(2, 9)}`
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, toast.tone === 'success' ? 3200 : 5000)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  createBooking: async (input) => {
    const booking = await createBookingApi(input)
    set((s) => ({ bookings: [...s.bookings, booking].sort(byDateTime) }))
    return booking
  },

  updateBooking: async (id, input) => {
    const updated = await updateBookingApi(id, input)
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === id ? updated : b)).sort(byDateTime),
    }))
  },

  removeBooking: async (id) => {
    await deleteBookingApi(id)
    set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) }))
  },

  addPackage: async (input) => {
    const record = await createPackageApi(input as PackageApiInput)
    const pkg = toPackage(record)
    set((s) => ({ packages: [pkg, ...s.packages] }))
    return pkg
  },

  updatePackage: async (id, input) => {
    const record = await updatePackageApi(id, input)
    const updated = toPackage(record)
    set((s) => ({ packages: s.packages.map((p) => (p.id === id ? updated : p)) }))
  },

  confirmFirst: async (id) => {
    const record = await confirmFirstApi(id)
    const updated = toPackage(record)
    set((s) => ({ packages: s.packages.map((p) => (p.id === id ? updated : p)) }))
  },

  cashierConfirmFirst: async (id) => {
    const record = await cashierConfirmFirstApi(id)
    const updated = toPackage(record)
    set((s) => ({ packages: s.packages.map((p) => (p.id === id ? updated : p)) }))
  },

  confirmRemainder: async (id) => {
    const record = await confirmRemainderApi(id)
    const updated = toPackage(record)
    set((s) => ({ packages: s.packages.map((p) => (p.id === id ? updated : p)) }))
  },

  cashierConfirmRemainder: async (id) => {
    const record = await cashierConfirmRemainderApi(id)
    const updated = toPackage(record)
    set((s) => ({ packages: s.packages.map((p) => (p.id === id ? updated : p)) }))
  },

  cashierConfirmSecond: async (id) => {
    const record = await cashierConfirmSecondApi(id)
    const updated = toPackage(record)
    set((s) => ({ packages: s.packages.map((p) => (p.id === id ? updated : p)) }))
  },

  confirmSecond: async (id) => {
    const record = await confirmSecondApi(id)
    const updated = toPackage(record)
    set((s) => ({ packages: s.packages.map((p) => (p.id === id ? updated : p)) }))
  },

  updateSettings: async (partial) => {
    const saved = await updateSettingsApi(partial)
    set((s) => ({ settings: { ...s.settings, ...saved } }))
  },

  addService: async (input) => {
    const service = await createServiceApi(input)
    set((s) => ({ services: [...s.services, service] }))
    return service
  },
  updateService: async (id, partial) => {
    const service = await updateServiceApi(id, {
      name: partial.name ?? get().services.find((s) => s.id === id)?.name ?? '',
      durationMin: partial.durationMin ?? get().services.find((s) => s.id === id)?.durationMin ?? 60,
      isBirthday: partial.isBirthday,
    })
    set((s) => ({
      services: s.services.map((sv) => (sv.id === id ? service : sv)),
    }))
  },
  removeService: async (id) => {
    await deleteServiceApi(id)
    set((s) => ({ services: s.services.filter((sv) => sv.id !== id) }))
  },
}))

function byDateTime(a: Booking, b: Booking): number {
  if (a.date === b.date) return a.time.localeCompare(b.time)
  return a.date.localeCompare(b.date)
}

export function serviceById(state: Pick<StoreState, 'services'>, id: ID) {
  return state.services.find((s) => s.id === id)
}

export function serviceByName(state: Pick<StoreState, 'services'>, name: string) {
  return state.services.find((s) => s.name === name)
}

export function bookingsOnDate(state: StoreState, date: string): Booking[] {
  return state.bookings
    .filter((b) => b.date === date)
    .sort((a, b) => a.time.localeCompare(b.time))
}

export function getMaxBookingsPerSlot(settings?: StudioSettings): number {
  if (!settings) return 2
  if (settings.allowDoubleBooking === false) return 1
  return settings.cameraCount ?? 2
}

export function conflictingBookings(
  state: StoreState,
  date: string,
  start: string,
  durationMin: number,
): Booking[] {
  const end = addMinutes(start, durationMin)
  return state.bookings.filter((b) => {
    if (b.date !== date) return false
    const svc = serviceByName(state, b.event)
    const otherEnd = addMinutes(b.time, svc?.durationMin ?? 60)
    return start < otherEnd && b.time < end
  })
}

export function isSlotFree(
  state: StoreState,
  date: string,
  start: string,
  durationMin: number,
): boolean {
  const max = getMaxBookingsPerSlot(state.settings)
  return conflictingBookings(state, date, start, durationMin).length < max
}

export function occupiedSlots(state: StoreState, date: string, durationMin: number) {
  const slots: string[] = []
  const hours = state.settings.hours[0]
  if (!hours) return slots
  const open = minutesOf(hours.open)
  const close = minutesOf(hours.close)
  for (let m = open; m + durationMin <= close; m += 30) {
    const start = addMinutes('00:00', m)
    if (!isSlotFree(state, date, start, durationMin)) slots.push(start)
  }
  return slots
}
