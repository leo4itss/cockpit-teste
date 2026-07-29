import { useState, useEffect } from 'react'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'
import type { ObjetoContrato, ValorLicencaContrato, ContractHistoricoEntry } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  objeto: ObjetoContrato | null
  onSave: (updated: ObjetoContrato, historico: ContractHistoricoEntry) => void
}

/** Reconstrói a string de licenciamento a partir dos valores editados */
function buildLicenciamentoLabel(valores: ValorLicencaContrato[]): string {
  return valores
    .map(v => {
      const unidade = v.tipoLicencaUnidade ?? ''
      const base = v.valor ? `${v.tipoLicencaNome}: ${v.valor} ${unidade}`.trim() : v.tipoLicencaNome
      const excedenteLabel = v.excedenteSemLimite
        ? ' (excedente: sem limite)'
        : v.excedente?.trim()
          ? ` (excedente até ${v.excedente.trim()} ${unidade})`.trim()
          : ''
      return base + excedenteLabel
    })
    .join(' · ') || '—'
}

/** Descreve a mudança de excedente para o histórico, se houve alteração */
function excedenteChangeDescription(ant: ValorLicencaContrato | undefined, atual: ValorLicencaContrato): string | null {
  const antLabel = ant?.excedenteSemLimite ? 'sem limite' : (ant?.excedente?.trim() || '—')
  const atualLabel = atual.excedenteSemLimite ? 'sem limite' : (atual.excedente?.trim() || '—')
  if (antLabel === atualLabel) return null
  return `${atual.tipoLicencaNome} (excedente): ${antLabel} → ${atualLabel}`
}

export function EditLicencaDialog({ open, onClose, objeto, onSave }: Props) {
  const [valores, setValores] = useState<ValorLicencaContrato[]>([])

  useEffect(() => {
    if (open && objeto) {
      setValores(
        (objeto.valoresLicenca ?? []).map(v => ({ ...v }))
      )
    }
  }, [open, objeto])

  if (!objeto) return null

  function handleValorChange(index: number, novoValor: string) {
    setValores(prev => prev.map((v, i) => i === index ? { ...v, valor: novoValor } : v))
  }

  function handleExcedenteChange(index: number, novoExcedente: string) {
    setValores(prev => prev.map((v, i) => i === index ? { ...v, excedente: novoExcedente } : v))
  }

  function handleToggleExcedenteSemLimite(index: number) {
    setValores(prev => prev.map((v, i) => {
      if (i !== index) return v
      const willBeUnlimited = !v.excedenteSemLimite
      return { ...v, excedenteSemLimite: willBeUnlimited, excedente: willBeUnlimited ? '' : (v.excedente ?? '') }
    }))
  }

  function handleSave() {
    if (!objeto) return
    // Detecta o que mudou para gerar descrição no histórico
    const original = objeto.valoresLicenca ?? []
    const alteracoesValor = valores
      .map((v, i) => {
        const ant = original[i]?.valor ?? ''
        if (ant === v.valor) return null
        const unidade = v.tipoLicencaUnidade ?? ''
        return `${v.tipoLicencaNome}: ${ant || '—'} → ${v.valor || '—'} ${unidade}`.trim()
      })
      .filter(Boolean)
    const alteracoesExcedente = valores
      .map((v, i) => excedenteChangeDescription(original[i], v))
      .filter(Boolean)
    const alteracoes = [...alteracoesValor, ...alteracoesExcedente]

    const updatedObjeto: ObjetoContrato = {
      solucao: objeto.solucao ?? '',
      orgContratada: objeto.orgContratada ?? '',
      plano: objeto.plano ?? '',
      licenciamento: buildLicenciamentoLabel(valores),
      planoVersao: objeto.planoVersao,
      qtdContratada: objeto.qtdContratada,
      valoresLicenca: valores,
    }

    const entrada: ContractHistoricoEntry = {
      timestamp: new Date().toISOString(),
      solucao: objeto.solucao ?? '',
      plano: objeto.plano ?? '',
      descricao: alteracoes.length > 0
        ? alteracoes.join('; ')
        : 'Nenhuma alteração detectada',
    }

    onSave(updatedObjeto, entrada)
    onClose()
  }

  const temValores = valores.length > 0

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Editar licenciamento"
      description={`${objeto.solucao} · Plano ${objeto.plano}`}
      className="max-w-[480px]"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar ajuste</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">

        {/* Aviso contextual */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-amber-700 leading-5">
            Os valores ajustados aqui são específicos deste contrato e não alteram o plano original da solução.
            Um registro será salvo no histórico de atualizações.
          </p>
        </div>

        {/* Campos de valor por tipo de licença */}
        {!temValores ? (
          <p className="text-sm text-[#9ca3af] text-center py-4">
            Nenhum tipo de licença configurado neste plano.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {valores.map((v, i) => {
              const unidade = v.tipoLicencaUnidade ?? ''
              const semLimite = v.excedenteSemLimite === true
              return (
              <div key={i} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#030712]">
                    {v.tipoLicencaNome}
                    {unidade && (
                      <span className="text-xs text-[#6b7280] font-normal ml-1">({unidade})</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={v.valor}
                    onChange={e => handleValorChange(i, e.target.value)}
                    placeholder="ex: 15"
                    className="h-9 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#9ca3af] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#6b7280]">
                    Excedente{unidade ? ` (${unidade})` : ''}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={semLimite ? '' : (v.excedente ?? '')}
                      disabled={semLimite}
                      onChange={e => handleExcedenteChange(i, e.target.value)}
                      placeholder={semLimite ? 'Sem limite' : 'ex: 20'}
                      className="h-9 flex-1 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#9ca3af] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors disabled:bg-gray-50 disabled:text-[#9ca3af]"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleExcedenteSemLimite(i)}
                      className={`shrink-0 h-9 px-3 border rounded-md text-xs font-medium transition-colors ${
                        semLimite
                          ? 'border-[#2563eb] bg-blue-50 text-[#2563eb]'
                          : 'border-gray-200 bg-white text-[#030712] hover:bg-gray-50'
                      }`}
                    >
                      {semLimite ? 'Sem limite (ativo)' : 'Sem limite'}
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </Dialog>
  )
}
