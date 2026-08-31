import { useEffect, useState } from 'react'
import {
  Building2, Layers, Moon, Pencil, Plus, Save, Sun, Trash2,
} from 'lucide-react'
import { useStore } from '../lib/store'
import type { Service } from '../lib/types'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

type Section = 'general' | 'services' | 'appearance'

const sections: { id: Section; label: string; icon: typeof Building2 }[] = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'services', label: 'Services', icon: Layers },
  { id: 'appearance', label: 'Appearance', icon: Moon },
]

export function Settings() {
  const state = useStore()
  const updateSettings = useStore((s) => s.updateSettings)
  const addService = useStore((s) => s.addService)
  const updateService = useStore((s) => s.updateService)
  const removeService = useStore((s) => s.removeService)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const pushToast = useStore((s) => s.pushToast)

  const [section, setSection] = useState<Section>('general')
  const [form, setForm] = useState(state.settings)

  useEffect(() => {
    setForm(state.settings)
  }, [state.settings])

  const [serviceDraft, setServiceDraft] = useState({ name: '', isBirthday: false })
  const [editingService, setEditingService] = useState<string | null>(null)
  const [deletingService, setDeletingService] = useState<Service | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const saveGeneral = async () => {
    setSaving(true)
    try {
      await updateSettings(form)
      setSaved(true)
      pushToast({ tone: 'success', title: 'Settings saved', message: 'Studio information updated successfully' })
      window.setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not save settings',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setSaving(false)
    }
  }

  const confirmDeleteService = async () => {
    if (!deletingService) return
    try {
      await removeService(deletingService.id)
      pushToast({ tone: 'success', title: 'Service removed', message: deletingService.name })
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not remove service',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    }
    setDeletingService(null)
  }

  const submitService = async () => {
    const name = serviceDraft.name.trim()
    if (!name) return
    try {
      if (editingService) {
        await updateService(editingService, {
          name,
          durationMin: 60,
          isBirthday: serviceDraft.isBirthday,
        })
        pushToast({ tone: 'success', title: 'Service updated', message: name })
      } else {
        await addService({ name, durationMin: 60, isBirthday: serviceDraft.isBirthday })
        pushToast({ tone: 'success', title: 'Service added', message: name })
      }
    } catch (err) {
      pushToast({
        tone: 'error',
        title: 'Could not save service',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
      return
    }
    setServiceDraft({ name: '', isBirthday: false })
    setEditingService(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Studio"
        title="Settings"
        description="Studio identity, services and preferences"
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <nav
          aria-label="Settings sections"
          className="flex w-full shrink-0 flex-col gap-1 rounded-xl border border-border-subtle bg-surface-2 p-2 lg:w-56"
        >
          {sections.map((s) => {
            const active = section === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${
                  active ? 'bg-accent-soft text-accent' : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'
                }`}
              >
                <s.icon size={16} />
                {s.label}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {section === 'general' && (
            <div className="flex flex-col gap-5">
              <div className="rounded-xl border border-border-subtle bg-surface-2 p-5">
                <div className="flex items-center gap-4 pb-5 border-b border-border-subtle">
                  <img
                    src="/logo.png"
                    alt={form.studioName ?? 'Studio Logo'}
                    className="h-14 w-auto max-w-[180px] object-contain transition-all"
                    onError={(e) => { (e.currentTarget.style.display = 'none') }}
                  />
                  <div>
                    <h2 className="text-[15px] font-semibold text-text-primary">{form.studioName || 'Studio Logo'}</h2>
                    <p className="text-xs text-text-muted">Studio Brand Identity & Logo</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-4">
                  <Input label="Studio name" value={form.studioName ?? ''} onChange={(e) => setForm({ ...form, studioName: e.target.value })} />
                  <Input label="Phone" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Textarea label="Address" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  <div className="flex items-center justify-end gap-2 border-t border-border-subtle pt-4">
                    {saved && <Badge tone="success">Saved</Badge>}
                    <Button icon={<Save size={15} />} loading={saving} disabled={saving} onClick={saveGeneral}>Save changes</Button>
                  </div>
                </div>
              </div>

              {/* Simple Double Booking Setting */}
              <div className="rounded-xl border border-border-subtle bg-surface-2 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-text-primary">Double booking</h2>
                    <p className="mt-0.5 text-[13px] text-text-muted">Allow 2 bookings per time slot</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={form.allowDoubleBooking !== false}
                      onChange={(e) => {
                        const enabled = e.target.checked
                        const updated = { ...form, allowDoubleBooking: enabled }
                        setForm(updated)
                        updateSettings(updated)
                        pushToast({
                          tone: enabled ? 'success' : 'info',
                          title: enabled ? 'Double booking enabled' : 'Double booking disabled',
                        })
                      }}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-surface-4 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {section === 'services' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border-subtle bg-surface-2">
                {state.services.map((svc, i) => (
                  <div
                    key={svc.id}
                    className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-border-subtle' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                        {svc.name}
                        {svc.isBirthday && <Badge tone="info">Birthday</Badge>}
                      </p>
                      <p className="text-xs text-text-muted">1 hour</p>
                    </div>
                    <IconButton
                      label={`Edit ${svc.name}`}
                      icon={<Pencil size={15} />}
                      onClick={() => {
                        setEditingService(svc.id)
                        setServiceDraft({ name: svc.name, isBirthday: svc.isBirthday ?? false })
                      }}
                    />
                    <IconButton
                      label={`Delete ${svc.name}`}
                      variant="ghost"
                      icon={<Trash2 size={15} />}
                      onClick={() => setDeletingService(svc)}
                    />
                  </div>
                ))}
                {state.services.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-text-muted">No services yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface-2 p-5">
                <h3 className="text-sm font-semibold text-text-primary">
                  {editingService ? 'Edit service' : 'Add a service'}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input label="Name" value={serviceDraft.name} onChange={(e) => setServiceDraft({ ...serviceDraft, name: e.target.value })} placeholder="e.g. Wedding" />
                  <div className="flex flex-col justify-end">
                    <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-text-secondary">
                      <input
                        type="checkbox"
                        checked={serviceDraft.isBirthday}
                        onChange={(e) => setServiceDraft({ ...serviceDraft, isBirthday: e.target.checked })}
                        className="h-4 w-4 rounded border-border-strong accent-accent"
                      />
                      Birthday event
                    </label>
                  </div>
                  <div className="flex items-end">
                    <Button icon={<Plus size={15} />} onClick={submitService}>
                      {editingService ? 'Save' : 'Add'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}



          {section === 'appearance' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border-subtle bg-surface-2 p-5">
                <h2 className="text-[15px] font-semibold text-text-primary">Theme</h2>
                <div className="mt-4 flex gap-2">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors duration-150 ${
                        theme === t
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-border-strong bg-surface-2 text-text-secondary hover:bg-surface-3'
                      }`}
                    >
                      {t === 'dark' ? <Moon size={15} /> : t === 'light' ? <Sun size={15} /> : <Layers size={15} />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deletingService != null}
        onClose={() => setDeletingService(null)}
        title="Delete service?"
        message={
          deletingService
            ? `"${deletingService.name}" will be removed from your list of events. Existing bookings are not affected.`
            : undefined
        }
        onConfirm={confirmDeleteService}
      />
    </div>
  )
}
