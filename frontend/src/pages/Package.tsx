import { useMemo, useState } from 'react'
import {
  CalendarDays, CheckCheck, CircleCheck, FileCheck, Package as PackageIcon,
  Plus, Save, Search, SquarePen, Wallet, X,
} from 'lucide-react'
import { useStore } from '../lib/store'
import type { Package as PackageRecord, PaymentMethod } from '../lib/types'
import { formatDate, todayISO, datePartOf } from '../lib/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Dialog } from '../components/ui/Dialog'
import { Popover } from '../components/ui/Popover'
import { CalendarGrid } from '../components/ui/Calendar'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'


const paymentMethodOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank', label: 'Bank' },
  { value: 'Telebirr', label: 'Telebirr' },
]

function PaymentMethodBadge({ method }: { method?: PaymentMethod | string | null }) {
  if (!method) return null
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
        method === 'Telebirr'
          ? 'bg-info/15 text-info border-info/40'
          : method === 'Bank'
          ? 'bg-accent/15 text-accent border-accent/40'
          : 'bg-surface-3 text-text-secondary border-border-subtle'
      }`}
    >
      {method}
    </span>
  )
}

interface PackageDraft {
  name: string
  phone: string
  quantity: string
  frame: string
  firstPayment: string
  secondPayment: string
  remainder: string
  date: string
  paymentType: PaymentMethod
  secondPaymentType: PaymentMethod
  remainderPaymentType: PaymentMethod
  fullPayment: boolean
  pendingSelection: boolean
}

const emptyDraft = (): PackageDraft => ({
  name: '',
  phone: '',
  quantity: '1',
  frame: '',
  firstPayment: '',
  secondPayment: '',
  remainder: '',
  date: todayISO(),
  paymentType: 'Cash',
  secondPaymentType: 'Cash',
  remainderPaymentType: 'Cash',
  fullPayment: false,
  pendingSelection: false,
})

interface CompleteDraft {
  quantity: string
  frame: string
  secondPayment: string
  secondPaymentType: PaymentMethod
  remainder: string
  remainderPaymentType: PaymentMethod
  date: string
  paymentType: PaymentMethod
  fullPayment: boolean
  remainderReceived: boolean
}

const emptyCompleteDraft = (pkg: PackageRecord): CompleteDraft => ({
  quantity: String(pkg.quantity ?? 1),
  frame: pkg.frame ?? '',
  secondPayment: '',
  secondPaymentType: (pkg.secondPaymentType as PaymentMethod) || 'Cash',
  remainder: pkg.remainder != null ? String(pkg.remainder) : '',
  remainderPaymentType: (pkg.remainderPaymentType as PaymentMethod) || 'Cash',
  date: pkg.date || todayISO(),
  paymentType: (pkg.paymentType as PaymentMethod) || 'Cash',
  fullPayment: pkg.fullPayment,
  remainderReceived: false,
})

const initialCompleteDraft = (): CompleteDraft => ({
  quantity: '1',
  frame: '',
  secondPayment: '',
  secondPaymentType: 'Cash',
  remainder: '',
  remainderPaymentType: 'Cash',
  date: todayISO(),
  paymentType: 'Cash',
  fullPayment: false,
  remainderReceived: false,
})

const fmt = (n: number | null | undefined) => (n != null ? n.toLocaleString('en-US') : '—')

function statusOf(pkg: PackageRecord): { label: string; tone: BadgeTone } {
  if (pkg.pendingSelection) return { label: 'Awaiting selection', tone: 'warning' }

  const firstDone = pkg.firstConfirmed
  const secondDone = pkg.secondPayment <= 0 || pkg.secondPaymentConfirmed
  const remainderDone = (pkg.remainder ?? 0) <= 0 || pkg.remainderConfirmed

  if (firstDone && secondDone && remainderDone) {
    return { label: 'Paid', tone: 'paid' }
  }

  const isFirstCash = pkg.paymentType === 'Cash'
  const isSecondCash = (pkg.secondPaymentType || pkg.paymentType) === 'Cash'
  const effRemainderType = pkg.remainderPaymentType || pkg.paymentType || 'Cash'
  const isRemainderCash = effRemainderType === 'Cash'

  if (pkg.fullPayment) {
    if (firstDone && secondDone && remainderDone) return { label: 'Paid', tone: 'paid' }
    if (isFirstCash && !pkg.firstCashierConfirmed) return { label: 'Full payment · awaiting cashier', tone: 'warning' }
    return { label: 'Full payment · awaiting owner', tone: 'info' }
  }

  if (!pkg.firstConfirmed) {
    if (isFirstCash && !pkg.firstCashierConfirmed) return { label: 'Awaiting cashier confirmation', tone: 'warning' }
    return { label: 'Awaiting owner confirmation', tone: 'info' }
  }

  if (pkg.secondPayment > 0 && !pkg.secondPaymentConfirmed) {
    if (isSecondCash && !pkg.secondPaymentCashierConfirmed) return { label: 'Second payment · awaiting cashier', tone: 'warning' }
    return { label: 'Second payment · awaiting owner', tone: 'info' }
  }

  if ((pkg.remainder ?? 0) > 0 && !pkg.remainderConfirmed) {
    if (pkg.remainderReceived && isRemainderCash && !pkg.remainderCashierConfirmed) return { label: 'Remainder received · awaiting cashier', tone: 'warning' }
    if (pkg.remainderReceived) return { label: 'Remainder · awaiting owner', tone: 'info' }
    return { label: 'Remainder pending', tone: 'warning' }
  }

  return { label: 'Awaiting owner confirmation', tone: 'info' }
}

export function PackagePage() {
  const packages = useStore((s) => s.packages)
  const currentUser = useStore((s) => s.currentUser)
  const authUser = useStore((s) => s.authUser)
  const role = authUser?.role ?? currentUser.role
  const addPackage = useStore((s) => s.addPackage)
  const updatePackage = useStore((s) => s.updatePackage)
  const confirmFirst = useStore((s) => s.confirmFirst)
  const cashierConfirmFirst = useStore((s) => s.cashierConfirmFirst)
  const confirmRemainder = useStore((s) => s.confirmRemainder)
  const cashierConfirmRemainder = useStore((s) => s.cashierConfirmRemainder)
  const cashierConfirmSecond = useStore((s) => s.cashierConfirmSecond)
  const confirmSecond = useStore((s) => s.confirmSecond)
  const pushToast = useStore((s) => s.pushToast)

  const isOwner = role === 'owner'
  const isCashier = role === 'cashier'
  const isCameraman = role === 'cameraman'
  const canAddPackage = isCashier || isCameraman || isOwner
  const canRecordRemainder = isCashier || isCameraman || isOwner
  const canEditPackage = isCashier || isOwner || isCameraman

  const [filter, setFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState<PackageDraft>(emptyDraft)


  const [remainderTarget, setRemainderTarget] = useState<PackageRecord | null>(null)
  const [remainderValue, setRemainderValue] = useState('')
  const [remainderReceived, setRemainderReceived] = useState(false)
  const [remainderPaymentType, setRemainderPaymentType] = useState<PaymentMethod>('Cash')

  const [confirmFirstTarget, setConfirmFirstTarget] = useState<PackageRecord | null>(null)
  const [confirmRemainderTarget, setConfirmRemainderTarget] = useState<PackageRecord | null>(null)
  const [cashierConfirmFirstTarget, setCashierConfirmFirstTarget] = useState<PackageRecord | null>(null)
  const [cashierConfirmRemainderTarget, setCashierConfirmRemainderTarget] = useState<PackageRecord | null>(null)
  const [confirmSecondTarget, setConfirmSecondTarget] = useState<PackageRecord | null>(null)
  const [cashierConfirmSecondTarget, setCashierConfirmSecondTarget] = useState<PackageRecord | null>(null)

  const [completeTarget, setCompleteTarget] = useState<PackageRecord | null>(null)
  const [completeDraft, setCompleteDraft] = useState<CompleteDraft>(initialCompleteDraft)

  const [editPackageTarget, setEditPackageTarget] = useState<PackageRecord | null>(null)
  const [editPackageDraft, setEditPackageDraft] = useState<PackageDraft>(emptyDraft())

  const [busy, setBusy] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [search, setSearch] = useState('')



  const list = useMemo(() => {
    const today = todayISO()
    const sameDay = (t?: string | null) => (t ? datePartOf(t) === today : false)
    const query = search.trim().toLowerCase()
    return packages
      .filter((p) => {
        if (query && !(p.name.toLowerCase().includes(query) || (p.phone ?? '').includes(query))) return false
        if (dateFilter && p.date !== dateFilter) return false
        switch (filter) {
          case 'all':
            return true
          case 'pending':
            return !p.firstConfirmed || (p.secondPayment > 0 && !p.secondPaymentConfirmed) || ((p.remainder ?? 0) > 0 && !p.remainderConfirmed)
          case 'selection':
            return p.pendingSelection
          case 'remainder':
            return !p.fullPayment && (p.remainder ?? 0) > 0 && !p.remainderConfirmed
          case 'paid':
            return p.firstConfirmed && (p.fullPayment || ((p.secondPayment <= 0 || p.secondPaymentConfirmed) && (p.remainderConfirmed || (p.remainder ?? 0) <= 0)))
          case 'today':
            return sameDay(p.firstConfirmedAt) || sameDay(p.remainderReceivedAt) || sameDay(p.remainderConfirmedAt)
          default:
            return true
        }
      })
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.name.localeCompare(b.name))
  }, [packages, filter, dateFilter, search])

  const phoneDigits = draft.phone.replace(/\D/g, '')
  const phoneValid = /^09\d{8}$/.test(phoneDigits)
  const quantityNum = Number(draft.quantity)
  const firstNum = Number(draft.firstPayment)
  const remainderNum = Number(draft.remainder)
  const draftValid = draft.pendingSelection
    ? Boolean(draft.name.trim()) && phoneValid && firstNum >= 0 && draft.firstPayment.trim() !== '' && Boolean(draft.date)
    : Boolean(draft.name.trim()) &&
    phoneValid &&
    quantityNum > 0 &&
    draft.quantity.trim() !== '' &&
    firstNum >= 0 &&
    draft.firstPayment.trim() !== '' &&
    (draft.fullPayment || (remainderNum >= 0 && draft.remainder.trim() !== '')) &&
    Boolean(draft.date)

  const submit = async () => {
    if (!draftValid || busy) return

    const normalizedName = draft.name.trim().toLowerCase()
    const existing = packages.find(
      (p) => p.name.trim().toLowerCase() === normalizedName && p.phone === phoneDigits && (draft.date ? p.date === draft.date : true)
    )
    if (existing) {
      pushToast({
        tone: 'error',
        title: 'Data is already present',
        message: `Package for "${draft.name.trim()}" with phone ${phoneDigits} already exists! Duplicate entry blocked.`,
      })
      return
    }

    setBusy(true)
    try {
      await addPackage({
        name: draft.name.trim(),
        phone: phoneDigits,
        quantity: draft.pendingSelection ? undefined : quantityNum,
        frame: draft.frame.trim(),
        firstPayment: firstNum,
        secondPayment: 0,
        secondPaymentType: 'Cash',
        remainder: draft.pendingSelection ? undefined : (draft.fullPayment ? 0 : remainderNum),
        remainderPaymentType: draft.fullPayment ? null : draft.remainderPaymentType,
        date: draft.date,
        paymentType: draft.paymentType,
        fullPayment: draft.pendingSelection ? false : draft.fullPayment,
        pendingSelection: draft.pendingSelection,
      })
      pushToast({
        tone: 'success',
        title: draft.pendingSelection ? 'Package saved — awaiting photo selection' : (draft.fullPayment ? 'Full payment package added' : 'Package added'),
        message: `${draft.name.trim()} · ${fmt(firstNum)}`,
      })
      setDraft(emptyDraft())
      setAddOpen(false)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not add package',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }



  const openRemainder = (pkg: PackageRecord) => {
    setRemainderTarget(pkg)
    setRemainderValue(String(pkg.remainder))
    setRemainderReceived(pkg.remainderReceived)
    setRemainderPaymentType((pkg.remainderPaymentType as PaymentMethod) ?? (pkg.paymentType as PaymentMethod) ?? 'Cash')
  }

  const saveRemainder = async () => {
    if (!remainderTarget) return
    const value = Number(remainderValue)
    if (value < 0 || remainderValue.trim() === '') return
    const target = remainderTarget
    const rec = remainderReceived
    const pType = remainderPaymentType
    setRemainderTarget(null)
    setBusy(true)
    try {
      await updatePackage(target.id, {
        remainder: value,
        remainderReceived: rec,
        remainderPaymentType: rec ? pType : null,
      })
      pushToast({
        tone: 'success',
        title: rec ? 'Remainder payment recorded' : 'Remainder updated',
        message: `${target.name} · ${fmt(value)}`,
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not update remainder',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  const doConfirmFirst = async () => {
    if (!confirmFirstTarget) return
    const target = confirmFirstTarget
    setConfirmFirstTarget(null)
    setBusy(true)
    try {
      await confirmFirst(target.id)
      pushToast({
        tone: 'success',
        title: 'First payment confirmed',
        message: `${target.name} · ${fmt(target.firstPayment)} received`,
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  const doConfirmRemainder = async () => {
    if (!confirmRemainderTarget) return
    const target = confirmRemainderTarget
    setConfirmRemainderTarget(null)
    setBusy(true)
    try {
      await confirmRemainder(target.id)
      pushToast({
        tone: 'success',
        title: 'Remainder payment confirmed',
        message: `${target.name} · fully paid`,
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  const doCashierConfirmFirst = async () => {
    if (!cashierConfirmFirstTarget) return
    const target = cashierConfirmFirstTarget
    setCashierConfirmFirstTarget(null)
    setBusy(true)
    try {
      await cashierConfirmFirst(target.id)
      pushToast({
        tone: 'success',
        title: 'First payment confirmed',
        message: `${target.name} · ${fmt(target.firstPayment)} received`,
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  const doCashierConfirmRemainder = async () => {
    if (!cashierConfirmRemainderTarget) return
    const target = cashierConfirmRemainderTarget
    setCashierConfirmRemainderTarget(null)
    setBusy(true)
    try {
      await cashierConfirmRemainder(target.id)
      pushToast({
        tone: 'success',
        title: 'Remainder payment confirmed',
        message: `${target.name} · ${fmt(target.remainder)} received`,
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  const doCashierConfirmSecond = async () => {
    if (!cashierConfirmSecondTarget) return
    const target = cashierConfirmSecondTarget
    setCashierConfirmSecondTarget(null)
    setBusy(true)
    try {
      await cashierConfirmSecond(target.id)
      pushToast({
        tone: 'success',
        title: 'Second payment confirmed',
        message: `${target.name} · ${fmt(target.secondPayment)} received`,
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  const doConfirmSecond = async () => {
    if (!confirmSecondTarget) return
    const target = confirmSecondTarget
    setConfirmSecondTarget(null)
    setBusy(true)
    try {
      await confirmSecond(target.id)
      pushToast({
        tone: 'success',
        title: 'Second payment confirmed',
        message: `${target.name} · ${fmt(target.secondPayment)} received`,
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  const openComplete = (pkg: PackageRecord) => {
    setCompleteTarget(pkg)
    setCompleteDraft(emptyCompleteDraft(pkg))
  }

  const saveComplete = async () => {
    if (!completeTarget) return
    const qty = Number(completeDraft.quantity)
    const rest = Number(completeDraft.remainder)
    const second = Number(completeDraft.secondPayment || 0)
    if (qty <= 0 || completeDraft.quantity.trim() === '') return
    if (!completeDraft.fullPayment && (rest < 0 || completeDraft.remainder.trim() === '')) return
    if (second < 0) return
    const target = completeTarget
    const payload = {
      quantity: qty,
      frame: completeDraft.frame.trim(),
      secondPayment: second,
      secondPaymentType: completeDraft.secondPaymentType,
      remainder: completeDraft.fullPayment ? 0 : rest,
      remainderPaymentType: completeDraft.fullPayment ? null : completeDraft.remainderPaymentType,
      date: completeDraft.date,
      paymentType: completeDraft.paymentType,
      fullPayment: completeDraft.fullPayment,
      remainderReceived: completeDraft.remainderReceived,
      pendingSelection: false,
    }
    setCompleteTarget(null)
    setBusy(true)
    try {
      await updatePackage(target.id, payload)
      pushToast({
        tone: 'success',
        title: 'Package completed',
        message: `${target.name} · ${qty} photos` + (second > 0 ? ` · +${fmt(second)}` : ''),
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not complete package',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  const openEditPackage = (pkg: PackageRecord) => {
    setEditPackageTarget(pkg)
    setEditPackageDraft({
      name: pkg.name,
      phone: pkg.phone ?? '',
      quantity: pkg.quantity != null ? String(pkg.quantity) : '1',
      frame: pkg.frame ?? '',
      firstPayment: String(pkg.firstPayment ?? 0),
      secondPayment: String(pkg.secondPayment ?? 0),
      remainder: pkg.remainder != null ? String(pkg.remainder) : '0',
      date: pkg.date || todayISO(),
      paymentType: (pkg.paymentType as PaymentMethod) || 'Cash',
      secondPaymentType: (pkg.secondPaymentType as PaymentMethod) || 'Cash',
      remainderPaymentType: (pkg.remainderPaymentType as PaymentMethod) || 'Cash',
      fullPayment: pkg.fullPayment,
      pendingSelection: pkg.pendingSelection,
    })
  }

  const submitEditPackage = async () => {
    if (!editPackageTarget) return
    const target = editPackageTarget
    const phoneDigits = editPackageDraft.phone.replace(/\D/g, '')
    const payload = {
      name: editPackageDraft.name.trim(),
      phone: phoneDigits,
      date: editPackageDraft.date,
      quantity: editPackageDraft.pendingSelection ? undefined : Number(editPackageDraft.quantity || 1),
      frame: editPackageDraft.frame.trim(),
      firstPayment: Number(editPackageDraft.firstPayment || 0),
      secondPayment: Number(editPackageDraft.secondPayment || 0),
      remainder: editPackageDraft.fullPayment ? 0 : Number(editPackageDraft.remainder || 0),
      paymentType: editPackageDraft.paymentType,
      secondPaymentType: editPackageDraft.secondPaymentType,
      remainderPaymentType: editPackageDraft.fullPayment ? null : editPackageDraft.remainderPaymentType,
      fullPayment: editPackageDraft.fullPayment,
      pendingSelection: editPackageDraft.pendingSelection,
    }
    setEditPackageTarget(null)
    setBusy(true)
    try {
      await updatePackage(target.id, payload)
      pushToast({
        tone: 'success',
        title: 'Package updated',
        message: `Saved changes for ${editPackageDraft.name}`,
      })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not update package',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Offers"
        title="Package"
        description={isOwner ? 'Confirm package orders and payments' : 'Record and track package orders'}
        actions={
          canAddPackage ? (
            <Button icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Add package
            </Button>
          ) : undefined
        }
      />

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border-subtle p-4 sm:px-5 sm:py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Package orders</h2>
            <p className="text-[13px] text-text-muted">
              {list.length === 0 ? 'No packages' : `${list.length} ${list.length === 1 ? 'package' : 'packages'}`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-56">
              <Input
                label="Search"
                placeholder="Name or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={15} />}
              />
            </div>
            <div className="w-full sm:w-52">
              <Select
                label="Filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'selection', label: 'Awaiting selection' },
                  { value: 'remainder', label: 'Unpaid remainder' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'today', label: 'Received today' },
                ]}
              />
            </div>
            <div className="w-full sm:w-48">
              <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Date</span>
              <Popover
                align="start"
                trigger={(toggle) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className="flex h-9 w-full items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3 text-left text-sm text-text-primary transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
                  >
                    <CalendarDays size={15} className="shrink-0 text-text-muted" />
                    <span className="flex-1 truncate">{dateFilter ? formatDate(dateFilter) : 'All dates'}</span>
                    {dateFilter && (
                      <span
                        role="button"
                        aria-label="Clear date filter"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDateFilter('')
                        }}
                        className="shrink-0 text-text-muted hover:text-text-primary"
                      >
                        <X size={14} />
                      </span>
                    )}
                  </button>
                )}
              >
                {(close) => (
                  <div className="p-2">
                    <CalendarGrid
                      value={dateFilter || todayISO()}
                      onChange={(d) => {
                        setDateFilter(d)
                        close()
                      }}
                    />
                  </div>
                )}
              </Popover>
            </div>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            compact
            icon={<PackageIcon size={18} />}
            title="No packages"
            message="Add a package order and it will appear here."
            action={
              canAddPackage ? (
                <Button icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
                  Add package
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Mobile Card List View (< md) */}
            <div className="flex flex-col divide-y divide-border-subtle md:hidden">
              {list.map((pkg) => {
                const status = statusOf(pkg)
                const total = pkg.firstPayment + pkg.secondPayment + (pkg.remainder ?? 0)
                const isFullyPaid = (pkg.fullPayment && pkg.firstConfirmed) || (pkg.remainderConfirmed && (pkg.secondPayment <= 0 || pkg.secondPaymentConfirmed))
                const isFirstCash = pkg.paymentType === 'Cash'
                const isSecondCash = (pkg.secondPaymentType || pkg.paymentType) === 'Cash'
                const effRemainderType = pkg.remainderPaymentType || pkg.paymentType || 'Cash'
                const isRemainderCash = effRemainderType === 'Cash'

                return (
                  <div key={pkg.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-3/50">
                    {/* Top Row: Name, Phone & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-text-primary">{pkg.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                          {pkg.phone ? (
                            <a href={`tel:${pkg.phone}`} className="hover:text-accent hover:underline">
                              {pkg.phone}
                            </a>
                          ) : (
                            <span>No phone</span>
                          )}
                          {pkg.date && (
                            <>
                              <span>•</span>
                              <span>{formatDate(pkg.date, { short: true })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge tone={status.tone} className="shrink-0 text-[11px]">
                        {status.label}
                      </Badge>
                    </div>

                    {/* Middle Row: Quantity & Frame info */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary bg-surface-1/60 rounded-lg p-2.5 border border-border-subtle/50">
                      <div>
                        <span className="text-text-muted">Qty:</span>{' '}
                        <span className="font-medium text-text-primary">{pkg.quantity != null ? pkg.quantity : '—'}</span>
                      </div>
                      <span className="text-border-strong">•</span>
                      <div className="truncate flex-1">
                        <span className="text-text-muted">Frame:</span>{' '}
                        <span className="font-medium text-text-primary">{pkg.frame ? pkg.frame : 'None'}</span>
                      </div>
                      <span className="text-border-strong">•</span>
                      <div>
                        <span className="text-text-muted">Total:</span>{' '}
                        <span className="font-bold text-accent">{fmt(total)}</span>
                      </div>
                    </div>

                    {/* Payment Breakdown Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {/* First Payment */}
                      <div className="rounded-md border border-border-subtle bg-surface-1 p-2">
                        <div className="flex items-center justify-between text-[11px] text-text-muted">
                          <div className="flex items-center gap-1.5">
                            <span>1st</span>
                            <PaymentMethodBadge method={pkg.paymentType} />
                          </div>
                          <span className="font-semibold text-text-primary">{fmt(pkg.firstPayment)}</span>
                        </div>
                        {!isFullyPaid && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {isFirstCash && (
                              pkg.firstCashierConfirmed
                                ? <Badge tone="paid" className="text-[9px] px-1 py-0">Cashier ✓</Badge>
                                : <Badge tone="warning" className="text-[9px] px-1 py-0">Cashier pending</Badge>
                            )}
                            {pkg.firstConfirmed
                              ? <Badge tone="paid" className="text-[9px] px-1 py-0">Owner ✓</Badge>
                              : <Badge tone="neutral" className="text-[9px] px-1 py-0">Owner pending</Badge>}
                          </div>
                        )}
                      </div>

                      {/* Second Payment if exists */}
                      {pkg.secondPayment > 0 && (
                        <div className="rounded-md border border-border-subtle bg-surface-1 p-2">
                          <div className="flex items-center justify-between text-[11px] text-text-muted">
                            <div className="flex items-center gap-1.5">
                              <span>2nd</span>
                              <PaymentMethodBadge method={pkg.secondPaymentType || pkg.paymentType} />
                            </div>
                            <span className="font-semibold text-text-primary">{fmt(pkg.secondPayment)}</span>
                          </div>
                          {!isFullyPaid && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {isSecondCash && (
                                pkg.secondPaymentCashierConfirmed
                                  ? <Badge tone="paid" className="text-[9px] px-1 py-0">Cashier ✓</Badge>
                                  : <Badge tone="warning" className="text-[9px] px-1 py-0">Cashier pending</Badge>
                              )}
                              {pkg.secondPaymentConfirmed
                                ? <Badge tone="paid" className="text-[9px] px-1 py-0">Owner ✓</Badge>
                                : <Badge tone="neutral" className="text-[9px] px-1 py-0">Owner pending</Badge>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remainder */}
                      {!pkg.fullPayment && (
                        <div className="rounded-md border border-border-subtle bg-surface-1 p-2">
                          <div className="flex items-center justify-between text-[11px] text-text-muted">
                            <div className="flex items-center gap-1.5">
                              <span>Remainder</span>
                              <PaymentMethodBadge method={pkg.remainderPaymentType || pkg.paymentType} />
                            </div>
                            <span className="font-semibold text-text-primary">{fmt(pkg.remainder)}</span>
                          </div>
                          {!isFullyPaid && (pkg.remainder ?? 0) > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {pkg.remainderReceived ? (
                                isRemainderCash ? (
                                  pkg.remainderCashierConfirmed
                                    ? <Badge tone="paid" className="text-[9px] px-1 py-0">Cashier ✓</Badge>
                                    : <Badge tone="warning" className="text-[9px] px-1 py-0">Cashier pending</Badge>
                                ) : null
                              ) : (
                                <Badge tone="neutral" className="text-[9px] px-1 py-0">Not received</Badge>
                              )}
                              {pkg.remainderConfirmed
                                ? <Badge tone="paid" className="text-[9px] px-1 py-0">Owner ✓</Badge>
                                : <Badge tone="neutral" className="text-[9px] px-1 py-0">Owner pending</Badge>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mobile Action Buttons Bar */}
                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-border-subtle/50">
                      {canAddPackage && pkg.pendingSelection && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<FileCheck size={14} className="text-success" />}
                          onClick={() => openComplete(pkg)}
                        >
                          Complete package
                        </Button>
                      )}
                      {isCashier && isFirstCash && !pkg.firstCashierConfirmed && !pkg.firstConfirmed && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<CheckCheck size={14} className="text-info" />}
                          onClick={() => setCashierConfirmFirstTarget(pkg)}
                        >
                          Cashier 1st ✓
                        </Button>
                      )}
                      {isOwner && (isFirstCash ? pkg.firstCashierConfirmed : true) && !pkg.firstConfirmed && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<CheckCheck size={14} />}
                          onClick={() => setConfirmFirstTarget(pkg)}
                        >
                          Confirm 1st
                        </Button>
                      )}
                      {isCashier && !pkg.fullPayment && pkg.remainderReceived && isRemainderCash && !pkg.remainderCashierConfirmed && !pkg.remainderConfirmed && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<CheckCheck size={14} className="text-info" />}
                          onClick={() => setCashierConfirmRemainderTarget(pkg)}
                        >
                          Cashier Remainder ✓
                        </Button>
                      )}
                      {isOwner && !pkg.fullPayment && pkg.remainderReceived && (isRemainderCash ? pkg.remainderCashierConfirmed : true) && !pkg.remainderConfirmed && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<Wallet size={14} />}
                          onClick={() => setConfirmRemainderTarget(pkg)}
                        >
                          Confirm Remainder
                        </Button>
                      )}
                      {isCashier && pkg.secondPayment > 0 && isSecondCash && !pkg.secondPaymentCashierConfirmed && !pkg.secondPaymentConfirmed && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<CheckCheck size={14} className="text-info" />}
                          onClick={() => setCashierConfirmSecondTarget(pkg)}
                        >
                          Cashier 2nd ✓
                        </Button>
                      )}
                      {isOwner && pkg.secondPayment > 0 && (isSecondCash ? pkg.secondPaymentCashierConfirmed : true) && !pkg.secondPaymentConfirmed && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<Wallet size={14} />}
                          onClick={() => setConfirmSecondTarget(pkg)}
                        >
                          Confirm 2nd
                        </Button>
                      )}
                      {canRecordRemainder && !pkg.fullPayment && (pkg.remainder ?? 0) > 0 && !pkg.remainderConfirmed && !pkg.remainderReceived && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Wallet size={14} className="text-warning" />}
                          onClick={() => openRemainder(pkg)}
                        >
                          Record remainder
                        </Button>
                      )}
                      {canEditPackage && (
                        <IconButton
                          label={`Edit package details for ${pkg.name}`}
                          icon={<SquarePen size={15} className="text-accent" />}
                          onClick={() => openEditPackage(pkg)}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead>
                  <tr className="border-b border-border-subtle text-[11px] uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 font-medium">Frame</th>
                    <th className="px-4 py-3 font-medium">First payment</th>
                    <th className="px-4 py-3 font-medium">Second payment</th>
                    <th className="px-4 py-3 font-medium">Remainder</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((pkg) => {
                    const status = statusOf(pkg)
                    const total = pkg.firstPayment + pkg.secondPayment + (pkg.remainder ?? 0)
                    const isFullyPaid = (pkg.fullPayment && pkg.firstConfirmed) || (pkg.remainderConfirmed && (pkg.secondPayment <= 0 || pkg.secondPaymentConfirmed))
                    const isFirstCash = pkg.paymentType === 'Cash'
                    const isSecondCash = (pkg.secondPaymentType || pkg.paymentType) === 'Cash'
                    const effRemainderType = pkg.remainderPaymentType || pkg.paymentType || 'Cash'
                    const isRemainderCash = effRemainderType === 'Cash'
                    return (
                      <tr key={pkg.id} className="border-b border-border-subtle/60 last:border-b-0">
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="text-xs font-medium text-text-primary">{pkg.name}</p>
                          <p className="text-[11px] text-text-muted">{pkg.phone ? pkg.phone : '—'}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular text-text-primary">
                          {pkg.quantity != null ? pkg.quantity : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-text-primary">
                          {pkg.frame ? pkg.frame : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular text-text-primary">
                          <div className="flex items-center gap-1.5">
                            <span>{fmt(pkg.firstPayment)}</span>
                            <PaymentMethodBadge method={pkg.paymentType} />
                          </div>
                          {!isFullyPaid && (
                            <div className="flex items-center gap-1 mt-1">
                              {isFirstCash && (
                                pkg.firstCashierConfirmed
                                  ? <Badge tone="paid" className="text-[9px] px-1 py-0">Cashier ✓</Badge>
                                  : <Badge tone="warning" className="text-[9px] px-1 py-0">Cashier pending</Badge>
                              )}
                              {pkg.firstConfirmed
                                ? <Badge tone="paid" className="text-[9px] px-1 py-0">Owner ✓</Badge>
                                : <Badge tone="neutral" className="text-[9px] px-1 py-0">Owner pending</Badge>}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular text-text-secondary">
                          {pkg.secondPayment > 0 ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span>{fmt(pkg.secondPayment)}</span>
                                <PaymentMethodBadge method={pkg.secondPaymentType || pkg.paymentType} />
                              </div>
                              {!isFullyPaid && (
                                <div className="flex items-center gap-1 mt-1">
                                  {isSecondCash && (
                                    pkg.secondPaymentCashierConfirmed
                                      ? <Badge tone="paid" className="text-[9px] px-1 py-0">Cashier ✓</Badge>
                                      : <Badge tone="warning" className="text-[9px] px-1 py-0">Cashier pending</Badge>
                                  )}
                                  {pkg.secondPaymentConfirmed
                                    ? <Badge tone="paid" className="text-[9px] px-1 py-0">Owner ✓</Badge>
                                    : <Badge tone="neutral" className="text-[9px] px-1 py-0">Owner pending</Badge>}
                                </div>
                              )}
                            </>
                          ) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular text-text-secondary">
                          {pkg.fullPayment ? '—' : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span>{fmt(pkg.remainder)}</span>
                                <PaymentMethodBadge method={pkg.remainderPaymentType || pkg.paymentType} />
                              </div>
                              {!isFullyPaid && !pkg.fullPayment && (pkg.remainder ?? 0) > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  {pkg.remainderReceived ? (
                                    isRemainderCash ? (
                                      pkg.remainderCashierConfirmed
                                        ? <Badge tone="paid" className="text-[9px] px-1 py-0">Cashier ✓</Badge>
                                        : <Badge tone="warning" className="text-[9px] px-1 py-0">Cashier pending</Badge>
                                    ) : null
                                  ) : (
                                    <Badge tone="neutral" className="text-[9px] px-1 py-0">Not received</Badge>
                                  )}
                                  {pkg.remainderConfirmed
                                    ? <Badge tone="paid" className="text-[9px] px-1 py-0">Owner ✓</Badge>
                                    : <Badge tone="neutral" className="text-[9px] px-1 py-0">Owner pending</Badge>}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular text-text-primary">
                          {fmt(total)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canAddPackage && pkg.pendingSelection && (
                              <IconButton
                                label={`Complete package for ${pkg.name}`}
                                icon={<FileCheck size={15} className="text-success" />}
                                onClick={() => openComplete(pkg)}
                              />
                            )}
                            {isCashier && isFirstCash && !pkg.firstCashierConfirmed && !pkg.firstConfirmed && (
                              <IconButton
                                label={`Confirm received first payment from cameraman for ${pkg.name}`}
                                icon={<CheckCheck size={15} className="text-info" />}
                                onClick={() => setCashierConfirmFirstTarget(pkg)}
                              />
                            )}
                            {isOwner && (isFirstCash ? pkg.firstCashierConfirmed : true) && !pkg.firstConfirmed && (
                              <IconButton
                                label={`Confirm first payment of ${pkg.name}`}
                                icon={<CheckCheck size={15} className="text-info" />}
                                onClick={() => setConfirmFirstTarget(pkg)}
                              />
                            )}
                            {isCashier && !pkg.fullPayment && pkg.remainderReceived && isRemainderCash && !pkg.remainderCashierConfirmed && !pkg.remainderConfirmed && (
                              <IconButton
                                label={`Confirm received remainder from cameraman for ${pkg.name}`}
                                icon={<CheckCheck size={15} className="text-info" />}
                                onClick={() => setCashierConfirmRemainderTarget(pkg)}
                              />
                            )}
                            {isOwner && !pkg.fullPayment && pkg.remainderReceived && (isRemainderCash ? pkg.remainderCashierConfirmed : true) && !pkg.remainderConfirmed && (
                              <IconButton
                                label={`Confirm remainder payment of ${pkg.name}`}
                                icon={<Wallet size={15} className="text-warning" />}
                                onClick={() => setConfirmRemainderTarget(pkg)}
                              />
                            )}
                            {isCashier && pkg.secondPayment > 0 && isSecondCash && !pkg.secondPaymentCashierConfirmed && !pkg.secondPaymentConfirmed && (
                              <IconButton
                                label={`Confirm received second payment from cameraman for ${pkg.name}`}
                                icon={<CheckCheck size={15} className="text-info" />}
                                onClick={() => setCashierConfirmSecondTarget(pkg)}
                              />
                            )}
                            {isOwner && pkg.secondPayment > 0 && (isSecondCash ? pkg.secondPaymentCashierConfirmed : true) && !pkg.secondPaymentConfirmed && (
                              <IconButton
                                label={`Confirm second payment of ${pkg.name}`}
                                icon={<Wallet size={15} className="text-warning" />}
                                onClick={() => setConfirmSecondTarget(pkg)}
                              />
                            )}
                            {canRecordRemainder && !pkg.fullPayment && (pkg.remainder ?? 0) > 0 && !pkg.remainderConfirmed && !pkg.remainderReceived && (
                              <IconButton
                                label={`Record remainder payment for ${pkg.name}`}
                                icon={<Wallet size={15} className="text-warning" />}
                                onClick={() => openRemainder(pkg)}
                              />
                            )}
                            {canEditPackage && (
                              <IconButton
                                label={`Edit package details for ${pkg.name}`}
                                icon={<SquarePen size={15} className="text-accent" />}
                                onClick={() => openEditPackage(pkg)}
                              />
                            )}
                          </div>
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

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add package"
        description="Record a package order and its payments"
        icon={<PackageIcon size={18} />}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button icon={<Plus size={15} />} loading={busy} disabled={!draftValid || busy} onClick={submit}>Add package</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pt-1">
          {/* Order Date Bar */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-surface-1/50 px-3.5 py-2.5">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-text-primary">Order date</span>
              <span className="text-xs text-text-muted">Ethiopian calendar</span>
            </div>
            <Popover
              align="end"
              trigger={(toggle) => (
                <button
                  type="button"
                  onClick={toggle}
                  className="flex h-9 items-center gap-2.5 rounded-md border border-border-strong bg-surface-2 px-3.5 text-left text-sm font-medium text-text-primary transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
                >
                  <CalendarDays size={15} className="text-text-muted shrink-0" />
                  <span className="whitespace-nowrap">{formatDate(draft.date)}</span>
                </button>
              )}
            >
              {(close) => (
                <div className="p-2">
                  <CalendarGrid
                    value={draft.date}
                    onChange={(d) => {
                      setDraft({ ...draft, date: d })
                      close()
                    }}
                  />
                </div>
              )}
            </Popover>
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
            <input
              type="checkbox"
              checked={draft.pendingSelection}
              onChange={(e) =>
                setDraft({ ...draft, pendingSelection: e.target.checked })
              }
              className="h-4 w-4 rounded border-border-strong accent-accent"
            />
            Customer has not selected photos yet — save for later
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Customer name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Customer name" />
            <Input
              label="Phone number"
              type="tel"
              maxLength={10}
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="09 123 456 78"
              error={draft.phone.length > 0 && !phoneValid ? 'Must start with 09 followed by 8 digits' : undefined}
            />
            {!draft.pendingSelection && (
              <>
                <Input label="Quantity" type="number" min={1} value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />
                <Input label="Frame details" value={draft.frame} onChange={(e) => setDraft({ ...draft, frame: e.target.value })} placeholder="e.g. Wood frame or 20x30" />
              </>
            )}
          </div>

          {/* Per-Tier Payments Breakdown */}
          {draft.pendingSelection ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-1/40 p-3.5">
              <span className="text-xs font-semibold text-text-secondary">First payment deposit</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="First payment" type="number" min={0} value={draft.firstPayment} onChange={(e) => setDraft({ ...draft, firstPayment: e.target.value })} />
                <Select
                  label="Payment method"
                  value={draft.paymentType}
                  onChange={(e) => setDraft({ ...draft, paymentType: e.target.value as PaymentMethod })}
                  options={paymentMethodOptions}
                />
              </div>
            </div>
          ) : (
            <div className={`grid gap-3 ${draft.fullPayment ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
              {/* First Payment */}
              <div className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface-1/40 p-3">
                <Input
                  label="First payment"
                  type="number"
                  min={0}
                  value={draft.firstPayment}
                  onChange={(e) => setDraft({ ...draft, firstPayment: e.target.value })}
                />
                <Select
                  label="Payment method"
                  value={draft.paymentType}
                  onChange={(e) => setDraft({ ...draft, paymentType: e.target.value as PaymentMethod })}
                  options={paymentMethodOptions}
                />
              </div>

              {/* Remainder */}
              {!draft.fullPayment && (
                <div className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface-1/40 p-3">
                  <Input
                    label="Remainder"
                    type="number"
                    min={0}
                    value={draft.remainder}
                    onChange={(e) => setDraft({ ...draft, remainder: e.target.value })}
                  />
                  <Select
                    label="Payment method"
                    value={draft.remainderPaymentType}
                    onChange={(e) => setDraft({ ...draft, remainderPaymentType: e.target.value as PaymentMethod })}
                    options={paymentMethodOptions}
                  />
                </div>
              )}
            </div>
          )}

          {!draft.pendingSelection && (
            <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={draft.fullPayment}
                onChange={(e) =>
                  setDraft({ ...draft, fullPayment: e.target.checked, remainder: e.target.checked ? '0' : draft.remainder })
                }
                className="h-4 w-4 rounded border-border-strong accent-accent"
              />
              Full payment — customer paid everything and left
            </label>
          )}
        </div>
      </Dialog>



      <Dialog
        open={remainderTarget != null}
        onClose={() => setRemainderTarget(null)}
        title="Remainder payment"
        description={remainderTarget ? `${remainderTarget.name} — record the payment when the customer pays` : undefined}
        icon={<Wallet size={18} />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemainderTarget(null)}>Cancel</Button>
            <Button
              icon={<CircleCheck size={15} />}
              disabled={remainderValue.trim() === '' || Number(remainderValue) < 0 || busy}
              onClick={saveRemainder}
            >
              {remainderReceived ? 'Record as received' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5 pt-1">
          <Input
            label="Remainder amount"
            type="number"
            min={0}
            value={remainderValue}
            onChange={(e) => setRemainderValue(e.target.value)}
            autoFocus
          />
          <Select
            label="Payment method"
            value={remainderPaymentType}
            onChange={(e) => setRemainderPaymentType(e.target.value as PaymentMethod)}
            options={paymentMethodOptions}
          />
          <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
            <input
              type="checkbox"
              checked={remainderReceived}
              onChange={(e) => setRemainderReceived(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong accent-accent"
            />
            {remainderPaymentType === 'Cash'
              ? 'Customer paid this remainder — hand the cash to the owner'
              : `Customer paid this remainder via ${remainderPaymentType}`}
          </label>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmFirstTarget != null}
        onClose={() => setConfirmFirstTarget(null)}
        title="Confirm first payment?"
        variant="primary"
        message={
          confirmFirstTarget ? (
            <span className="text-base sm:text-lg">
              Confirm {confirmFirstTarget.paymentType === 'Cash' ? 'cash received from cashier' : `payment received via ${confirmFirstTarget.paymentType}`} of <strong className="text-accent text-xl font-extrabold">{fmt(confirmFirstTarget.firstPayment)}</strong> for <strong className="text-text-primary font-bold">{confirmFirstTarget.name}</strong>.
            </span>
          ) : undefined
        }
        confirmLabel="Confirm received"
        onConfirm={doConfirmFirst}
      />

      <ConfirmDialog
        open={confirmRemainderTarget != null}
        onClose={() => setConfirmRemainderTarget(null)}
        title="Confirm remainder payment?"
        variant="primary"
        message={
          confirmRemainderTarget ? (
            <span className="text-base sm:text-lg">
              Confirm {(confirmRemainderTarget.remainderPaymentType || confirmRemainderTarget.paymentType) === 'Cash' ? 'cash received from cashier' : `payment received via ${confirmRemainderTarget.remainderPaymentType || confirmRemainderTarget.paymentType}`} of <strong className="text-accent text-xl font-extrabold">{fmt(confirmRemainderTarget.remainder)}</strong> for <strong className="text-text-primary font-bold">{confirmRemainderTarget.name}</strong>.
            </span>
          ) : undefined
        }
        confirmLabel="Confirm received"
        onConfirm={doConfirmRemainder}
      />

      <Dialog
        open={completeTarget != null}
        onClose={() => setCompleteTarget(null)}
        title="Complete package"
        description={completeTarget ? `${completeTarget.name} — add photo selection details` : undefined}
        icon={<FileCheck size={18} className="text-success" />}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteTarget(null)}>Cancel</Button>
            <Button
              icon={<CircleCheck size={15} />}
              disabled={
                completeDraft.quantity.trim() === '' ||
                Number(completeDraft.quantity) <= 0 ||
                (!completeDraft.fullPayment && (completeDraft.remainder.trim() === '' || Number(completeDraft.remainder) < 0)) ||
                busy
              }
              onClick={saveComplete}
            >
              Complete package
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pt-1">
          {/* Order Date Bar */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-surface-1/50 px-3.5 py-2.5">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-text-primary">Order date</span>
              <span className="text-xs text-text-muted">Ethiopian calendar</span>
            </div>
            <Popover
              align="end"
              trigger={(toggle) => (
                <button
                  type="button"
                  onClick={toggle}
                  className="flex h-9 items-center gap-2.5 rounded-md border border-border-strong bg-surface-2 px-3.5 text-left text-sm font-medium text-text-primary transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
                >
                  <CalendarDays size={15} className="text-text-muted shrink-0" />
                  <span className="whitespace-nowrap">{formatDate(completeDraft.date)}</span>
                </button>
              )}
            >
              {(close) => (
                <div className="p-2">
                  <CalendarGrid
                    value={completeDraft.date}
                    onChange={(d) => {
                      setCompleteDraft({ ...completeDraft, date: d })
                      close()
                    }}
                  />
                </div>
              )}
            </Popover>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Quantity" type="number" min={1} value={completeDraft.quantity} onChange={(e) => setCompleteDraft({ ...completeDraft, quantity: e.target.value })} autoFocus />
            <Input label="Frame details" value={completeDraft.frame} onChange={(e) => setCompleteDraft({ ...completeDraft, frame: e.target.value })} placeholder="e.g. Wood frame" />
          </div>

          {/* Payment Breakdown */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Second Payment */}
            <div className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface-1/40 p-3">
              <Input
                label="Second payment"
                type="number"
                min={0}
                value={completeDraft.secondPayment}
                onChange={(e) => setCompleteDraft({ ...completeDraft, secondPayment: e.target.value })}
                hint={completeTarget && completeTarget.secondPayment > 0 ? `Previous: ${fmt(completeTarget.secondPayment)}` : undefined}
              />
              <Select
                label="Payment method"
                value={completeDraft.secondPaymentType}
                onChange={(e) => setCompleteDraft({ ...completeDraft, secondPaymentType: e.target.value as PaymentMethod })}
                options={paymentMethodOptions}
              />
            </div>

            {/* Remainder */}
            {!completeDraft.fullPayment && (
              <div className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface-1/40 p-3">
                <Input
                  label="Remainder"
                  type="number"
                  min={0}
                  value={completeDraft.remainder}
                  onChange={(e) => setCompleteDraft({ ...completeDraft, remainder: e.target.value })}
                  disabled={completeDraft.fullPayment}
                  hint={completeDraft.fullPayment ? 'Paid in full — no remainder' : undefined}
                />
                <Select
                  label="Payment method"
                  value={completeDraft.remainderPaymentType}
                  onChange={(e) => setCompleteDraft({ ...completeDraft, remainderPaymentType: e.target.value as PaymentMethod })}
                  options={paymentMethodOptions}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={completeDraft.fullPayment}
                onChange={(e) =>
                  setCompleteDraft({ ...completeDraft, fullPayment: e.target.checked, remainder: e.target.checked ? '0' : completeDraft.remainder })
                }
                className="h-4 w-4 rounded border-border-strong accent-accent"
              />
              Full payment — customer paid everything and left
            </label>
            {!completeDraft.fullPayment && Number(completeDraft.remainder) > 0 && (
              <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
                <input
                  type="checkbox"
                  checked={completeDraft.remainderReceived}
                  onChange={(e) =>
                    setCompleteDraft({ ...completeDraft, remainderReceived: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border-strong accent-accent"
                />
                {completeDraft.remainderPaymentType === 'Cash'
                  ? 'Customer paid this remainder — hand the cash to the owner'
                  : `Customer paid this remainder via ${completeDraft.remainderPaymentType}`}
              </label>
            )}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={editPackageTarget != null}
        onClose={() => setEditPackageTarget(null)}
        title="Edit Package Details"
        icon={<SquarePen size={18} className="text-accent" />}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditPackageTarget(null)} disabled={busy}>Cancel</Button>
            <Button icon={<Save size={15} />} loading={busy} disabled={busy || !editPackageDraft.name.trim()} onClick={submitEditPackage}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pt-1">
          {/* Order Date Bar */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-surface-1/50 px-3.5 py-2.5">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-text-primary">Order date</span>
              <span className="text-xs text-text-muted">Ethiopian calendar</span>
            </div>
            <Popover
              align="end"
              trigger={(toggle) => (
                <button
                  type="button"
                  onClick={toggle}
                  className="flex h-9 items-center gap-2.5 rounded-md border border-border-strong bg-surface-2 px-3.5 text-left text-sm font-medium text-text-primary transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
                >
                  <CalendarDays size={15} className="text-text-muted shrink-0" />
                  <span className="whitespace-nowrap">{formatDate(editPackageDraft.date)}</span>
                </button>
              )}
            >
              {(close) => (
                <div className="p-2">
                  <CalendarGrid
                    value={editPackageDraft.date}
                    onChange={(d) => {
                      setEditPackageDraft({ ...editPackageDraft, date: d })
                      close()
                    }}
                  />
                </div>
              )}
            </Popover>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Customer name"
              value={editPackageDraft.name}
              onChange={(e) => setEditPackageDraft({ ...editPackageDraft, name: e.target.value })}
            />
            <Input
              label="Phone number"
              type="tel"
              maxLength={10}
              value={editPackageDraft.phone}
              onChange={(e) => setEditPackageDraft({ ...editPackageDraft, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Quantity"
              type="number"
              min={1}
              value={editPackageDraft.quantity}
              onChange={(e) => setEditPackageDraft({ ...editPackageDraft, quantity: e.target.value })}
            />
            <Input
              label="Frame details"
              value={editPackageDraft.frame}
              onChange={(e) => setEditPackageDraft({ ...editPackageDraft, frame: e.target.value })}
              placeholder="e.g. 20x30 or 2 frames of 30x40"
            />
          </div>

          {/* Per-Tier Payments Breakdown */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* First Payment Column */}
            <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-1/40 p-3">
              <Input
                label="First payment"
                type="number"
                min={0}
                value={editPackageDraft.firstPayment}
                onChange={(e) => setEditPackageDraft({ ...editPackageDraft, firstPayment: e.target.value })}
              />
              <Select
                label="Payment method"
                value={editPackageDraft.paymentType}
                onChange={(e) => setEditPackageDraft({ ...editPackageDraft, paymentType: e.target.value as PaymentMethod })}
                options={paymentMethodOptions}
              />
            </div>

            {/* Second Payment Column */}
            <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-1/40 p-3">
              <Input
                label="Second payment"
                type="number"
                min={0}
                value={editPackageDraft.secondPayment}
                onChange={(e) => setEditPackageDraft({ ...editPackageDraft, secondPayment: e.target.value })}
              />
              <Select
                label="Payment method"
                value={editPackageDraft.secondPaymentType}
                onChange={(e) => setEditPackageDraft({ ...editPackageDraft, secondPaymentType: e.target.value as PaymentMethod })}
                options={paymentMethodOptions}
              />
            </div>

            {/* Remainder Column */}
            {!editPackageDraft.fullPayment && (
              <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-1/40 p-3">
                <Input
                  label="Remainder"
                  type="number"
                  min={0}
                  value={editPackageDraft.remainder}
                  onChange={(e) => setEditPackageDraft({ ...editPackageDraft, remainder: e.target.value })}
                />
                <Select
                  label="Payment method"
                  value={editPackageDraft.remainderPaymentType}
                  onChange={(e) => setEditPackageDraft({ ...editPackageDraft, remainderPaymentType: e.target.value as PaymentMethod })}
                  options={paymentMethodOptions}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={editPackageDraft.fullPayment}
                onChange={(e) => setEditPackageDraft({ ...editPackageDraft, fullPayment: e.target.checked })}
                className="h-4 w-4 rounded border-border-strong accent-accent"
              />
              Full Payment
            </label>

            <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={editPackageDraft.pendingSelection}
                onChange={(e) => setEditPackageDraft({ ...editPackageDraft, pendingSelection: e.target.checked })}
                className="h-4 w-4 rounded border-border-strong accent-accent"
              />
              Pending Selection
            </label>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={cashierConfirmFirstTarget != null}
        onClose={() => setCashierConfirmFirstTarget(null)}
        title="Confirm first payment received?"
        variant="primary"
        message={
          cashierConfirmFirstTarget ? (
            <span className="text-base sm:text-lg">
              Confirm I received <strong className="text-accent text-xl font-extrabold">{fmt(cashierConfirmFirstTarget.firstPayment)}</strong> in cash for <strong className="text-text-primary font-bold">{cashierConfirmFirstTarget.name}</strong>.
            </span>
          ) : undefined
        }
        confirmLabel="Confirm received"
        onConfirm={doCashierConfirmFirst}
      />

      <ConfirmDialog
        open={cashierConfirmRemainderTarget != null}
        onClose={() => setCashierConfirmRemainderTarget(null)}
        title="Confirm remainder payment received?"
        variant="primary"
        message={
          cashierConfirmRemainderTarget ? (
            <span className="text-base sm:text-lg">
              Confirm I received <strong className="text-accent text-xl font-extrabold">{fmt(cashierConfirmRemainderTarget.remainder)}</strong> in cash for <strong className="text-text-primary font-bold">{cashierConfirmRemainderTarget.name}</strong>.
            </span>
          ) : undefined
        }
        confirmLabel="Confirm received"
        onConfirm={doCashierConfirmRemainder}
      />

      <ConfirmDialog
        open={cashierConfirmSecondTarget != null}
        onClose={() => setCashierConfirmSecondTarget(null)}
        title="Confirm second payment received?"
        variant="primary"
        message={
          cashierConfirmSecondTarget ? (
            <span className="text-base sm:text-lg">
              Confirm I received <strong className="text-accent text-xl font-extrabold">{fmt(cashierConfirmSecondTarget.secondPayment)}</strong> in cash for <strong className="text-text-primary font-bold">{cashierConfirmSecondTarget.name}</strong>.
            </span>
          ) : undefined
        }
        confirmLabel="Confirm received"
        onConfirm={doCashierConfirmSecond}
      />

      <ConfirmDialog
        open={confirmSecondTarget != null}
        onClose={() => setConfirmSecondTarget(null)}
        title="Confirm second payment?"
        variant="primary"
        message={
          confirmSecondTarget ? (
            <span className="text-base sm:text-lg">
              Confirm {(confirmSecondTarget.secondPaymentType || confirmSecondTarget.paymentType) === 'Cash' ? 'cash received from cashier' : `payment received via ${confirmSecondTarget.secondPaymentType || confirmSecondTarget.paymentType}`} of <strong className="text-accent text-xl font-extrabold">{fmt(confirmSecondTarget.secondPayment)}</strong> for <strong className="text-text-primary font-bold">{confirmSecondTarget.name}</strong>.
            </span>
          ) : undefined
        }
        confirmLabel="Confirm received"
        onConfirm={doConfirmSecond}
      />
    </div>
  )
}
