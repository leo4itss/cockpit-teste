import { Outlet, useNavigate } from 'react-router-dom'
import { Undo2, LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import { AppsMenu } from './ui/AppsMenu'

export function DetailLayout() {
  const navigate = useNavigate()
  const [openApps, setOpenApps] = useState(false)

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header — back à esquerda, ícones à direita */}
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-8 shrink-0">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
          title="Voltar"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Right icons */}
        <div className="flex items-center gap-4">
          <AppsMenu open={openApps} onOpenChange={setOpenApps}>
            <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors">
              <LayoutGrid className="w-4 h-4" />
            </button>
          </AppsMenu>
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200 cursor-pointer shrink-0">
            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
              U
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
