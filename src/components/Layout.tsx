import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'

/**
 * Shell das telas de lista (Organizações). Sem sidebar de navegação — no
 * desenho do Figma ela não existe: entra-se por Organizações, e tudo o que se
 * faz numa organização acontece nas abas dela. O TopBar traz a busca global e
 * o menu de apps.
 */
export function Layout() {
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <TopBar />
      <main className="flex-1 overflow-auto min-h-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
