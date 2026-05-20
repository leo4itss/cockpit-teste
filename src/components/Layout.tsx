import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <TopBar collapsed={collapsed} onExpand={() => setCollapsed(false)} />
        <main className="flex-1 overflow-auto min-h-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
