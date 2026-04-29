import { Copy, MessageCircle, Mail, ExternalLink } from 'lucide-react'
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
}

/* ── helpers ───────────────────────────────────────────── */

function Divider() {
  return <div className="border-t border-[#e5e7eb]" />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
}

function ReadonlyField({ label, value, required }: { label: string; value?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-[#030712]">
        {label}{required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <div className="h-9 w-full rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3 flex items-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <span className="text-sm text-[#030712] truncate">{value || '—'}</span>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text)}
      className="text-[#6b7280] hover:text-[#030712] transition-colors shrink-0"
      title="Copiar"
    >
      <Copy className="w-4 h-4" />
    </button>
  )
}

function StatusBadge({ status }: { status: Account['status'] }) {
  const styles: Record<string, string> = {
    Criado:  'bg-[#dcfce7] text-[#16a34a]',
    Ativo:   'bg-[#dbeafe] text-[#2563eb]',
    Inativo: 'bg-[#f3f4f6] text-[#6b7280]',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? styles['Inativo']}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

/* ── main component ─────────────────────────────────────── */

export function AccountDetailSheet({ open, onClose, account, org, onEdit }: Props) {
  if (!account || !org) return null

  const accessUrl = `http://${account.subdomain}.hml.pas.app.br/assistant`

  return (
    <Sheet open={open} onClose={onClose} title="Detalhes da Conta" width="w-[640px]">
      <div className="flex flex-col gap-7">

        {/* Cabeçalho: logo + nome + status + Editar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 border border-[#e5e7eb] flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 overflow-hidden">
            {account.logo
              ? <img src={account.logo} alt="" className="w-full h-full object-cover" />
              : <span>{account.name.charAt(0)}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-[#030712] leading-6 truncate">{account.name}</p>
            <StatusBadge status={account.status} />
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
        </div>

        {/* Favicon + Banner */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <p className="text-xs font-medium text-[#6b7280]">Favicon</p>
            <div className="w-10 h-10 rounded-md bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center overflow-hidden">
              <span className="text-xs text-[#9ca3af]">—</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <p className="text-xs font-medium text-[#6b7280]">Banner</p>
            <div className="h-10 rounded-md bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center overflow-hidden">
              <span className="text-xs text-[#9ca3af]">—</span>
            </div>
          </div>
        </div>

        <Divider />

        {/* Informações básicas */}
        <div className="flex flex-col gap-5">
          <SectionTitle>Informações básicas</SectionTitle>

          <ReadonlyField label="Nome da conta" value={account.name} required />

          {/* URL de acesso */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[#030712]">URL de acesso</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 h-9 rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                <span className="text-sm text-[#030712] truncate flex-1">{accessUrl}</span>
                <CopyButton text={accessUrl} />
              </div>
              <a
                href={accessUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] whitespace-nowrap transition-colors shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#6b7280]" />
                Acessar a solução
              </a>
            </div>
          </div>

          <ReadonlyField label="Razão Social" value={org.razaoSocial} required />
          <ReadonlyField label={org.docType || 'Documento'} value={org.docNumber} />
          <ReadonlyField label="Segmento de negócio" value={org.businessSegment} />
          <ReadonlyField label="Data de cadastro" value={account.createdAt} />
          <ReadonlyField label="Site oficial" value={org.officialSite} required />
        </div>

        <Divider />

        {/* Provisionamento */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Provisionamento</SectionTitle>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[#030712]">Status</label>
            <ProvisioningDots status={account.provisioningStatus} />
          </div>
        </div>

        <Divider />

        {/* Endereço */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Endereço</SectionTitle>
          <ReadonlyField
            label="Endereço postal"
            value={[org.address, org.city, org.state].filter(Boolean).join(', ')}
          />
        </div>

        <Divider />

        {/* Contatos */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Contatos</SectionTitle>
          {org.contacts.length === 0 ? (
            <p className="text-sm text-[#6b7280]">Nenhum contato cadastrado.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {org.contacts.map((c, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div>
                    <p className="text-base font-semibold text-[#030712] leading-6">{c.name}</p>
                    {c.role && <p className="text-sm text-[#6b7280] leading-5">{c.role}</p>}
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-3 border border-[#e5e7eb] rounded-xl px-4 py-3">
                      <MessageCircle className="w-4 h-4 text-[#030712] shrink-0" />
                      <span className="flex-1 text-sm text-[#030712] truncate">{c.phone}</span>
                      <CopyButton text={c.phone} />
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-3 border border-[#e5e7eb] rounded-xl px-4 py-3">
                      <Mail className="w-4 h-4 text-[#030712] shrink-0" />
                      <span className="flex-1 text-sm text-[#030712] truncate">{c.email}</span>
                      <CopyButton text={c.email} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Usuários da conta */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Usuários da conta</SectionTitle>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#030712]">Leonardo Rocha</p>
              <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2563eb] text-white">
                Admin
              </span>
            </div>
            <p className="text-sm text-[#6b7280]">grupoitss.teste@gmail.com</p>
            <p className="text-sm text-[#9ca3af]">@leo.lins</p>
          </div>
        </div>

      </div>
    </Sheet>
  )
}
