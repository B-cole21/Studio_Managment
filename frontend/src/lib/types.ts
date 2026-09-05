export type ID = string

export interface Booking {
  id: number
  customerName: string
  event: string
  date: string
  time: string
  phone: string
  age?: number | null
}

export interface Service {
  id: string
  name: string
  durationMin: number
  isBirthday?: boolean
}

export type PaymentMethod = 'Cash' | 'Bank' | 'Telebirr'

export interface Package {
  id: ID
  name: string
  phone: string
  quantity: number | null
  frame: string
  firstPayment: number
  secondPayment: number
  secondPaymentType?: PaymentMethod | null
  remainder: number | null
  date: string
  paymentType: PaymentMethod
  fullPayment: boolean
  firstConfirmed: boolean
  firstConfirmedBy?: number | null
  firstConfirmedAt?: string | null
  firstCashierConfirmed: boolean
  firstCashierConfirmedBy?: number | null
  firstCashierConfirmedAt?: string | null
  remainderReceived: boolean
  remainderReceivedAt?: string | null
  remainderPaymentType: PaymentMethod | null
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

export interface DayHours {
  days: string[]
  open: string
  close: string
}

export interface StudioSettings {
  studioName: string
  phone: string
  address: string
  hours: DayHours[]
  backupAt: string
  allowDoubleBooking?: boolean
  cameraCount?: number
}

export type Theme = 'dark' | 'light' | 'system'
