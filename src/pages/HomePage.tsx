import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Database, School, Settings2, LayoutGrid, UserRound, Circle, Network, UserRoundCog } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Popover } from '@/components/ui/Popover'
import { SettingsMenu } from '@/components/ui/SettingsMenu'
import { ProfileModal } from '@/components/ui/ProfileModal'
import { AppsMenu } from '@/components/ui/AppsMenu'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ─── Logo ────────────────────────────────────────────────────────────────────

const ITSSLogo = ({ onClick }: { onClick?: () => void }) => (
  <div className="flex items-center gap-2.5 cursor-pointer" onClick={onClick}>
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="14" fill="url(#home-logo-grad)" />
      <path d="M9 8.5C9 7.67 9.67 7 10.5 7H12V21H10.5C9.67 21 9 20.33 9 19.5V8.5Z" fill="white" />
      <path d="M13.5 7H17.5C18.88 7 20 8.12 20 9.5C20 10.88 18.88 12 17.5 12H13.5V7Z" fill="white" fillOpacity="0.85" />
      <path d="M13.5 13H18C19.1 13 20 13.9 20 15C20 16.1 19.1 17 18 17H13.5V13Z" fill="white" fillOpacity="0.65" />
      <defs>
        <linearGradient id="home-logo-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
    </svg>
    <span className="font-semibold text-sm tracking-wide text-[#030712]">itss</span>
  </div>
)

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActiveSolution {
  icon: LucideIcon
  title: string
  description: string
}

interface MarketplaceSolution {
  icon: LucideIcon
  title: string
  description: string
  status: 'available' | 'soon'
}

// ─── Data ────────────────────────────────────────────────────────────────────

const activeSolutions: ActiveSolution[] = [
  {
    icon: Bot,
    title: 'Assistentes',
    description: 'Assistentes de IA para apoiar tarefas e decisões.',
  },
  {
    icon: Database,
    title: 'Solução XYPTO',
    description: 'Descrição da Solução XPTO',
  },
]

const marketplaceSolutions: MarketplaceSolution[] = [
  {
    icon: School,
    title: 'Trilhas de aprendizado',
    description: 'Trilhas guiadas para aprendizado e evolução contínua.',
    status: 'soon',
  },
  {
    icon: Database,
    title: 'Base de conhecimento',
    description: 'Repositório central de conteúdos e documentos.',
    status: 'available',
  },
  {
    icon: Circle,
    title: 'Solução 05',
    description: 'Descrição breve da solução',
    status: 'soon',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function IconBox({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <div
      className={cn(
        'w-8 h-8 rounded-[6px] bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0',
        className
      )}
    >
      <Icon className="w-4 h-4 text-gray-600" />
    </div>
  )
}

function ActiveSolutionCard({ icon, title, description }: ActiveSolution) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] flex flex-col justify-between py-6 overflow-hidden w-full h-full">
      {/* Content */}
      <div className="flex flex-col items-start px-6 w-full">
        <div className="flex gap-4 items-start w-full">
          <IconBox icon={icon} />
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <p className="text-sm font-medium text-[#030712] leading-4">{title}</p>
            <p className="text-sm text-gray-500 leading-5">{description}</p>
          </div>
          <div className="flex items-start justify-end self-stretch shrink-0">
            <Badge variant="success">Ativo</Badge>
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="flex flex-col items-start px-6 w-full mt-6">
        <div className="flex gap-2 items-center">
          <Button size="md">Acessar</Button>
          <Button variant="ghost" size="md">Saiba mais</Button>
        </div>
      </div>
    </div>
  )
}

function MarketplaceCard({ icon, title, description, status }: MarketplaceSolution) {
  const isSoon = status === 'soon'

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] flex flex-col gap-6 py-6 overflow-hidden w-full">
      {/* Content */}
      <div className="flex flex-col items-start px-6 w-full">
        <div className="flex gap-4 items-start w-full">
          <IconBox icon={icon} />
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <p className="text-sm font-medium text-[#030712] leading-4">{title}</p>
            <p className="text-sm text-gray-500 leading-5">{description}</p>
          </div>
          <div className="flex items-start justify-end self-stretch shrink-0">
            {isSoon ? (
              <Badge variant="secondary">Em breve</Badge>
            ) : (
              <Badge variant="success">Disponível</Badge>
            )}
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="flex flex-col items-start px-6 w-full">
        <div className="flex gap-2 items-center">
          <Button size="md" disabled={isSoon}>Adquirir</Button>
          <Button variant="ghost" size="md">Saiba mais</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate()
  const [openPopover, setOpenPopover] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)
  const today = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
        <ITSSLogo onClick={() => navigate('/home')} />
        <div className="flex items-center gap-4">
          <Popover
            open={openPopover}
            onOpenChange={setOpenPopover}
            content={
              <div className="flex flex-col gap-4 min-w-[200px]">
                <p className="text-base font-medium text-[#030712]">Gerenciamento</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      navigate('/organizacoes')
                      setOpenPopover(false)
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#111827] hover:bg-gray-100 rounded-md w-full text-left transition-colors"
                  >
                    <Network className="w-4 h-4 shrink-0" />
                    <span>Organizações</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/acessos')
                      setOpenPopover(false)
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#111827] hover:bg-gray-100 rounded-md w-full text-left transition-colors"
                  >
                    <UserRoundCog className="w-4 h-4 shrink-0" />
                    <span>Acessos</span>
                  </button>
                </div>
              </div>
            }
          >
            <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors">
              <Settings2 className="w-4 h-4" />
            </button>
          </Popover>
          <AppsMenu>
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
            onLogoutClick={() => console.log('Logout clicked')}
          >
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-gray-300 transition-all">
              <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                L
              </div>
            </div>
          </SettingsMenu>
        </div>
      </header>

      <ProfileModal
        open={openProfile}
        onOpenChange={setOpenProfile}
        onSave={() => {
          console.log('Profile saved')
          setOpenProfile(false)
        }}
      />

      {/* Main */}
      <main className="flex-1 overflow-auto bg-white p-8 flex justify-center">
        <div className="flex flex-col gap-12 items-center w-full max-w-[1200px]">

          {/* Welcome banner */}
          <div className="bg-blue-600 rounded-xl p-6 w-full shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.1)]">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-white/80 leading-5 first-letter:capitalize">
                {today}
              </p>
              <div className="flex items-center gap-2">
                <UserRound className="w-5 h-5 text-white shrink-0" />
                <p className="text-lg font-semibold text-white leading-7">
                  Olá, LEONARDO LINS
                </p>
              </div>
            </div>
          </div>

          {/* Aplicações e Soluções Disponíveis */}
          <section className="bg-gray-100 border border-gray-200 rounded-xl p-6 w-full shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col gap-6 w-full max-w-[1280px]">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-[#030712] leading-7">
                  Aplicações e Soluções Disponíveis
                </h2>
                <p className="text-sm text-gray-500 leading-5">
                  Escolha por onde começar ou continue de onde parou.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {activeSolutions.map((solution) => (
                  <ActiveSolutionCard key={solution.title} {...solution} />
                ))}
              </div>
            </div>
          </section>

          {/* Marketplace */}
          <section className="bg-gray-100 border border-gray-200 rounded-xl p-6 w-full shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col gap-6 w-full max-w-[1280px]">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-[#030712] leading-7">
                  Marketplace
                </h2>
                <p className="text-sm text-gray-500 leading-5">
                  Descubra novas soluções, trilhas e recursos para expandir o uso do PAS conforme suas necessidades.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {marketplaceSolutions.map((solution) => (
                  <MarketplaceCard key={solution.title} {...solution} />
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
