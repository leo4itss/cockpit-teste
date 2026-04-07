import { Globe, LogOut, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { Popover } from './Popover'
import type { ReactNode } from 'react'

interface SettingsMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onProfileClick?: () => void
  onLogoutClick?: () => void
  children: ReactNode
}

export function SettingsMenu({
  open,
  onOpenChange,
  onProfileClick,
  onLogoutClick,
  children,
}: SettingsMenuProps) {
  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      content={
        <div className="flex flex-col gap-2 w-[384px]">
          {/* Perfil Item */}
          <button
            onClick={onProfileClick}
            className="flex items-center gap-4 px-4 py-4 w-full text-left hover:bg-gray-50 rounded-md transition-colors"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
              M
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <p className="text-sm font-medium text-[#030712] leading-4">Marcelo Gomes</p>
              <p className="text-sm text-gray-500 truncate leading-5">marcelo.gomes@grupoitss.com.br</p>
            </div>
            {/* Action */}
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </button>

          {/* Separator */}
          <div className="h-px bg-gray-200 w-full" />

          {/* Idioma Item */}
          <div className="flex items-center gap-4 px-4 py-4 w-full rounded-md">
            <Globe className="w-5 h-5 text-gray-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#030712]">Idioma</p>
            </div>
            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors shrink-0">
              <span>Português (Brasil)</span>
              <ChevronsUpDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Separator */}
          <div className="h-px bg-gray-200 w-full" />

          {/* Logout Item */}
          <button
            onClick={onLogoutClick}
            className="flex items-center gap-4 px-4 py-4 w-full text-left hover:bg-gray-50 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#030712]">Sair</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </button>
        </div>
      }
    >
      {children}
    </Popover>
  )
}
