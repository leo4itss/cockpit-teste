/**
 * Resolve as rotas absorvidas pelas abas da organização.
 *
 * No desenho do Figma, Acessos e as telas de visualização deixam de existir
 * como destinos próprios: tudo o que se faz numa organização vive dentro dela,
 * como aba. Esta rota absorve os links antigos (`/acessos`, `/canvas`,
 * `/canvas-org`, `/schema`) e manda cada papel para o seu lugar.
 *
 * O account admin conhece a própria conta mas não a organização dela — daí a
 * ida à API. Por isso é uma rota e não um <Navigate> estático.
 */

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '@/api/client'
import { accounts as mockAccounts } from '@/data/mock'
import {
  useIsPlatformAdmin,
  useIsOrgAdmin,
  useAdminOrgId,
  useAdminAccountId,
} from '@/authz/hooks'

/** Aba de destino — cada rota absorvida entra numa. */
export function RedirecionaParaOrganizacao({ aba }: { aba: string }) {
  const isPlatformAdmin = useIsPlatformAdmin()
  const isOrgAdmin      = useIsOrgAdmin()
  const adminOrgId      = useAdminOrgId()
  const adminAccountId  = useAdminAccountId()

  const [destino, setDestino] = useState<string | null>(null)

  useEffect(() => {
    // Org admin: a organização é a dele.
    if (isOrgAdmin && adminOrgId) {
      setDestino(`/organizacoes/${adminOrgId}?aba=${aba}`)
      return
    }

    // Account admin: sabe a conta, precisa descobrir a organização dela.
    if (adminAccountId) {
      const paraOrg = (orgId?: string) =>
        setDestino(orgId ? `/organizacoes/${orgId}?aba=${aba}` : '/organizacoes')
      api.getAccount(adminAccountId)
        .then((acc: any) => paraOrg(acc?.orgId))
        // Sem backend, o mock responde — mesmo padrão do resto do app.
        .catch(() => paraOrg(mockAccounts.find(a => a.id === adminAccountId)?.orgId))
      return
    }

    // Platform admin (e qualquer outro): escolhe a organização primeiro.
    setDestino('/organizacoes')
  }, [isPlatformAdmin, isOrgAdmin, adminOrgId, adminAccountId, aba])

  if (!destino) return null
  return <Navigate to={destino} replace />
}
