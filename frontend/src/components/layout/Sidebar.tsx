import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, LogOut, Package, Settings, UserCog } from 'lucide-react'
import { useStore } from '../../lib/store'
import { Avatar } from '../ui/Avatar'
import { Tooltip } from '../ui/Tooltip'
import { IconButton } from '../ui/Button'
import { AccountDialog } from './AccountDialog'

const PACKAGE_ROLES = ['cashier', 'owner', 'cameraman']

const allNav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/bookings', label: 'Booking', icon: CalendarDays },
  { to: '/packages', label: 'Package', icon: Package },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed)
  const settings = useStore((s) => s.settings)
  const user = useStore((s) => s.currentUser)
  const logout = useStore((s) => s.logout)
  const navigate = useNavigate()

  const canAccessPackage = PACKAGE_ROLES.includes(user.role)
  const nav = allNav.filter((item) => item.to !== '/packages' || canAccessPackage)

  const [accountOpen, setAccountOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-border-subtle bg-surface-1 transition-[width] duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className={`flex h-14 items-center border-b border-border-subtle px-3.5 ${collapsed ? 'justify-center px-2' : 'justify-start'}`}>
        {collapsed ? (
          <img
            src="/emblem.png"
            alt={settings.studioName}
            className="h-6.5 w-6.5 shrink-0 object-contain animate-logo-glow"
            onError={(e) => { (e.currentTarget.style.display = 'none') }}
          />
        ) : (
          <img
            src="/logo.png"
            alt={settings.studioName}
            className="h-7 w-auto max-w-[140px] object-contain animate-logo-glow"
            onError={(e) => { (e.currentTarget.style.display = 'none') }}
          />
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 p-2.5 pt-4" aria-label="Main">
        {nav.map((item) => {
          const content = (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'
                }`
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
          return collapsed ? (
            <Tooltip key={item.to} label={item.label} side="right">
              <span className="block w-full">{content}</span>
            </Tooltip>
          ) : (
            <span key={item.to}>{content}</span>
          )
        })}
      </nav>

      <div className={`border-t border-border-subtle p-2.5 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-2.5 rounded-lg px-2 py-2 ${collapsed ? '' : 'hover:bg-surface-3'}`}>
          <Avatar name={user.name} size="md" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-text-primary">{user.name}</p>
              <p className="truncate text-[11px] text-text-muted">{user.role}</p>
            </div>
          )}
          {!collapsed && (
            <div className="flex items-center gap-1">
              <IconButton
                label="Account settings"
                icon={<UserCog size={16} />}
                onClick={() => setAccountOpen(true)}
              />
              <IconButton
                label="Sign out"
                icon={<LogOut size={16} />}
                onClick={handleLogout}
              />
            </div>
          )}
        </div>
        {collapsed && (
          <div className="flex flex-col gap-1">
            <Tooltip label="Account settings" side="right">
              <span className="block w-full">
                <IconButton
                  label="Account settings"
                  icon={<UserCog size={16} />}
                  onClick={() => setAccountOpen(true)}
                  className="w-full"
                />
              </span>
            </Tooltip>
            <Tooltip label="Sign out" side="right">
              <span className="block w-full">
                <IconButton
                  label="Sign out"
                  icon={<LogOut size={16} />}
                  onClick={handleLogout}
                  className="w-full"
                />
              </span>
            </Tooltip>
          </div>
        )}
      </div>

      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
    </aside>
  )
}
