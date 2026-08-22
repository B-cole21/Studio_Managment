import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Aperture, ArrowRight, Camera, CalendarDays, Eye, EyeOff, Lock, Package, User,
  Mail, KeyRound, ArrowLeft, CheckCircle2, ShieldCheck, RefreshCw,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { requestOtpApi, verifyOtpApi, resetPasswordWithOtpApi } from '../lib/api'
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

  // Login form state
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // OTP Forgot password mode state
  const [isForgot, setIsForgot] = useState(false)
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1)
  const [forgotEmail, setForgotEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)
  const [forgotLoading, setForgotLoading] = useState(false)

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

  function resetForgotState() {
    setIsForgot(false)
    setForgotStep(1)
    setForgotEmail('')
    setOtpCode('')
    setNewPassword('')
    setConfirmPassword('')
    setForgotError(null)
    setForgotSuccess(null)
  }

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault()
    setForgotError(null)
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered email address')
      return
    }

    setForgotLoading(true)
    try {
      await requestOtpApi(forgotEmail.trim())
      setForgotStep(2)
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Failed to send OTP verification code')
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    setForgotError(null)
    if (!otpCode.trim()) {
      setForgotError('Please enter the 6-digit verification code')
      return
    }

    setForgotLoading(true)
    try {
      await verifyOtpApi(forgotEmail.trim(), otpCode.trim())
      setForgotStep(3)
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Invalid verification code')
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleResetPasswordWithOtp(e: FormEvent) {
    e.preventDefault()
    setForgotError(null)

    if (!newPassword) {
      setForgotError('Please enter a new password')
      return
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match')
      return
    }
    if (newPassword.length < 4) {
      setForgotError('Password must be at least 4 characters long')
      return
    }

    setForgotLoading(true)
    try {
      const res = await resetPasswordWithOtpApi(forgotEmail.trim(), otpCode.trim(), newPassword)
      setForgotSuccess(res.message || 'Password has been reset successfully.')
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen overflow-hidden bg-canvas text-text-primary">
      {/* Left: brand / image panel */}
      <div
        className="relative hidden w-1/2 lg:flex"
        style={{ backgroundImage: `url(${STUDIO_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
        <div className="relative z-10 flex w-full flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Aperture size={22} className="text-amber-400" />
            </span>
            <div>
              <p className="text-base font-semibold leading-tight">{studioName}</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-semibold leading-tight">
              Capture moments that last forever
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              A complete system to run your photography studio — bookings, packages and
              customers, all in one place.
            </p>
            <ul className="mt-8 flex flex-col gap-5">
              {highlights.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
                    <Icon size={17} className="text-amber-400" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-white/70">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/60">© {new Date().getFullYear()} {studioName}. All rights reserved.</p>
        </div>
      </div>

      {/* Right: login / OTP forgot password panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Aperture size={26} />
            </span>
            <h1 className="text-lg font-semibold">{studioName}</h1>
          </div>

          {isForgot ? (
            <div>
              <button
                type="button"
                onClick={resetForgotState}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors mb-6 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Sign in
              </button>

              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                  Reset Password <ShieldCheck className="size-6 text-amber-500" />
                </h2>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Step {forgotStep} of 3
                </span>
              </div>

              {forgotSuccess ? (
                <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold">Password Reset Successful!</p>
                      <p className="mt-1 text-xs">{forgotSuccess}</p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={resetForgotState}
                      >
                        Sign In Now
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* STEP 1: Enter Email address */}
                  {forgotStep === 1 && (
                    <form onSubmit={handleRequestOtp} className="mt-6 flex flex-col gap-4" noValidate>
                      <p className="text-xs text-text-muted">
                        Enter your registered email address to receive a 6-digit OTP verification code.
                      </p>
                      <Input
                        label="Registered Email"
                        type="email"
                        autoComplete="email"
                        icon={<Mail size={16} />}
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        error={forgotError ?? undefined}
                        required
                        autoFocus
                        placeholder="e.g.Someone@gmail.com"
                      />
                      <Button
                        type="submit"
                        size="lg"
                        className="group relative mt-2 w-full overflow-hidden border-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 font-semibold text-white shadow-md transition-all duration-300 active:scale-[0.98]"
                        loading={forgotLoading}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {forgotLoading ? 'Sending OTP…' : 'Send Verification Code'}
                        </span>
                      </Button>
                    </form>
                  )}

                  {/* STEP 2: Enter OTP Code */}
                  {forgotStep === 2 && (
                    <form onSubmit={handleVerifyOtp} className="mt-6 flex flex-col gap-4" noValidate>
                      <p className="text-xs text-text-muted">
                        We sent a 6-digit verification code to <strong className="text-text-primary">{forgotEmail}</strong>.
                      </p>

                      <Input
                        label="6-Digit OTP Code"
                        type="text"
                        maxLength={6}
                        icon={<KeyRound size={16} />}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        error={forgotError ?? undefined}
                        required
                        autoFocus
                        placeholder="e.g. 123456"
                      />

                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setForgotStep(1)
                            setForgotError(null)
                          }}
                          className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                        >
                          Change Email
                        </button>
                        <button
                          type="button"
                          onClick={handleRequestOtp}
                          className="inline-flex items-center gap-1 font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 cursor-pointer"
                        >
                          <RefreshCw size={12} /> Resend OTP
                        </button>
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="group relative mt-2 w-full overflow-hidden border-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 font-semibold text-white shadow-md transition-all duration-300 active:scale-[0.98]"
                        loading={forgotLoading}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {forgotLoading ? 'Verifying…' : 'Verify Code'}
                        </span>
                      </Button>
                    </form>
                  )}

                  {/* STEP 3: Set New Password */}
                  {forgotStep === 3 && (
                    <form onSubmit={handleResetPasswordWithOtp} className="mt-6 flex flex-col gap-4" noValidate>
                      <p className="text-xs text-text-muted">
                        Code verified! Please enter your new password below.
                      </p>
                      <Input
                        label="New Password"
                        type={showNewPassword ? 'text' : 'password'}
                        icon={<Lock size={16} />}
                        rightAction={
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="text-text-muted hover:text-text-primary transition-colors focus:outline-none p-1 cursor-pointer"
                            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        }
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        autoFocus
                      />
                      <Input
                        label="Confirm New Password"
                        type={showNewPassword ? 'text' : 'password'}
                        icon={<Lock size={16} />}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={forgotError ?? undefined}
                        required
                      />

                      <Button
                        type="submit"
                        size="lg"
                        className="group relative mt-2 w-full overflow-hidden border-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 font-semibold text-white shadow-md transition-all duration-300 active:scale-[0.98]"
                        loading={forgotLoading}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {forgotLoading ? 'Updating Password…' : 'Update Password'}
                        </span>
                      </Button>
                    </form>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                Welcome <Camera className="size-6 text-accent" />
              </h2>
              <p className="mt-1 text-sm text-text-muted">Sign in to your account</p>

              <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
                <Input
                  label="Username"
                  autoComplete="username"
                  icon={<User size={16} />}
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                  autoFocus
                />
                <div>
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    icon={<Lock size={16} />}
                    rightAction={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-text-muted hover:text-text-primary transition-colors focus:outline-none p-1 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={error ?? undefined}
                    required
                  />
                  <div className="mt-1.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgot(true)
                        setForgotStep(1)
                        setError(null)
                        setForgotError(null)
                        setForgotSuccess(null)
                      }}
                      className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline focus:outline-none cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="group relative mt-2 w-full overflow-hidden border-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 font-semibold text-white shadow-md animate-btn-color transition-all duration-300 active:scale-[0.98]"
                  loading={loading}
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-btn-shimmer" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      'Signing in…'
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </Button>
              </form>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-text-muted">
            {studioName} management system
          </p>

          <p className="mt-16 border-t border-border-subtle pt-5 text-center text-xs text-text-muted">
            Developed by{' '}
            <a
              href="https://birukyihun.netlify.app"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent hover:text-accent-hover hover:underline"
            >
              Show
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
