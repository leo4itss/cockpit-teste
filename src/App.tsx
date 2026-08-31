import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DetailLayout } from './components/DetailLayout'
import { OrganizacoesPage } from './pages/OrganizacoesPage'
import { OrganizacaoDetailPage } from './pages/OrganizacaoDetailPage'
import { RedirecionaParaOrganizacao } from './pages/RedirecionaParaOrganizacao'
import { HomePage } from './pages/HomePage'
import { ComponentesProvider } from './context/ComponentesContext'
import { UsersProvider } from './context/UsersContext'
import { AuthProvider } from './context/AuthContext'
import { GruposPage } from './pages/GruposPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { ContasPage } from './pages/ContasPage'
import { InstanciaPage } from './pages/InstanciaPage'
import { ProvisionamentoPage } from './pages/ProvisionamentoPage'
import { FigmaCaptureSession } from './components/FigmaCaptureSession'

export default function App() {
  return (
    <AuthProvider>
    <UsersProvider>
    <ComponentesProvider>
    <BrowserRouter>
      <FigmaCaptureSession />
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="organizacoes" element={<OrganizacoesPage />} />
          <Route path="grupos"       element={<GruposPage />} />
          <Route path="usuarios"     element={<UsuariosPage />} />
          <Route path="contas"       element={<ContasPage />} />
          {/* Absorvidas pelas abas da organização (Figma). Continuam como
              rota para não quebrar link salvo — mas só redirecionam. */}
          <Route path="acessos"     element={<RedirecionaParaOrganizacao aba="usuarios" />} />
          <Route path="componentes" element={<RedirecionaParaOrganizacao aba="componentes" />} />
          <Route path="canvas"      element={<RedirecionaParaOrganizacao aba="canvas" />} />
          <Route path="canvas-org"  element={<RedirecionaParaOrganizacao aba="canvas-org" />} />
          <Route path="schema"      element={<RedirecionaParaOrganizacao aba="schema" />} />
        </Route>
        <Route path="/instancia/:id" element={<InstanciaPage />} />
        <Route path="/organizacoes/:id" element={<DetailLayout />}>
          <Route index element={<OrganizacaoDetailPage />} />
        </Route>
        <Route path="/contas/:id/provisionamento" element={<DetailLayout />}>
          <Route index element={<ProvisionamentoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ComponentesProvider>
    </UsersProvider>
    </AuthProvider>
  )
}
