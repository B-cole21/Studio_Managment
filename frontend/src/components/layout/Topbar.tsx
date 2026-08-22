import { PanelLeftClose, PanelLeft, Moon, Sun, CalendarDays } from 'lucide-react'
import { useStore } from '../../lib/store'
import { IconButton } from '../ui/Button'
import { Tooltip } from '../ui/Tooltip'
import { formatDate, todayISO } from '../../lib/format'

export function Topbar() {
  const collapsed = useStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-1 px-3">
      <IconButton
        label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        icon={collapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
        onClick={toggleSidebar}
      />

      <span className="ml-1 hidden items-center gap-1.5 text-[13px] text-text-secondary md:flex">
        <CalendarDays size={14} className="text-text-muted" />
        {formatDate(todayISO())}
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton
            label="Toggle theme"
            icon={theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        </Tooltip>
      </div>
    </header>
  )
}
