import { Copy, MessageCircle, Mail, ExternalLink } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
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
      <div className="h-9 w-full rounded-md bg-[#f3f4f6] px-3 flex items-center">
        <span className="text-sm text-[#6b7280] truncate">{value || '—'}</span>
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
  if (status === 'Ativo' || status === 'Criado') {
    return <Badge variant="success" showIcon>{status}</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}

/* ── main component ─────────────────────────────────────── */

export function AccountDetailSheet({ open, onClose, account, org, onEdit }: Props) {
  if (!account || !org) return null

  const accessUrl = `http://${account.subdomain}.hml.pas.app.br/assistant`

  const enderecoPartes = [
    account.endereco || org.address,
    [account.cidade || org.city, account.estado || org.state].filter(Boolean).join(' - '),
  ].filter(Boolean)
  const enderecoFormatado = enderecoPartes.join(' | ')

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Detalhes da Conta"
      width="w-[640px]"
      headerAction={onEdit ? (
        <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
      ) : undefined}
    >
      <div className="flex flex-col gap-7">

        {/* Cabeçalho: logo + nome + status */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 border border-[#e5e7eb] flex items-center justify-center text-base font-bold text-gray-500 shrink-0 overflow-hidden">
            {account.logo
              ? <img src={account.logo} alt="" className="w-full h-full object-cover" />
              : <span>{account.name.charAt(0)}</span>
            }
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-base font-semibold text-[#030712] leading-6 truncate">{account.name}</p>
            <StatusBadge status={account.status} />
          </div>
        </div>

        {/* Favicon + Banner */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center overflow-hidden shrink-0">
              {account.logo
                ? <img src={account.logo} alt="favicon" className="w-full h-full object-cover" />
                : <span className="text-xs text-[#9ca3af]">—</span>
              }
            </div>
            <span className="text-sm font-medium text-[#030712]">Favicon</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center overflow-hidden shrink-0">
              {account.logo
                ? <img src={account.logo} alt="banner" className="w-full h-full object-cover" />
                : <span className="text-xs text-[#9ca3af]">—</span>
              }
            </div>
            <span className="text-sm font-medium text-[#030712]">Banner</span>
          </div>
        </div>

        <Divider />

        {/* Informações básicas */}
        <div className="flex flex-col gap-5">
          <SectionTitle>Informações básicas</SectionTitle>

          <ReadonlyField label="Nome" value={account.name} required />

          {/* URL de acesso */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[#030712]">URL de acesso</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 h-9 rounded-md bg-[#f3f4f6] px-3">
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

          <ReadonlyField label="Razão social" value={account.razaoSocial || org.razaoSocial} required />
          <ReadonlyField label="Descrição" value={account.descricao} />
          <ReadonlyField label={account.tipoDocumento || org.docType || 'CNPJ'} value={account.numeroDocumento || org.docNumber} />
          <ReadonlyField label="Segmento de negócio" value={account.segmentoNegocio || org.businessSegment} />
          <ReadonlyField label="Data de cadastro" value={account.createdAt} />
          <ReadonlyField label="Site oficial" value={account.siteOficial || org.officialSite} required />
        </div>

        <Divider />

        {/* Endereço */}
        <div className="flex flex-col gap-3">
          <SectionTitle>Endereço</SectionTitle>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-[#030712]">Endereço postal</p>
            <p className="text-sm text-[#6b7280]">{enderecoFormatado || '—'}</p>
          </div>
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
          {(!account.admins || account.admins.length === 0) ? (
            <p className="text-sm text-[#9ca3af]">Nenhum usuário administrador cadastrado.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {account.admins.map((admin, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#030712]">{admin.nome} {admin.sobrenome}</p>
                    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2563eb] text-white">
                      Admin
                    </span>
                  </div>
                  <p className="text-sm text-[#6b7280]">{admin.email}</p>
                  <p className="text-sm text-[#9ca3af]">@{admin.usuario}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Sheet>
  )
}
