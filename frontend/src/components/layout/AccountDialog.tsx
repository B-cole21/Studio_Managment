import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, LogOut, Mail, Save, UserCog } from 'lucide-react'
import { useStore } from '../../lib/store'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export interface AccountDialogProps {
  open: boolean
  onClose: () => void
}

export function AccountDialog({ open, onClose }: AccountDialogProps) {
  const authUser = useStore((s) => s.authUser)
  const updateAccount = useStore((s) => s.updateAccount)
  const logout = useStore((s) => s.logout)
  const pushToast = useStore((s) => s.pushToast)
  const navigate = useNavigate()

  const [userName, setUserName] = useState(authUser?.userName ?? '')
  const [email, setEmail] = useState(authUser?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleLogout = async () => {
    await logout()
    onClose()
    navigate('/login')
  }

  useEffect(() => {
    if (open) {
      setUserName(authUser?.userName ?? '')
      setEmail(authUser?.email ?? '')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
    }
  }, [open, authUser])

  const valid =
    Boolean(userName.trim()) &&
    Boolean(currentPassword) &&
    (!newPassword || newPassword === confirmPassword)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) {
      setError(newPassword && newPassword !== confirmPassword ? 'New password does not match confirmation' : 'Fill in all required fields')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const user = await updateAccount({
        userName: userName.trim(),
        email: email.trim() || undefined,
        currentPassword,
        newPassword: newPassword || undefined,
      })
      pushToast({
        tone: 'success',
        title: 'Account updated',
        message: `Signed in as ${user.userName}`,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Account Settings"
      description="Update your username, email address, or password"
      icon={<UserCog size={18} />}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button variant="destructive" icon={<LogOut size={15} />} onClick={handleLogout}>
            Sign out
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button icon={<Save size={15} />} disabled={!valid || saving} loading={saving} onClick={submit}>
              Save changes
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Username"
          autoComplete="username"
          icon={<UserCog size={16} />}
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Your sign-in name"
        />
        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          icon={<Mail size={16} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. user@agstudio.com"
          hint="Used for password recovery"
        />
        <div className="border-t border-border-subtle pt-4">
          <p className="flex items-center gap-2 text-[13px] font-medium text-text-secondary">
            <KeyRound size={14} />
            Change password
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              icon={<KeyRound size={16} />}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Required to confirm changes"
              error={error ?? undefined}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              icon={<KeyRound size={16} />}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              hint="Minimum 4 characters"
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              icon={<KeyRound size={16} />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={newPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
              placeholder="Repeat the new password"
            />
          </div>
        </div>
      </form>
    </Dialog>
  )
}
