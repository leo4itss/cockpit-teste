import { NavLink, useNavigate } from 'react-router-dom'
import { Building2, Users, PanelLeft, Puzzle } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITSSIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="14" fill="url(#itss-grad)"/>
    <path d="M9 8.5C9 7.67 9.67 7 10.5 7H12V21H10.5C9.67 21 9 20.33 9 19.5V8.5Z" fill="white"/>
    <path d="M13.5 7H17.5C18.88 7 20 8.12 20 9.5C20 10.88 18.88 12 17.5 12H13.5V7Z" fill="white" fillOpacity="0.85"/>
    <path d="M13.5 13H18C19.1 13 20 13.9 20 15C20 16.1 19.1 17 18 17H13.5V13Z" fill="white" fillOpacity="0.65"/>
    <defs>
      <linearGradient id="itss-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B"/>
        <stop offset="1" stopColor="#D97706"/>
      </linearGradient>
    </defs>
  </svg>
)

interface SidebarProps {
  collapsed: boolean
  onCollapse: (val: boolean) => void
}

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const navigate = useNavigate()

  return (
    <aside
      className={cn(
        'min-h-screen bg-white border-r border-gray-200 flex flex-col shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-[52px]' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-2 shrink-0">
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded-md',
            collapsed && 'justify-center'
          )}
        >
          {/* Logo */}
          <div
            onClick={() => navigate('/home')}
            className="bg-gray-50 rounded-lg shrink-0 flex items-center justify-center w-8 h-8 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <ITSSIcon />
          </div>

          {!collapsed && (
            <>
              <span className="flex-1 font-semibold text-sm text-[#030712] whitespace-nowrap overflow-hidden min-w-0">
                ITSS
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCollapse(true)
                }}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                title="Recolher sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Group: Assistentes */}
        <div className="p-2 flex flex-col shrink-0">
          {!collapsed && (
            <div className="h-8 flex items-center px-2 opacity-70">
              <span className="text-xs font-medium text-[#030712] leading-none">
                Assistentes
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <NavLink
              to="/organizacoes"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 h-8 px-2 rounded-md text-sm transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-gray-100 text-[#111827] font-medium'
                    : 'text-[#030712] hover:bg-gray-100 font-normal'
                )
              }
            >
              <Building2 className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">Organizações</span>}
            </NavLink>

            <NavLink
              to="/acessos"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 h-8 px-2 rounded-md text-sm transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-gray-100 text-[#111827] font-medium'
                    : 'text-[#030712] hover:bg-gray-100 font-normal'
                )
              }
            >
              <Users className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">Acessos</span>}
            </NavLink>

            <NavLink
              to="/componentes"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 h-8 px-2 rounded-md text-sm transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-gray-100 text-[#111827] font-medium'
                    : 'text-[#030712] hover:bg-gray-100 font-normal'
                )
              }
            >
              <Puzzle className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">Componentes</span>}
            </NavLink>
          </div>
        </div>
      </div>
    </aside>
  )
}
