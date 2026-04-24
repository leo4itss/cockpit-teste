import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DetailLayout } from './components/DetailLayout'
import { OrganizacoesPage } from './pages/OrganizacoesPage'
import { OrganizacaoDetailPage } from './pages/OrganizacaoDetailPage'
import { AcessosPage } from './pages/AcessosPage'
import { GruposPage } from './pages/GruposPage'
import { HomePage } from './pages/HomePage'
import { ComponentesPage } from './pages/ComponentesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="organizacoes" element={<OrganizacoesPage />} />
          <Route path="acessos" element={<AcessosPage />} />
          <Route path="componentes" element={<ComponentesPage />} />
        </Route>
        <Route path="/organizacoes/:id" element={<DetailLayout />}>
          <Route index element={<OrganizacaoDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
