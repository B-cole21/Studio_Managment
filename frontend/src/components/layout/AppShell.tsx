import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { ToastRegion } from '../ui/Toast'
import { useStore } from '../../lib/store'

export function AppShell() {
  const loadData = useStore((s) => s.loadData)
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    loadData().catch(() => {
      /* backend unavailable — keep mock data */
    })
  }, [loadData])

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex h-screen h-[100dvh] w-full max-w-full overflow-hidden bg-canvas text-text-primary">
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main
          ref={mainRef}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
        >
          <div className={`mx-auto w-full min-w-0 max-w-full transition-all duration-300 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 ${sidebarCollapsed ? 'max-w-none' : 'max-w-[1440px]'}`}>
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
      <ToastRegion />
    </div>
  )
}
