import { Search, LayoutGrid, PanelLeft } from 'lucide-react'
import { useState } from 'react'
import { SettingsMenu } from './ui/SettingsMenu'
import { ProfileModal } from './ui/ProfileModal'
import { AppsMenu } from './ui/AppsMenu'

interface TopBarProps {
  collapsed: boolean
  onExpand: () => void
}

export function TopBar({ collapsed, onExpand }: TopBarProps) {
  const [query, setQuery] = useState('')
  const [openApps, setOpenApps] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center px-8 gap-3 shrink-0">
      {/* Expand button — aparece somente quando a sidebar está colapsada */}
      {collapsed && (
        <button
          onClick={onExpand}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
          title="Expandir sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] w-[228px] shrink-0">
        <input
          type="text"
          placeholder="Pesquisar"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="text-sm bg-transparent outline-none text-[#030712] placeholder:text-gray-500 font-medium flex-1 min-w-0"
        />
        <Search className="w-4 h-4 text-gray-400 shrink-0 opacity-50" />
      </div>

      <div className="flex-1" />

      {/* Icons */}
      <div className="flex items-center gap-4">
        <AppsMenu open={openApps} onOpenChange={setOpenApps}>
          <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors">
            <LayoutGrid className="w-4 h-4" />
          </button>
        </AppsMenu>
        <SettingsMenu
          open={openSettings}
          onOpenChange={setOpenSettings}
          onProfileClick={() => {
            setOpenProfile(true)
            setOpenSettings(false)
          }}
          onLogoutClick={() => {
            // TODO: Implementar logout
            console.log('Logout clicked')
          }}
        >
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200 cursor-pointer shrink-0 hover:ring-gray-300 transition-colors">
            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
              M
            </div>
          </div>
        </SettingsMenu>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        open={openProfile}
        onOpenChange={setOpenProfile}
        onSave={() => {
          // TODO: Implementar save de perfil
          console.log('Profile saved')
          setOpenProfile(false)
        }}
      />
    </header>
  )
}
