import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, Package, Settings } from 'lucide-react'
import { useStore } from '../../lib/store'
import { Avatar } from '../ui/Avatar'
import { AccountDialog } from './AccountDialog'

const PACKAGE_ROLES = ['cashier', 'owner', 'cameraman']

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/bookings', label: 'Booking', icon: CalendarDays },
  { to: '/packages', label: 'Package', icon: Package },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const user = useStore((s) => s.currentUser)
  const canAccessPackage = PACKAGE_ROLES.includes(user.role)
  const filteredNav = navItems.filter((item) => item.to !== '/packages' || canAccessPackage)

  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border-subtle bg-surface-1/95 px-2 backdrop-blur-md md:hidden"
      >
        {filteredNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors duration-150 active:scale-95 ${
                isActive ? 'text-accent font-semibold' : 'text-text-muted hover:text-text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative flex items-center justify-center p-1 rounded-xl transition-all ${isActive ? 'bg-accent-soft text-accent' : ''}`}>
                  <item.icon size={20} />
                </div>
                <span className="mt-0.5 text-[11px] leading-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* User Account Quick Toggle on Mobile */}
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="flex flex-1 flex-col items-center justify-center py-1 text-text-muted hover:text-text-primary transition-colors active:scale-95 cursor-pointer"
          aria-label="Account Settings"
        >
          <Avatar name={user.name} size="sm" />
          <span className="mt-0.5 text-[11px] leading-tight">Account</span>
        </button>
      </nav>

      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  )
}
