import { ExternalLink } from 'lucide-react'
import { Card, SectionTitle, Field, CopyButton } from './ProvisioningCard'
import type { TenantInfo } from '@/types'
import { Link } from 'react-router-dom'
import { formatarData } from '@/lib/datas'

export function TenantInfoCard({ tenant, onCopy }: { tenant: TenantInfo; onCopy?: () => void }) {
  return (
    <Card className="flex flex-col gap-5">
      <SectionTitle>Informações do tenant</SectionTitle>

      <div className="grid grid-cols-2 gap-5">
        <Field label="Slug" value={tenant.slug} mono />
        <Field label="Ambiente" value={tenant.ambiente} />

        <div className="flex flex-col gap-2 col-span-2">
          <label className="text-sm font-medium text-[#030712]">Domínio</label>
          {tenant.dominio ? (
            <div className="h-9 w-full rounded-md bg-[#f3f4f6] px-3 flex items-center gap-2">
              <span className="text-sm text-[#2563eb] font-mono truncate flex-1">{tenant.dominio}</span>
              <CopyButton text={tenant.dominio} onCopy={onCopy} />
              <a
                href={tenant.dominio}
                target="_blank"
                rel="noreferrer"
                className="text-[#6b7280] hover:text-[#030712] transition-colors shrink-0"
                title="Abrir tenant"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="h-9 w-full rounded-md bg-[#f3f4f6] px-3 flex items-center">
              <span className="text-sm text-[#9ca3af]">Subdomínio não configurado — não é possível montar o domínio do tenant.</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#030712]">Organização</label>
          <Link
            to={`/organizacoes/${tenant.orgId}`}
            className="h-9 w-full rounded-md bg-[#f3f4f6] px-3 flex items-center text-sm text-[#2563eb] hover:underline truncate"
          >
            {tenant.orgNome || 'Ver organização'}
          </Link>
        </div>

        <Field label="Criado em" value={formatarData(tenant.criadoEm)} />
      </div>
    </Card>
  )
}
