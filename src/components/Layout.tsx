import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar collapsed={collapsed} onExpand={() => setCollapsed(false)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
