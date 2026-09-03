import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { ContractStatusBadge } from './ContractStatusBadge'
import { ProvisioningDots } from './ProvisioningDots'
import { useState, useEffect } from 'react'
import { History, Loader2, AlertTriangle } from 'lucide-react'
import { ProvisioningErrorBlock } from './provisionamento/ProvisioningErrorBlock'
import { PUBLICACAO_STEPS, getContractProvisioning } from '@/services/provisioning'
import type { Contract, SolutionProvisioning } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  contract: Contract | null
  onEdit?: () => void
  // Ciclo de vida — contrato só inativa/ativa, nunca exclui (Regra 3).
  onInativar?: () => void
  onAtivar?: () => void
  /** Rota da tela de provisionamento do tenant — caminho até o diagnóstico da Fase 2. */
  provisionamentoHref?: string
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


export function ContractDetailSheet({ open, onClose, contract, onEdit, onInativar, onAtivar, provisionamentoHref }: Props) {
  // Detalhe da Fase 2 buscado aqui, e não recebido por prop: o sheet já conhece
  // o contrato, e assim quem o renderiza não precisa saber de provisionamento.
  // Mesmo padrão de LogsSheet.
  const [solucoes, setSolucoes] = useState<SolutionProvisioning[]>([])
  const emFalha = contract?.status === 'Falha no provisionamento'

  useEffect(() => {
    if (!open || !contract || !emFalha) return
    let ativo = true
    getContractProvisioning(contract.id)
      .then(res => { if (ativo) setSolucoes(res) })
      .catch(() => { if (ativo) setSolucoes([]) })
    return () => { ativo = false }
  }, [open, contract, emFalha])

  if (!contract) return null

  // Derivado em vez de zerado no efeito: assim um resultado de um contrato
  // anterior nunca vaza para o próximo, e o estado só é escrito no retorno
  // da busca.
  const solucoesComErro = emFalha ? solucoes.filter(s => s.erro && s.contratoId === contract.id) : []
  const shortId = contract.id.length > 8 ? `${contract.id.substring(0, 8)}…` : contract.id

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Detalhe Contrato"
      width="w-[640px]"
      headerAction={
        <div className="flex items-center gap-2">
          {onEdit && <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>}
          {contract.status === 'Inativo'
            ? onAtivar && <Button variant="outline" size="sm" className="text-green-700" onClick={onAtivar}>Ativar</Button>
            : onInativar && <Button variant="outline" size="sm" className="text-amber-600" onClick={onInativar}>Inativar</Button>}
        </div>
      }
    >
      <div className="flex flex-col gap-6">

        {/* ── Identificação ─────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-semibold text-[#030712]">Contrato: {shortId}</p>
          <StatusBadge status={contract.status} />
        </div>

        {/* Estados da Fase 2 — provisionando ou falho. O caminho até o
            diagnóstico por solução fica na tela de provisionamento do tenant. */}
        {contract.status === 'Provisionando' && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-300 rounded-lg p-3">
            <Loader2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5 animate-spin" />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-blue-700 leading-4">
                As soluções deste contrato estão sendo provisionadas no ambiente do cliente.
                Esse processo pode levar alguns minutos.
              </p>
              {provisionamentoHref && (
                <a href={provisionamentoHref} className="text-xs font-semibold text-blue-700 hover:underline w-fit">
                  Acompanhar o provisionamento
                </a>
              )}
            </div>
          </div>
        )}

        {contract.status === 'Falha no provisionamento' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-red-700 leading-4">
                  {solucoesComErro.length === 1
                    ? 'Uma solução deste contrato falhou ao provisionar.'
                    : `${solucoesComErro.length} soluções deste contrato falharam ao provisionar.`}
                </p>
                {provisionamentoHref && (
                  <a href={provisionamentoHref} className="text-xs font-semibold text-red-700 hover:underline w-fit">
                    Ver detalhes e tentar novamente
                  </a>
                )}
              </div>
            </div>

            {/* Motivo por solução. Aqui só se diagnostica — a reexecução vive
                na tela de provisionamento, junto da linha da solução. */}
            {solucoesComErro.map(s => (
              <div key={s.solucaoNome} className="flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-[#030712]">{s.solucaoNome}</p>
                <ProvisioningErrorBlock erro={s.erro!} />
              </div>
            ))}
          </div>
        )}

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
                    const linhas: { nome: string; valor: string; excedente?: string }[] =
                      obj.valoresLicenca && obj.valoresLicenca.length > 0
                        ? obj.valoresLicenca.map(v => ({
                            nome: v.tipoLicencaNome,
                            valor: v.valor
                              ? `${v.valor}${v.tipoLicencaUnidade ? ` ${v.tipoLicencaUnidade}` : ''}`
                              : '—',
                            excedente: v.excedenteSemLimite
                              ? 'Sem limite'
                              : v.excedente?.trim()
                                ? `Até ${v.excedente.trim()}${v.tipoLicencaUnidade ? ` ${v.tipoLicencaUnidade}` : ''}`
                                : undefined,
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
                          <div className="flex flex-col gap-2">
                            {linhas.map((l, li) => (
                              <div key={li} className="flex flex-col gap-0.5">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-[#6b7280]">{l.nome}</p>
                                  <p className="text-sm font-medium text-[#030712]">{l.valor}</p>
                                </div>
                                {l.excedente && (
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-[#9ca3af]">Excedente</p>
                                    <p className="text-xs text-[#6b7280]">{l.excedente}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[#6b7280]">—</p>
                        )}
                      </div>
                    )
                  })()}

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
