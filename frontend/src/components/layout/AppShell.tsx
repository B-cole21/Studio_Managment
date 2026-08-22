import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastRegion } from '../ui/Toast'
import { useStore } from '../../lib/store'

export function AppShell() {
  const loadData = useStore((s) => s.loadData)
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed)

  useEffect(() => {
    loadData().catch(() => {
      /* backend unavailable — keep mock data */
    })
  }, [loadData])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-text-primary">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className={`mx-auto w-full transition-all duration-300 px-4 py-6 sm:px-6 lg:px-8 ${sidebarCollapsed ? 'max-w-none' : 'max-w-[1440px]'}`}>
            <Outlet />
          </div>
        </main>
      </div>

      <ToastRegion />
    </div>
  )
}
