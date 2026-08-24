import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Aperture, ArrowRight, Camera, CalendarDays, Eye, EyeOff, Lock, Package, User } from 'lucide-react'
import { useStore } from '../lib/store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const STUDIO_IMAGE =
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1600&auto=format&fit=crop'

const highlights = [
  { icon: CalendarDays, title: 'Smart scheduling', text: 'Manage bookings and time slots in one place' },
  { icon: Camera, title: 'Service packages', text: 'Portrait, family, birthday and more' },
  { icon: Package, title: 'Easy tracking', text: 'Follow customer packages and payments' },
]

export function Login() {
  const navigate = useNavigate()
  const authUser = useStore((s) => s.authUser)
  const login = useStore((s) => s.login)
  const studioName = useStore((s) => s.settings.studioName)

  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (authUser) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(userName.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      {/* Left hero banner (desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface-2 p-12 lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
          style={{ backgroundImage: `url(${STUDIO_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-2 via-surface-2/60 to-transparent" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-contrast shadow-lg shadow-accent/20">
            <Aperture size={22} />
          </span>
          <span className="text-xl font-bold tracking-tight text-text-primary">{studioName}</span>
        </div>

        <div className="relative z-10 my-auto max-w-md space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
            Studio Management System
          </h1>
          <p className="text-base text-text-secondary leading-relaxed">
            Sign in to access your bookings, packages, settings, and daily financial reports.
          </p>

          <div className="space-y-4 pt-4">
            {highlights.map((item) => (
              <div key={item.title} className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-1 text-accent border border-border-subtle">
                  <item.icon size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                  <p className="text-xs text-text-muted">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-text-muted">
          © {new Date().getFullYear()} {studioName}. All rights reserved.
        </div>
      </div>

      {/* Right sign-in form */}
      <div className="flex w-full flex-col justify-between px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="my-auto mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent lg:hidden">
              <Aperture size={26} />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Welcome back</h2>
            <p className="mt-1.5 text-sm text-text-muted">
              Enter your credentials to access your account
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-500">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Input
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                icon={<User size={17} />}
                required
                autoFocus
              />
            </div>

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={17} />}
                rightAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center"
              loading={loading}
            >
              Sign in <ArrowRight size={16} />
            </Button>
          </form>
        </div>

        {/* Developer Credit Footer */}
        <div className="mt-8 text-center text-xs text-text-muted">
          Developed by{' '}
          <a
            href="https://birukyihun.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-amber-400 hover:text-amber-300 transition-colors underline decoration-amber-400/50 decoration-2 underline-offset-4"
          >
            Biruk
          </a>
        </div>
      </div>
    </div>
  )
}
