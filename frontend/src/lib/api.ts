export interface AuthUser {
  id: number
  userName: string
  email: string | null
  role: string
}

export interface BookingInput {
  customerName: string
  event: string
  date: string
  time: string
  phone: string
  age?: number | null
}

export interface BookingRecord extends BookingInput {
  id: number
}

export interface ServiceRecord {
  id: string
  name: string
  durationMin: number
  isBirthday: boolean
}

export interface ServiceInput {
  name: string
  durationMin: number
  isBirthday?: boolean
}

export interface SettingsRecord {
  studioName: string
  phone: string
  address: string
  hours: { days: string[]; open: string; close: string }[]
  backupAt: string
  allowDoubleBooking?: boolean
  cameraCount?: number
}

const API_BASE = import.meta.env.VITE_API_URL || ''

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function loginRequest(userName: string, password: string): Promise<AuthUser> {
  return api<AuthUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userName, password }),
  })
}

export function requestOtpApi(email: string): Promise<{ message: string; otp?: string }> {
  return api<{ message: string; otp?: string }>('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function verifyOtpApi(email: string, otp: string): Promise<{ message: string }> {
  return api<{ message: string }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  })
}

export function resetPasswordWithOtpApi(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
  return api<{ message: string }>('/auth/reset-password-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  })
}

export function getMe(): Promise<AuthUser | null> {
  return api<AuthUser | null>('/auth/me')
}

export function logoutRequest(): Promise<void> {
  return api<void>('/auth/logout', { method: 'POST' })
}

export interface AccountInput {
  userName: string
  email?: string
  currentPassword: string
  newPassword?: string
}

export function updateAccountApi(input: AccountInput): Promise<AuthUser> {
  return api<AuthUser>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function getBookings(): Promise<BookingRecord[]> {
  return api<BookingRecord[]>('/booking')
}

export function createBookingApi(input: BookingInput): Promise<BookingRecord> {
  return api<BookingRecord>('/booking', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateBookingApi(id: number, input: BookingInput): Promise<BookingRecord> {
  return api<BookingRecord>(`/booking/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteBookingApi(id: number): Promise<void> {
  return api<void>(`/booking/${id}`, { method: 'DELETE' })
}

export function getServices(): Promise<ServiceRecord[]> {
  return api<ServiceRecord[]>('/services')
}

export function createServiceApi(input: ServiceInput): Promise<ServiceRecord> {
  return api<ServiceRecord>('/services', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateServiceApi(id: string, input: ServiceInput): Promise<ServiceRecord> {
  return api<ServiceRecord>(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteServiceApi(id: string): Promise<void> {
  return api<void>(`/services/${id}`, { method: 'DELETE' })
}

export function getSettings(): Promise<SettingsRecord> {
  return api<SettingsRecord>('/settings')
}

export function updateSettingsApi(input: Partial<SettingsRecord>): Promise<SettingsRecord> {
  return api<SettingsRecord>('/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export interface PackageRecord {
  id: string
  name: string
  phone: string
  quantity: number | null
  frame: string
  firstPayment: number
  secondPayment: number
  remainder: number | null
  date: string
  paymentType: 'Cash' | 'Bank'
  fullPayment: boolean
  firstConfirmed: boolean
  firstConfirmedBy?: number | null
  firstConfirmedAt?: string | null
  firstCashierConfirmed: boolean
  firstCashierConfirmedBy?: number | null
  firstCashierConfirmedAt?: string | null
  remainderReceived: boolean
  remainderReceivedAt?: string | null
  remainderPaymentType: 'Cash' | 'Bank' | null
  remainderConfirmed: boolean
  remainderConfirmedBy?: number | null
  remainderConfirmedAt?: string | null
  remainderCashierConfirmed: boolean
  remainderCashierConfirmedBy?: number | null
  remainderCashierConfirmedAt?: string | null
  secondPaymentConfirmed: boolean
  secondPaymentConfirmedBy?: number | null
  secondPaymentConfirmedAt?: string | null
  secondPaymentCashierConfirmed: boolean
  secondPaymentCashierConfirmedBy?: number | null
  secondPaymentCashierConfirmedAt?: string | null
  createdBy?: number | null
  createdByName?: string | null
  pendingSelection: boolean
}

export interface PackageInput {
  name: string
  phone: string
  quantity?: number | null
  frame?: string
  firstPayment?: number
  secondPayment?: number
  remainder?: number | null
  date?: string
  paymentType?: 'Cash' | 'Bank'
  fullPayment?: boolean
  pendingSelection?: boolean
}

export function getPackages(): Promise<PackageRecord[]> {
  return api<PackageRecord[]>('/package')
}

export function createPackageApi(input: PackageInput): Promise<PackageRecord> {
  return api<PackageRecord>('/package', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updatePackageApi(
  id: string,
  input: Partial<PackageInput> & {
    name?: string
    phone?: string
    remainderReceived?: boolean
    pendingSelection?: boolean
    remainderPaymentType?: 'Cash' | 'Bank' | null
  },
): Promise<PackageRecord> {
  return api<PackageRecord>(`/package/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function confirmFirstApi(id: string): Promise<PackageRecord> {
  return api<PackageRecord>(`/package/${id}/confirm-first`, { method: 'POST' })
}

export function cashierConfirmFirstApi(id: string): Promise<PackageRecord> {
  return api<PackageRecord>(`/package/${id}/cashier-confirm-first`, { method: 'POST' })
}

export function confirmRemainderApi(id: string): Promise<PackageRecord> {
  return api<PackageRecord>(`/package/${id}/confirm-remainder`, { method: 'POST' })
}

export function cashierConfirmRemainderApi(id: string): Promise<PackageRecord> {
  return api<PackageRecord>(`/package/${id}/cashier-confirm-remainder`, { method: 'POST' })
}

export function cashierConfirmSecondApi(id: string): Promise<PackageRecord> {
  return api<PackageRecord>(`/package/${id}/cashier-confirm-second`, { method: 'POST' })
}

export function confirmSecondApi(id: string): Promise<PackageRecord> {
  return api<PackageRecord>(`/package/${id}/confirm-second`, { method: 'POST' })
}
