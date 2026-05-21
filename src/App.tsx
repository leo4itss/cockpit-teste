import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DetailLayout } from './components/DetailLayout'
import { OrganizacoesPage } from './pages/OrganizacoesPage'
import { OrganizacaoDetailPage } from './pages/OrganizacaoDetailPage'
import { AcessosPage } from './pages/AcessosPage'
import { HomePage } from './pages/HomePage'
import { ComponentesPage } from './pages/ComponentesPage'
import { ComponentesProvider } from './context/ComponentesContext'
import { UsersProvider } from './context/UsersContext'
import { AuthProvider } from './context/AuthContext'
import { GruposPage } from './pages/GruposPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { ContasPage } from './pages/ContasPage'
import SchemaVisualizerPage from './pages/SchemaVisualizerPage'
import CanvasPermissoesPage from './pages/CanvasPermissoesPage'
import CanvasOrgPage from './pages/CanvasOrgPage'

export default function App() {
  return (
    <AuthProvider>
    <UsersProvider>
    <ComponentesProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="organizacoes" element={<OrganizacoesPage />} />
          <Route path="acessos"      element={<AcessosPage />} />
          <Route path="componentes"  element={<ComponentesPage />} />
          <Route path="grupos"       element={<GruposPage />} />
          <Route path="usuarios"     element={<UsuariosPage />} />
          <Route path="contas"       element={<ContasPage />} />
          <Route path="schema"       element={<SchemaVisualizerPage />} />
          <Route path="canvas"       element={<CanvasPermissoesPage />} />
        </Route>
        <Route path="/organizacoes/:id" element={<DetailLayout />}>
          <Route index element={<OrganizacaoDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ComponentesProvider>
    </UsersProvider>
    </AuthProvider>
  )
}
