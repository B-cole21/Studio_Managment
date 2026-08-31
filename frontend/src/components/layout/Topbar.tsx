import { PanelLeftClose, PanelLeft, Moon, Sun, CalendarDays, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { IconButton } from '../ui/Button'
import { Tooltip } from '../ui/Tooltip'
import { formatDate, todayISO } from '../../lib/format'

export function Topbar() {
  const collapsed = useStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const studioName = useStore((s) => s.settings.studioName)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const logout = useStore((s) => s.logout)
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border-subtle bg-surface-1 px-3 sm:px-4">
      {/* Desktop Sidebar Toggle */}
      <div className="hidden md:flex items-center gap-2">
        <IconButton
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          icon={collapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
          onClick={toggleSidebar}
        />
        <span className="ml-1 flex items-center gap-1.5 text-[13px] text-text-secondary">
          <CalendarDays size={14} className="text-text-muted" />
          {formatDate(todayISO())}
        </span>
      </div>

      {/* Mobile Branding Logo & Studio Name */}
      <div className="flex md:hidden items-center gap-2.5">
        <img
          src="/logo.jpg"
          alt={studioName}
          className="h-8 w-8 shrink-0 rounded-lg object-cover border border-border-subtle shadow-sm"
          onError={(e) => { (e.currentTarget.style.display = 'none') }}
        />
        <span className="text-sm font-semibold text-text-primary truncate max-w-[160px]">
          {studioName}
        </span>
      </div>

      {/* Theme & Logout Actions */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-text-muted md:hidden flex items-center gap-1">
          {formatDate(todayISO())}
        </span>
        <Tooltip label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton
            label="Toggle theme"
            icon={theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        </Tooltip>
        <div className="md:hidden">
          <Tooltip label="Sign out">
            <IconButton
              label="Sign out"
              icon={<LogOut size={17} />}
              onClick={handleLogout}
            />
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
