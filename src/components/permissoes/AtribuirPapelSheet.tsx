/**
 * AtribuirPapelSheet — Sheet aninhada para atribuição de papéis por componente.
 *
 * Contextos de uso:
 *   1. Dentro de UserDetailSheet  → atribui papéis a um usuário específico
 *   2. Dentro de GrupoDetailSheet → atribui papéis ao grupo (todos os membros herdam)
 *
 * Tipo inferido pelo nome do componente define os papéis disponíveis:
 *   assistente-ia      → Nenhum / Viewer / User / Admin
 *   base-conhecimento  → Nenhum / Viewer / Editor / Admin
 *   default            → Nenhum / Viewer / Admin
 *
 * No PoC, a confirmação simula a escrita de tuplas FGA.
 * Em produção: POST /api/assignments por atribuição, backend escreve tuplas.
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, Bot, Database, Layers, Users, ChevronDown } from 'lucide-react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetDescription,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'
import type { Componente } from '@/types'

// ── Tipos ──────────────────────────────────────────────────────

type ComponenteTipo = 'assistente-ia' | 'base-conhecimento' | 'default'

export interface PapelAtribuido {
  componenteId:   string
  componenteNome: string
  papel:          string
}

interface Props {
  open:        boolean
  onClose:     () => void
  /** 'usuario' = papéis individuais | 'grupo' = todos os membros herdam */
  entityType:  'usuario' | 'grupo'
  /** Nome exibido no header e no banner */
  entityNome:  string
  /** ID da conta — para filtrar componentes disponíveis */
  accountId:   string
  /** Nome da conta exibido na coluna Conta */
  accountNome?: string
  /** Chamado com as atribuições confirmadas */
  onSuccess?:  (atribuicoes: PapelAtribuido[]) => void
}

// ── Inferência de tipo e papéis ────────────────────────────────

function inferirTipo(nome: string): ComponenteTipo {
  const n = nome.toLowerCase()
  if (n.includes('assistente') || n.includes('pas core') || n.includes('analytics')) return 'assistente-ia'
  if (n.includes('base') || n.includes('knowledge') || n.includes('kb') || n.includes('jurídic')) return 'base-conhecimento'
  return 'default'
}

const PAPEL_LABEL: Record<string, string> = {
  'Nenhum': 'Nenhum',
  'Viewer': 'Visualizador',
  'User':   'Usuário',
  'Editor': 'Editor',
  'Admin':  'Administrador',
}

function getPapeis(tipo: ComponenteTipo): string[] {
  if (tipo === 'assistente-ia')     return ['Nenhum', 'Viewer', 'User', 'Admin']
  if (tipo === 'base-conhecimento') return ['Nenhum', 'Viewer', 'Editor', 'Admin']
  return ['Nenhum', 'Viewer', 'Admin']
}

// ── Ícone por tipo ─────────────────────────────────────────────

function ComponenteIcon({ tipo }: { tipo: ComponenteTipo }) {
  if (tipo === 'assistente-ia')     return <Bot      className="w-5 h-5 text-violet-500 shrink-0" />
  if (tipo === 'base-conhecimento') return <Database className="w-5 h-5 text-blue-500 shrink-0" />
  return                                   <Layers   className="w-5 h-5 text-gray-400 shrink-0" />
}

// ── Dropdown de papel ──────────────────────────────────────────

function PapelSelect({
  tipo, value, onChange, disabled,
}: { tipo: ComponenteTipo; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const isNenhum = value === 'Nenhum'
  return (
    <Select
      options={getPapeis(tipo).map(p => ({ value: p, label: PAPEL_LABEL[p] ?? p }))}
      value={value}
      onChange={v => onChange(v ?? 'Nenhum')}
      disabled={disabled}
      className={cn(
        isNenhum
          ? 'border-gray-200 bg-gray-50 text-[#6b7280]'
          : 'border-blue-200 bg-blue-50 text-blue-700 font-medium',
      )}
    />
  )
}

// ── Componente principal ───────────────────────────────────────

export function AtribuirPapelSheet({
  open, onClose, entityType, entityNome, accountId, accountNome, onSuccess,
}: Props) {
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [loading, setLoading]         = useState(true)
  const [papeis, setPapeis]           = useState<Record<string, string>>({})
  const [search, setSearch]           = useState('')
  const [saving, setSaving]           = useState(false)

  // Carrega componentes ao abrir
  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.getComponentes()
      .then((data: Componente[]) => {
        const ativos = data.filter(c => c.status !== 'Inativo')
        setComponentes(ativos)
        const init: Record<string, string> = {}
        ativos.forEach(c => { init[c.id] = 'Nenhum' })
        setPapeis(init)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return componentes
    const q = search.toLowerCase()
    return componentes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      (c.descricao ?? '').toLowerCase().includes(q)
    )
  }, [componentes, search])

  const qtdAtribuidos = Object.values(papeis).filter(p => p !== 'Nenhum').length

  function setPapel(id: string, papel: string) {
    setPapeis(prev => ({ ...prev, [id]: papel }))
  }

  async function handleConfirmar() {
    const atribuicoes: PapelAtribuido[] = componentes
      .filter(c => papeis[c.id] && papeis[c.id] !== 'Nenhum')
      .map(c => ({ componenteId: c.id, componenteNome: c.nome, papel: papeis[c.id] }))

    if (!atribuicoes.length) return
    setSaving(true)
    try {
      // TODO (produção): chamar endpoint de atribuição para cada tupla FGA
      await new Promise(r => setTimeout(r, 400)) // simula latência
      onSuccess?.(atribuicoes)
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setSearch(''); setPapeis({}); setComponentes([])
    onClose()
  }

  const contaNome  = accountNome ?? accountId
  const isGrupo   = entityType === 'grupo'

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[680px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Atribuir papéis — {entityNome}</NestedSheetTitle>
        <NestedSheetDescription>
          Selecione o papel de acesso em cada componente disponível na conta <strong>{contaNome}</strong>.
        </NestedSheetDescription>
      </NestedSheetHeader>

      <NestedSheetBody noPadding>
        <div className="flex flex-col h-full">

          {/* Banner grupo */}
          {isGrupo && (
            <div className="flex items-start gap-3 mx-6 mt-5 p-3.5 rounded-xl border border-violet-200 bg-violet-50">
              <Users className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
              <p className="text-sm text-violet-800">
                Você está atribuindo papéis ao <strong>grupo {entityNome}</strong>.
                Todos os membros herdarão esses acessos automaticamente.
              </p>
            </div>
          )}

          {/* Busca */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar componente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 leading-none text-base">×</button>
              )}
            </div>
          </div>

          {/* Tabela */}
          <div className="flex-1 overflow-y-auto border-t border-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">Carregando componentes...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-1">
                <p className="text-sm font-medium text-[#030712]">Nenhum componente encontrado</p>
                <p className="text-xs text-[#6b7280]">Tente outro termo de busca.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Componente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[130px]">Conta</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[160px]">Papel</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((comp, idx) => {
                    const tipo   = inferirTipo(comp.nome)
                    const papel  = papeis[comp.id] ?? 'Nenhum'
                    return (
                      <tr
                        key={comp.id}
                        className={cn(
                          'border-b border-gray-50 transition-colors',
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40',
                          papel !== 'Nenhum' && 'bg-blue-50/30',
                        )}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5"><ComponenteIcon tipo={tipo} /></div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#030712] leading-5">{comp.nome}</p>
                              {comp.descricao && (
                                <p className="text-xs text-[#6b7280] leading-4 mt-0.5 max-w-xs truncate">{comp.descricao}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#6b7280]">{contaNome}</td>
                        <td className="px-4 py-3">
                          <PapelSelect tipo={tipo} value={papel} onChange={v => setPapel(comp.id, v)} disabled={saving} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Contador */}
          {qtdAtribuidos > 0 && (
            <div className="px-6 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-[#6b7280]">
                <strong className="text-[#030712]">{qtdAtribuidos}</strong>{' '}
                {qtdAtribuidos === 1 ? 'componente com papel atribuído' : 'componentes com papéis atribuídos'}
              </p>
            </div>
          )}
        </div>
      </NestedSheetBody>

      <NestedSheetFooter>
        <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleConfirmar} disabled={qtdAtribuidos === 0 || saving}>
          {saving ? 'Confirmando...' : `Confirmar${qtdAtribuidos > 0 ? ` (${qtdAtribuidos})` : ''}`}
        </Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
