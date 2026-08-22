import { useMemo, useState } from 'react'
import {
  CalendarDays, CheckCheck, CircleCheck, FileCheck, Package as PackageIcon,
  Plus, Save, Search, SquarePen, Wallet, X,
} from 'lucide-react'
import { useStore } from '../lib/store'
import type { Package as PackageRecord } from '../lib/types'
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

interface PackageDraft {
  name: string
  phone: string
  quantity: string
  frame: string
  firstPayment: string
  secondPayment: string
  remainder: string
  date: string
  paymentType: 'Cash' | 'Bank'
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
  fullPayment: false,
  pendingSelection: false,
})

interface CompleteDraft {
  quantity: string
  frame: string
  secondPayment: string
  remainder: string
  date: string
  paymentType: 'Cash' | 'Bank'
  fullPayment: boolean
  remainderReceived: boolean
}

const emptyCompleteDraft = (pkg: PackageRecord): CompleteDraft => ({
  quantity: String(pkg.quantity ?? 1),
  frame: pkg.frame ?? '',
  secondPayment: '',
  remainder: pkg.remainder != null ? String(pkg.remainder) : '',
  date: pkg.date || todayISO(),
  paymentType: pkg.paymentType,
  fullPayment: pkg.fullPayment,
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

  if (pkg.fullPayment) {
    if (firstDone && secondDone && remainderDone) return { label: 'Paid', tone: 'paid' }
    if (pkg.firstCashierConfirmed) return { label: 'Full payment · awaiting owner', tone: 'info' }
    return { label: 'Full payment · awaiting cashier', tone: 'warning' }
  }

  if (!pkg.firstConfirmed) {
    if (pkg.firstCashierConfirmed) return { label: 'Awaiting owner confirmation', tone: 'info' }
    return { label: 'Awaiting cashier confirmation', tone: 'warning' }
  }

  if (pkg.secondPayment > 0 && !pkg.secondPaymentConfirmed) {
    if (pkg.secondPaymentCashierConfirmed) return { label: 'Second payment · awaiting owner', tone: 'info' }
    return { label: 'Second payment · awaiting cashier', tone: 'warning' }
  }

  if ((pkg.remainder ?? 0) > 0 && !pkg.remainderConfirmed) {
    if (pkg.remainderCashierConfirmed) return { label: 'Remainder · awaiting owner', tone: 'info' }
    if (pkg.remainderReceived) return { label: 'Remainder received · awaiting cashier', tone: 'warning' }
    return { label: 'Remainder pending', tone: 'warning' }
  }

  return { label: 'Awaiting owner confirmation', tone: 'info' }
}

export function PackagePage() {
  const state = useStore()
  const authUser = useStore((s) => s.authUser)
  const role = authUser?.role ?? state.currentUser.role
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
  const [remainderPaymentType, setRemainderPaymentType] = useState<'Cash' | 'Bank'>('Cash')

  const [confirmFirstTarget, setConfirmFirstTarget] = useState<PackageRecord | null>(null)
  const [confirmRemainderTarget, setConfirmRemainderTarget] = useState<PackageRecord | null>(null)
  const [cashierConfirmFirstTarget, setCashierConfirmFirstTarget] = useState<PackageRecord | null>(null)
  const [cashierConfirmRemainderTarget, setCashierConfirmRemainderTarget] = useState<PackageRecord | null>(null)
  const [confirmSecondTarget, setConfirmSecondTarget] = useState<PackageRecord | null>(null)
  const [cashierConfirmSecondTarget, setCashierConfirmSecondTarget] = useState<PackageRecord | null>(null)

  const [completeTarget, setCompleteTarget] = useState<PackageRecord | null>(null)
  const [completeDraft, setCompleteDraft] = useState<CompleteDraft>(emptyCompleteDraft(emptyDraft as unknown as PackageRecord))

  const [editPackageTarget, setEditPackageTarget] = useState<PackageRecord | null>(null)
  const [editPackageDraft, setEditPackageDraft] = useState<PackageDraft>(emptyDraft)

  const [busy, setBusy] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [search, setSearch] = useState('')



  const list = useMemo(() => {
    const today = todayISO()
    const sameDay = (t?: string | null) => (t ? datePartOf(t) === today : false)
    const query = search.trim().toLowerCase()
    return state.packages
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
  }, [state.packages, filter, dateFilter, search])

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
    if (!draftValid) return
    try {
      await addPackage({
        name: draft.name.trim(),
        phone: phoneDigits,
        quantity: draft.pendingSelection ? undefined : quantityNum,
        frame: draft.frame.trim(),
        firstPayment: firstNum,
        remainder: draft.pendingSelection ? undefined : (draft.fullPayment ? 0 : remainderNum),
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
    }
  }



  const openRemainder = (pkg: PackageRecord) => {
    setRemainderTarget(pkg)
    setRemainderValue(String(pkg.remainder))
    setRemainderReceived(pkg.remainderReceived)
    setRemainderPaymentType(pkg.remainderPaymentType ?? 'Cash')
  }

  const saveRemainder = async () => {
    if (!remainderTarget) return
    const value = Number(remainderValue)
    if (value < 0 || remainderValue.trim() === '') return
    setBusy(true)
    try {
      await updatePackage(remainderTarget.id, {
        remainder: value,
        remainderReceived,
        remainderPaymentType: remainderReceived ? remainderPaymentType : null,
      })
      pushToast({
        tone: 'success',
        title: remainderReceived ? 'Remainder payment recorded' : 'Remainder updated',
        message: `${remainderTarget.name} · ${fmt(value)}`,
      })
      setRemainderTarget(null)
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
    setBusy(true)
    try {
      await confirmFirst(confirmFirstTarget.id)
      pushToast({
        tone: 'success',
        title: 'First payment confirmed',
        message: `${confirmFirstTarget.name} · ${fmt(confirmFirstTarget.firstPayment)} received`,
      })
      setConfirmFirstTarget(null)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
      setConfirmFirstTarget(null)
    } finally {
      setBusy(false)
    }
  }

  const doConfirmRemainder = async () => {
    if (!confirmRemainderTarget) return
    setBusy(true)
    try {
      await confirmRemainder(confirmRemainderTarget.id)
      pushToast({
        tone: 'success',
        title: 'Remainder payment confirmed',
        message: `${confirmRemainderTarget.name} · fully paid`,
      })
      setConfirmRemainderTarget(null)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
      setConfirmRemainderTarget(null)
    } finally {
      setBusy(false)
    }
  }

  const doCashierConfirmFirst = async () => {
    if (!cashierConfirmFirstTarget) return
    setBusy(true)
    try {
      await cashierConfirmFirst(cashierConfirmFirstTarget.id)
      pushToast({
        tone: 'success',
        title: 'First payment confirmed',
        message: `${cashierConfirmFirstTarget.name} · ${fmt(cashierConfirmFirstTarget.firstPayment)} received`,
      })
      setCashierConfirmFirstTarget(null)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
      setCashierConfirmFirstTarget(null)
    } finally {
      setBusy(false)
    }
  }

  const doCashierConfirmRemainder = async () => {
    if (!cashierConfirmRemainderTarget) return
    setBusy(true)
    try {
      await cashierConfirmRemainder(cashierConfirmRemainderTarget.id)
      pushToast({
        tone: 'success',
        title: 'Remainder payment confirmed',
        message: `${cashierConfirmRemainderTarget.name} · ${fmt(cashierConfirmRemainderTarget.remainder)} received`,
      })
      setCashierConfirmRemainderTarget(null)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
      setCashierConfirmRemainderTarget(null)
    } finally {
      setBusy(false)
    }
  }

  const doCashierConfirmSecond = async () => {
    if (!cashierConfirmSecondTarget) return
    setBusy(true)
    try {
      await cashierConfirmSecond(cashierConfirmSecondTarget.id)
      pushToast({
        tone: 'success',
        title: 'Second payment confirmed',
        message: `${cashierConfirmSecondTarget.name} · ${fmt(cashierConfirmSecondTarget.secondPayment)} received`,
      })
      setCashierConfirmSecondTarget(null)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
      setCashierConfirmSecondTarget(null)
    } finally {
      setBusy(false)
    }
  }

  const doConfirmSecond = async () => {
    if (!confirmSecondTarget) return
    setBusy(true)
    try {
      await confirmSecond(confirmSecondTarget.id)
      pushToast({
        tone: 'success',
        title: 'Second payment confirmed',
        message: `${confirmSecondTarget.name} · ${fmt(confirmSecondTarget.secondPayment)} received`,
      })
      setConfirmSecondTarget(null)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not confirm',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
      setConfirmSecondTarget(null)
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
    setBusy(true)
    try {
      await updatePackage(completeTarget.id, {
        quantity: qty,
        frame: completeDraft.frame.trim(),
        secondPayment: second,
        remainder: completeDraft.fullPayment ? 0 : rest,
        date: completeDraft.date,
        paymentType: completeDraft.paymentType,
        fullPayment: completeDraft.fullPayment,
        remainderReceived: completeDraft.remainderReceived,
        pendingSelection: false,
      })
      pushToast({
        tone: 'success',
        title: 'Package completed',
        message: `${completeTarget.name} · ${qty} photos` + (second > 0 ? ` · +${fmt(second)}` : ''),
      })
      setCompleteTarget(null)
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
      paymentType: pkg.paymentType,
      fullPayment: pkg.fullPayment,
      pendingSelection: pkg.pendingSelection,
    })
  }

  const submitEditPackage = async () => {
    if (!editPackageTarget) return
    setBusy(true)
    try {
      const phoneDigits = editPackageDraft.phone.replace(/\D/g, '')
      await updatePackage(editPackageTarget.id, {
        name: editPackageDraft.name.trim(),
        phone: phoneDigits,
        date: editPackageDraft.date,
        quantity: editPackageDraft.pendingSelection ? undefined : Number(editPackageDraft.quantity || 1),
        frame: editPackageDraft.frame.trim(),
        firstPayment: Number(editPackageDraft.firstPayment || 0),
        secondPayment: Number(editPackageDraft.secondPayment || 0),
        remainder: editPackageDraft.fullPayment ? 0 : Number(editPackageDraft.remainder || 0),
        paymentType: editPackageDraft.paymentType,
        fullPayment: editPackageDraft.fullPayment,
        pendingSelection: editPackageDraft.pendingSelection,
      })
      pushToast({
        tone: 'success',
        title: 'Package updated',
        message: `Saved changes for ${editPackageDraft.name}`,
      })
      setEditPackageTarget(null)
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
        description={isOwner ? 'Receive money from the cashier and confirm package orders' : 'Record and track package orders'}
        actions={
          canAddPackage ? (
            <Button icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Add package
            </Button>
          ) : undefined
        }
      />

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-2">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Package orders</h2>
            <p className="text-[13px] text-text-muted">
              {list.length === 0 ? 'No packages' : `${list.length} ${list.length === 1 ? 'package' : 'packages'}`}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
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
                {() => (
                  <div className="p-2">
                    <CalendarGrid value={dateFilter || todayISO()} onChange={(d) => setDateFilter(d)} />
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                        {fmt(pkg.firstPayment)} <span className="text-text-muted">({pkg.paymentType})</span>
                        {!isFullyPaid && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {pkg.firstCashierConfirmed
                              ? <Badge tone="paid" className="text-[9px] px-1 py-0">Cashier ✓</Badge>
                              : <Badge tone="warning" className="text-[9px] px-1 py-0">Cashier pending</Badge>}
                            {pkg.firstConfirmed
                              ? <Badge tone="paid" className="text-[9px] px-1 py-0">Owner ✓</Badge>
                              : <Badge tone="neutral" className="text-[9px] px-1 py-0">Owner pending</Badge>}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular text-text-secondary">
                        {pkg.secondPayment > 0 ? (
                          <>
                            {fmt(pkg.secondPayment)} <span className="text-text-muted">({pkg.paymentType})</span>
                            {!isFullyPaid && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {pkg.secondPaymentCashierConfirmed
                                  ? <Badge tone="paid" className="text-[9px] px-1 py-0">Cashier ✓</Badge>
                                  : <Badge tone="warning" className="text-[9px] px-1 py-0">Cashier pending</Badge>}
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
                            {fmt(pkg.remainder)} {pkg.remainderPaymentType ? <span className="text-text-muted">({pkg.remainderPaymentType})</span> : null}
                            {!isFullyPaid && !pkg.fullPayment && (pkg.remainder ?? 0) > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {pkg.remainderReceived
                                  ? pkg.remainderCashierConfirmed
                                    ? <Badge tone="paid" className="text-[9px] px-1 py-0">Cashier ✓</Badge>
                                    : <Badge tone="warning" className="text-[9px] px-1 py-0">Cashier pending</Badge>
                                  : <Badge tone="neutral" className="text-[9px] px-1 py-0">Not received</Badge>}
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
                          {isCashier && !pkg.firstCashierConfirmed && !pkg.firstConfirmed && (
                            <IconButton
                              label={`Confirm received first payment from cameraman for ${pkg.name}`}
                              icon={<CheckCheck size={15} className="text-info" />}
                              onClick={() => setCashierConfirmFirstTarget(pkg)}
                            />
                          )}
                          {isOwner && pkg.firstCashierConfirmed && !pkg.firstConfirmed && (
                            <IconButton
                              label={`Confirm first payment of ${pkg.name}`}
                              icon={<CheckCheck size={15} className="text-info" />}
                              onClick={() => setConfirmFirstTarget(pkg)}
                            />
                          )}
                          {isCashier && !pkg.fullPayment && pkg.remainderReceived && !pkg.remainderCashierConfirmed && !pkg.remainderConfirmed && (
                            <IconButton
                              label={`Confirm received remainder from cameraman for ${pkg.name}`}
                              icon={<CheckCheck size={15} className="text-info" />}
                              onClick={() => setCashierConfirmRemainderTarget(pkg)}
                            />
                          )}
                          {isOwner && !pkg.fullPayment && pkg.remainderCashierConfirmed && !pkg.remainderConfirmed && (
                            <IconButton
                              label={`Confirm remainder payment of ${pkg.name}`}
                              icon={<Wallet size={15} className="text-warning" />}
                              onClick={() => setConfirmRemainderTarget(pkg)}
                            />
                          )}
                          {isCashier && pkg.secondPayment > 0 && !pkg.secondPaymentCashierConfirmed && !pkg.secondPaymentConfirmed && (
                            <IconButton
                              label={`Confirm received second payment from cameraman for ${pkg.name}`}
                              icon={<CheckCheck size={15} className="text-info" />}
                              onClick={() => setCashierConfirmSecondTarget(pkg)}
                            />
                          )}
                          {isOwner && pkg.secondPayment > 0 && pkg.secondPaymentCashierConfirmed && !pkg.secondPaymentConfirmed && (
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
        )}
      </section>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add package"
        description="Record a package order and its first payment"
        icon={<PackageIcon size={18} />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button icon={<Plus size={15} />} disabled={!draftValid} onClick={submit}>Add package</Button>
          </>
        }
      >
        <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
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
          <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Customer name" />
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
              <Input label="Frame" value={draft.frame} onChange={(e) => setDraft({ ...draft, frame: e.target.value })} placeholder="e.g. Wood frame" />
            </>
          )}
          <Input label="First payment" type="number" min={0} value={draft.firstPayment} onChange={(e) => setDraft({ ...draft, firstPayment: e.target.value })} />
          {!draft.pendingSelection && (
            <Input
              label="Remainder"
              type="number"
              min={0}
              value={draft.remainder}
              onChange={(e) => setDraft({ ...draft, remainder: e.target.value })}
              disabled={draft.fullPayment}
              hint={draft.fullPayment ? 'Paid in full — no remainder' : undefined}
            />
          )}
          <Select
            label="Payment type"
            value={draft.paymentType}
            onChange={(e) => setDraft({ ...draft, paymentType: e.target.value as 'Cash' | 'Bank' })}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank', label: 'Bank' },
            ]}
          />
        </div>
        {!draft.pendingSelection && (
          <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
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
        <div className="mt-4">
          <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Date</span>
          <Popover
            align="start"
            trigger={(toggle) => (
              <button
                type="button"
                onClick={toggle}
                className="flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3 text-left text-sm text-text-primary transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
              >
                <CalendarDays size={15} className="text-text-muted" />
                <span className="flex-1">{formatDate(draft.date)}</span>
              </button>
            )}
          >
            {() => (
              <div className="p-2">
                <CalendarGrid
                  value={draft.date}
                  onChange={(d) => setDraft({ ...draft, date: d })}
                />
              </div>
            )}
          </Popover>
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
        <Input
          label="Remainder amount"
          type="number"
          min={0}
          value={remainderValue}
          onChange={(e) => setRemainderValue(e.target.value)}
          autoFocus
        />
        <Select
          label="Payment type"
          value={remainderPaymentType}
          onChange={(e) => setRemainderPaymentType(e.target.value as 'Cash' | 'Bank')}
          options={[
            { value: 'Cash', label: 'Cash' },
            { value: 'Bank', label: 'Bank' },
          ]}
        />
        <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
          <input
            type="checkbox"
            checked={remainderReceived}
            onChange={(e) => setRemainderReceived(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong accent-accent"
          />
          Customer paid this remainder — hand the money to the owner
        </label>
      </Dialog>

      <ConfirmDialog
        open={confirmFirstTarget != null}
        onClose={() => setConfirmFirstTarget(null)}
        title="Confirm first payment?"
        variant="primary"
        message={
          confirmFirstTarget ? (
            <span className="text-base sm:text-lg">
              Confirm I received <strong className="text-accent text-xl font-extrabold">{fmt(confirmFirstTarget.firstPayment)}</strong> for <strong className="text-text-primary font-bold">{confirmFirstTarget.name}</strong>.
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
              Confirm I received <strong className="text-accent text-xl font-extrabold">{fmt(confirmRemainderTarget.remainder)}</strong> for <strong className="text-text-primary font-bold">{confirmRemainderTarget.name}</strong>.
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Quantity" type="number" min={1} value={completeDraft.quantity} onChange={(e) => setCompleteDraft({ ...completeDraft, quantity: e.target.value })} autoFocus />
          <Input label="Frame" value={completeDraft.frame} onChange={(e) => setCompleteDraft({ ...completeDraft, frame: e.target.value })} placeholder="e.g. Wood frame" />
          <Input
            label="Second payment"
            type="number"
            min={0}
            value={completeDraft.secondPayment}
            onChange={(e) => setCompleteDraft({ ...completeDraft, secondPayment: e.target.value })}
            hint={completeTarget && completeTarget.secondPayment > 0 ? `Previous: ${fmt(completeTarget.secondPayment)}` : undefined}
          />
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
            label="Payment type"
            value={completeDraft.paymentType}
            onChange={(e) => setCompleteDraft({ ...completeDraft, paymentType: e.target.value as 'Cash' | 'Bank' })}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank', label: 'Bank' },
            ]}
          />
        </div>
        <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
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
          <label className="mt-3 flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
            <input
              type="checkbox"
              checked={completeDraft.remainderReceived}
              onChange={(e) =>
                setCompleteDraft({ ...completeDraft, remainderReceived: e.target.checked })
              }
              className="h-4 w-4 rounded border-border-strong accent-accent"
            />
            Customer paid this remainder — hand the money to the owner
          </label>
        )}
        <div className="mt-4">
          <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">Date</span>
          <Popover
            align="start"
            trigger={(toggle) => (
              <button
                type="button"
                onClick={toggle}
                className="flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3 text-left text-sm text-text-primary transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
              >
                <CalendarDays size={15} className="text-text-muted" />
                <span className="flex-1">{formatDate(completeDraft.date)}</span>
              </button>
            )}
          >
            {() => (
              <div className="p-2">
                <CalendarGrid
                  value={completeDraft.date}
                  onChange={(d) => setCompleteDraft({ ...completeDraft, date: d })}
                />
              </div>
            )}
          </Popover>
        </div>
      </Dialog>

      <Dialog
        open={editPackageTarget != null}
        onClose={() => setEditPackageTarget(null)}
        title="Edit Package Details"

        icon={<SquarePen size={18} className="text-accent" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditPackageTarget(null)} disabled={busy}>Cancel</Button>
            <Button icon={<Save size={15} />} loading={busy} disabled={busy || !editPackageDraft.name.trim()} onClick={submitEditPackage}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] font-medium text-text-secondary">Order date</span>
            <Popover
              align="start"
              trigger={(toggle) => (
                <button
                  type="button"
                  onClick={toggle}
                  className="flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3 text-left text-sm text-text-primary hover:border-accent"
                >
                  <CalendarDays size={15} className="text-text-muted" />
                  <span>{formatDate(editPackageDraft.date)}</span>
                </button>
              )}
            >
              {() => (
                <div className="p-2">
                  <CalendarGrid
                    value={editPackageDraft.date}
                    onChange={(d) => setEditPackageDraft({ ...editPackageDraft, date: d })}
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

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="First payment"
              type="number"
              min={0}
              value={editPackageDraft.firstPayment}
              onChange={(e) => setEditPackageDraft({ ...editPackageDraft, firstPayment: e.target.value })}
            />
            <Input
              label="Second payment"
              type="number"
              min={0}
              value={editPackageDraft.secondPayment}
              onChange={(e) => setEditPackageDraft({ ...editPackageDraft, secondPayment: e.target.value })}
            />
            {!editPackageDraft.fullPayment && (
              <Input
                label="Remainder"
                type="number"
                min={0}
                value={editPackageDraft.remainder}
                onChange={(e) => setEditPackageDraft({ ...editPackageDraft, remainder: e.target.value })}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="w-48">
              <Select
                label="Payment type"
                value={editPackageDraft.paymentType}
                onChange={(e) => setEditPackageDraft({ ...editPackageDraft, paymentType: e.target.value as 'Cash' | 'Bank' })}
                options={[
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Bank', label: 'Bank Transfer' },
                ]}
              />
            </div>

            <label className="mt-5 flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={editPackageDraft.fullPayment}
                onChange={(e) => setEditPackageDraft({ ...editPackageDraft, fullPayment: e.target.checked })}
                className="h-4 w-4 rounded border-border-strong accent-accent"
              />
              Full Payment
            </label>

            <label className="mt-5 flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
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
              Confirm I received <strong className="text-accent text-xl font-extrabold">{fmt(cashierConfirmFirstTarget.firstPayment)}</strong> for <strong className="text-text-primary font-bold">{cashierConfirmFirstTarget.name}</strong>.
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
              Confirm I received <strong className="text-accent text-xl font-extrabold">{fmt(cashierConfirmRemainderTarget.remainder)}</strong> for <strong className="text-text-primary font-bold">{cashierConfirmRemainderTarget.name}</strong>.
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
              Confirm I received <strong className="text-accent text-xl font-extrabold">{fmt(cashierConfirmSecondTarget.secondPayment)}</strong> for <strong className="text-text-primary font-bold">{cashierConfirmSecondTarget.name}</strong>.
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
              Confirm I received <strong className="text-accent text-xl font-extrabold">{fmt(confirmSecondTarget.secondPayment)}</strong> for <strong className="text-text-primary font-bold">{confirmSecondTarget.name}</strong>.
            </span>
          ) : undefined
        }
        confirmLabel="Confirm received"
        onConfirm={doConfirmSecond}
      />
    </div>
  )
}
