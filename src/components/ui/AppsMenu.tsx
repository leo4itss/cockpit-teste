import { Bot, School, AppWindow } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Popover } from './Popover'
import type { ReactNode } from 'react'

interface AppsMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

const apps = [
  {
    icon: Bot,
    label: 'Assistente IA',
    path: '/assistentes',
  },
  {
    icon: School,
    label: 'Base de conhecimento',
    path: '/conhecimento',
  },
  {
    icon: AppWindow,
    label: 'Home',
    path: '/home',
  },
]

export function AppsMenu({ open, onOpenChange, children }: AppsMenuProps) {
  const navigate = useNavigate()

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      content={
        <div className="flex flex-col gap-2 w-[240px]">
          <p className="text-base font-medium text-[#030712] px-4 pt-2 pb-1">Meus apps</p>
          <div className="flex flex-col gap-1">
            {apps.map(({ icon: Icon, label, path }) => (
              <button
                key={label}
                onClick={() => {
                  navigate(path)
                  onOpenChange?.(false)
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-[#030712] hover:bg-gray-100 rounded-md w-full text-left transition-colors"
              >
                <Icon className="w-4 h-4 text-gray-600 shrink-0" />
                <span className="flex-1 font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      }
    >
      {children}
    </Popover>
  )
}
