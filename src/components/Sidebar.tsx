import { NavLink, useNavigate } from 'react-router-dom'
import { Building2, Users, PanelLeft, Puzzle, Network, GitFork, Globe2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsPlatformAdmin, useIsOrgAdmin, useIsPasArchitect, useIsAccountAdmin } from '@/authz'

// ── Logo ITSS ─────────────────────────────────────────────────

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

// ── NavItem reutilizável ──────────────────────────────────────

function NavItem({
  to,
  icon: Icon,
  label,
  collapsed,
}: {
  to: string
  icon: React.ElementType
  label: string
  collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 h-8 px-2 rounded-md text-sm transition-colors',
          collapsed && 'justify-center',
          isActive
            ? 'bg-[#111827] text-[#f9fafb] font-medium'
            : 'text-[#030712] hover:bg-[#e5e7eb] hover:text-[#111827] font-normal'
        )
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="whitespace-nowrap">{label}</span>}
    </NavLink>
  )
}

// ── Divisor de seção ──────────────────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="border-t border-[#e5e7eb] mx-1 my-1" />
  }
  return (
    <div className="h-7 flex items-center px-2 mt-1">
      <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider leading-none">
        {label}
      </span>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean
  onCollapse: (val: boolean) => void
}

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const navigate = useNavigate()

  // Perfis do usuário atual (via AuthContext → engine FGA)
  const isPlatformAdmin = useIsPlatformAdmin()
  const isOrgAdmin      = useIsOrgAdmin()
  const isPasArchitect  = useIsPasArchitect()
  const isAccountAdmin  = useIsAccountAdmin()

  // Derivados de visibilidade por perfil
  // Account Admin puro: só tem papel de account_admin, nenhum outro
  const isAccountAdminOnly = isAccountAdmin && !isPlatformAdmin && !isOrgAdmin && !isPasArchitect

  // PAS Architect puro: só tem esse papel (sem platform_admin, org_admin, account_admin)
  const isPasArchitectOnly = isPasArchitect && !isPlatformAdmin && !isOrgAdmin && !isAccountAdmin

  // Itens visíveis para cada grupo
  const showOrganizacoes = !isAccountAdminOnly   // todos exceto Account Admin puro
  const showAcessos      = !isPasArchitectOnly   // PAS Architect puro não vê Acessos
  const showComponentes  = isPlatformAdmin || isPasArchitect  // só quem gerencia componentes

  return (
    <aside
      className={cn(
        'min-h-screen bg-[#f9fafb] border-r border-[#e5e7eb] flex flex-col shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-[52px]' : 'w-64'
      )}
    >
      {/* Header / Logo */}
      <div className="bg-white p-2 shrink-0">
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded-md',
            collapsed && 'justify-center'
          )}
        >
          <div
            onClick={() => navigate('/home')}
            className="bg-[#f9fafb] rounded-lg shrink-0 flex items-center justify-center w-8 h-8 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <ITSSIcon />
          </div>

          {!collapsed && (
            <>
              <span className="flex-1 font-semibold text-sm text-[#030712] whitespace-nowrap overflow-hidden min-w-0">
                ITSS
              </span>
              <button
                onClick={e => { e.stopPropagation(); onCollapse(true) }}
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
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        <div className="p-2 flex flex-col shrink-0">

          {/* ── Organizações ── */}
          {showOrganizacoes && (
            <>
              <SectionLabel label="Organizações" collapsed={collapsed} />
              <div className="flex flex-col gap-1">
                <NavItem to="/organizacoes" icon={Building2} label="Organizações" collapsed={collapsed} />
              </div>
            </>
          )}

          {/* ── Permissões ── */}
          {showAcessos && (
            <>
              <SectionLabel label="Permissões" collapsed={collapsed} />
              <div className="flex flex-col gap-1">
                <NavItem to="/acessos" icon={Users} label="Permissões" collapsed={collapsed} />
              </div>
            </>
          )}

          {/* ── Componentes ── */}
          {showComponentes && (
            <>
              <SectionLabel label="Componentes" collapsed={collapsed} />
              <div className="flex flex-col gap-1">
                <NavItem to="/componentes" icon={Puzzle} label="Componentes" collapsed={collapsed} />
              </div>
            </>
          )}

          {/* ── Visualização ── */}
          {(isPlatformAdmin || isOrgAdmin || isAccountAdmin) && (
            <>
              <SectionLabel label="Visualização" collapsed={collapsed} />
              <div className="flex flex-col gap-1">
                {isPlatformAdmin && (
                  <>
                    <NavItem to="/canvas-org" icon={Globe2}  label="Canvas Org" collapsed={collapsed} />
                    <NavItem to="/canvas"     icon={GitFork} label="Canvas"     collapsed={collapsed} />
                    <NavItem to="/schema"     icon={Network} label="Schema"     collapsed={collapsed} />
                  </>
                )}
                {isOrgAdmin && !isPlatformAdmin && (
                  <NavItem to="/canvas" icon={GitFork} label="Canvas" collapsed={collapsed} />
                )}
                {isAccountAdminOnly && (
                  <NavItem to="/canvas" icon={GitFork} label="Canvas" collapsed={collapsed} />
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </aside>
  )
}
