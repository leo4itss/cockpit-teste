import { Copy, Phone, Mail, ExternalLink, CircleAlert, Trash2 } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { ProvisioningDots } from './ProvisioningDots'
import type { Account, Organization } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  account: Account | null
  org: Organization | null
  onEdit?: () => void
  onDelete?: (account: Account) => void
}

/* ── helpers ───────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-[#030712]">{children}</p>
}

function Divider() {
  return <div className="border-t border-gray-100" />
}

function Field({
  label,
  value,
  required,
}: {
  label: string
  value?: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-[#030712]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      <p className="text-sm text-gray-500">{value || '—'}</p>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
      title="Copiar"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  )
}

function StatusBadge({ status }: { status: Account['status'] }) {
  const styles = {
    Criado:  'bg-green-100 text-green-700',
    Ativo:   'bg-blue-100 text-blue-700',
    Inativo: 'bg-gray-100 text-gray-500',
  }[status]

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${styles}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

/* ── main component ─────────────────────────────────────── */

export function AccountDetailSheet({ open, onClose, account, org, onEdit }: Props) {
  if (!account || !org) return null

  const accessUrl = `http://${account.subdomain}.hml.pas.app.br/assistant`
  const addressLine = [org.address, `${org.city} · ${org.state}`].filter(Boolean).join(' | ')

  return (
    <Sheet open={open} onClose={onClose} title="Detalhes da Conta" width="w-[768px]">
      <div className="flex flex-col gap-6">

        {/* Account header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
              {account.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#030712]">{account.name}</p>
              <StatusBadge status={account.status} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
        </div>

        <Divider />

        {/* Informações básicas */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Informações básicas</SectionTitle>
          <div className="flex flex-col gap-6">
            <Field label="Nome" value={account.name} required />

            {/* URL de acesso — com copy + link */}
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium text-[#030712]">URL de acesso</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1 border border-gray-200 rounded-md px-3 h-9 bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] min-w-0">
                  <p className="text-sm text-[#030712] truncate flex-1">{accessUrl}</p>
                  <CopyButton text={accessUrl} />
                </div>
                <a
                  href={accessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 border border-gray-200 rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] whitespace-nowrap transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  Acessar a solução
                </a>
              </div>
            </div>

            <Field label="Razão Social" value={org.razaoSocial} required />
            <Field label={org.docType} value={org.docNumber} />
            <Field label="Segmento de negócio" value={org.businessSegment} />
            <Field label="Data de cadastro" value={account.createdAt} />
            <Field label="Site oficial" value={org.officialSite} required />
          </div>
        </div>

        <Divider />

        {/* Provisionamento */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Provisionamento</SectionTitle>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-[#030712]">Status</p>
            <ProvisioningDots status={account.provisioningStatus} />
          </div>
        </div>

        <Divider />

        {/* Endereço */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Endereço</SectionTitle>
          <Field label="Endereço postal" value={addressLine} />
        </div>

        <Divider />

        {/* Contatos */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Contatos</SectionTitle>
          {org.contacts.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum contato cadastrado.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {org.contacts.map((c, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#030712]">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.role}</p>
                  </div>
                  <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 h-10 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      {c.phone}
                    </div>
                    <CopyButton text={c.phone} />
                  </div>
                  <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 h-10 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      {c.email}
                    </div>
                    <CopyButton text={c.email} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Usuários da conta */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Usuários da conta</SectionTitle>
          {/* Mock user — alinhado ao Figma */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#030712]">Leonardo Rocha</p>
              <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                Admin
              </span>
            </div>
            <p className="text-sm text-gray-500">grupoitss.teste@gmail.com</p>
            <p className="text-sm text-gray-400">@leo.lins</p>
          </div>
        </div>

      </div>

      {/* Footer danger zone */}
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
          <CircleAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 leading-snug">
            Excluir esta conta remove o tenant do ambiente: deleção do banco de dados, configuração no Cloudflare e recursos associados. Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex justify-end">
          <button className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4" />
            Excluir tenant
          </button>
        </div>
      </div>
    </Sheet>
  )
}
