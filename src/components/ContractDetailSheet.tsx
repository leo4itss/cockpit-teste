import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { ContractStatusBadge } from './ContractStatusBadge'
import { ProvisioningDots } from './ProvisioningDots'
import { History } from 'lucide-react'
import { PUBLICACAO_STEPS } from '@/services/provisioning'
import type { Contract } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  contract: Contract | null
  onEdit?: () => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
}

function Divider() {
  return <div className="border-t border-[#e5e7eb]" />
}

function ReadonlyField({ label, value, half }: { label: string; value?: string | number; half?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 ${half ? 'flex-1 min-w-0' : ''}`}>
      <label className="text-sm font-medium text-[#030712]">{label}</label>
      <div className="h-9 px-3 flex items-center bg-[#f3f4f6] rounded-md text-sm text-[#6b7280] truncate">
        {value ?? '—'}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  // Sem mascaramento: o rótulo exibido é o estado real. Antes, 'Criado' era
  // exibido como 'Ativo' — o mesmo antipadrão que o handoff 19/08/2026 veio
  // eliminar (nunca afirmar 'Ativo' antes de o provisionamento concluir).
  return (
    <div className="flex">
      <ContractStatusBadge status={status} />
    </div>
  )
}

function ObjetoField({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-sm font-semibold text-[#030712]">{label}</p>
      <p className="text-sm text-[#6b7280]">{value ?? '—'}</p>
    </div>
  )
}


export function ContractDetailSheet({ open, onClose, contract, onEdit }: Props) {

  if (!contract) return null

  const shortId = contract.id.length > 8 ? `${contract.id.substring(0, 8)}…` : contract.id

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Detalhe Contrato"
      width="w-[640px]"
      headerAction={onEdit ? (
        <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
      ) : undefined}
    >
      <div className="flex flex-col gap-6">

        {/* ── Identificação ─────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-semibold text-[#030712]">Contrato: {shortId}</p>
          <StatusBadge status={contract.status} />
        </div>

        <Divider />

        {/* ── Dados do contrato ─────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Dados do contrato</SectionTitle>
          <ReadonlyField label="Conta contratante" value={contract.contratante} />
        </div>

        <Divider />

        {/* ── Vigência ──────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Vigência</SectionTitle>
          <div className="flex gap-4 items-start">
            <ReadonlyField label="Data de início" value={contract.dataInicio} half />
            <ReadonlyField label="Data de fim" value={contract.dataTermino} half />
          </div>
        </div>

        <Divider />

        {/* ── Renovação ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Renovação</SectionTitle>
          <ReadonlyField label="Tipo de renovação" value={contract.renovacao} />
        </div>

        <Divider />

        {/* ── Objetos do contrato ───────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Objetos do contrato</SectionTitle>

          {contract.objetos.length === 0 ? (
            <p className="text-sm text-[#9ca3af]">Nenhum objeto adicionado.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {contract.objetos.map((obj, i) => (
                <div
                  key={i}
                  className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-4 flex flex-col gap-3"
                >
                  <ObjetoField label="Solução" value={obj.solucao} />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-[#030712]">Plano</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-[#6b7280]">{obj.plano || '—'}</p>
                      {obj.plano && obj.plano !== '—' && (
                        <span className="text-[11px] font-medium text-[#6b7280] bg-[#f3f4f6] border border-[#e5e7eb] px-1.5 py-0.5 rounded leading-none">
                          v{obj.planoVersao ?? 1}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Valores de licença contratados */}
                  {(() => {
                    // Linhas a exibir: preferência para valoresLicenca; fallback: parse da string licenciamento
                    const linhas: { nome: string; valor: string }[] =
                      obj.valoresLicenca && obj.valoresLicenca.length > 0
                        ? obj.valoresLicenca.map(v => ({
                            nome: v.tipoLicencaNome,
                            valor: v.valor
                              ? `${v.valor}${v.tipoLicencaUnidade ? ` ${v.tipoLicencaUnidade}` : ''}`
                              : '—',
                          }))
                        : (obj.licenciamento && obj.licenciamento !== '—'
                            ? obj.licenciamento.split(' · ').map(item => {
                                const sep = item.indexOf(': ')
                                return sep !== -1
                                  ? { nome: item.slice(0, sep), valor: item.slice(sep + 2) }
                                  : { nome: item, valor: '—' }
                              })
                            : [])

                    return (
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-[#030712]">Licenciamento</p>
                        {linhas.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {linhas.map((l, li) => (
                              <div key={li} className="flex items-center justify-between">
                                <p className="text-sm text-[#6b7280]">{l.nome}</p>
                                <p className="text-sm font-medium text-[#030712]">{l.valor}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[#6b7280]">—</p>
                        )}
                      </div>
                    )
                  })()}

                  <ObjetoField label="Organização contratada" value={obj.orgContratada} />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-[#030712]">Status da publicação</p>
                    <ProvisioningDots status="COMPLETED" catalog={PUBLICACAO_STEPS} tooltipTitulo="Status da publicação" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* ── Histórico de atualizações ─────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#6b7280]" />
            <SectionTitle>Histórico de atualizações</SectionTitle>
          </div>

          {!contract.historico || contract.historico.length === 0 ? (
            <p className="text-sm text-[#9ca3af]">Nenhum ajuste registrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {contract.historico.map((entry, i) => {
                const dt = new Date(entry.timestamp)
                const dataFormatada = dt.toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })
                const horaFormatada = dt.toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit',
                })
                return (
                  <div
                    key={i}
                    className="border border-[#e5e7eb] rounded-xl p-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#030712]">
                        {entry.solucao} · {entry.plano}
                      </p>
                      <p className="text-xs text-[#9ca3af] shrink-0">
                        {dataFormatada} {horaFormatada}
                      </p>
                    </div>
                    <p className="text-xs text-[#6b7280] leading-4">{entry.descricao}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </Sheet>
  )
}
