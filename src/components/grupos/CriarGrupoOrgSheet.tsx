/**
 * CriarGrupoOrgSheet — Org Admin cria grupo com escopo selecionável.
 *
 * Escopo:
 *   'org'   → disponível para todas as contas da organização
 *   'conta' → restrito a uma conta específica (selecionada no form)
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, X, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetDescription,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { Button } from '@/components/ui/Button'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'
import type { User, Account, Grupo } from '@/types'

// ── Tipos ─────────────────────────────────────────────────────

interface Props {
  open:             boolean
  onClose:          () => void
  orgId:            string        // orgId padrão (para Org Admin); ignorado quando isPlatformAdmin=true e escopo='org'
  orgs:             any[]         // todas as orgs — usado pelo Platform Admin para escolher
  contas:           Account[]     // todas as contas — agrupadas por org no dropdown
  grupos?:          Grupo[]       // grupos existentes para seleção de grupo pai
  isPlatformAdmin?: boolean
  onSuccess:        (grupo: Grupo) => void
}

// ── Helpers ───────────────────────────────────────────────────

function Avatar({ nome, size = 'sm' }: { nome: string; size?: 'sm' | 'md' }) {
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className={cn(
      'rounded-full bg-[#e5e7eb] flex items-center justify-center font-semibold text-[#6b7280] select-none shrink-0',
      size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs',
    )}>
      {ini}
    </div>
  )
}

function FieldLabel({ children, required, hint }: {
  children: React.ReactNode
  required?: boolean
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-sm font-medium text-[#030712]">
        {children}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-[#6b7280]">{hint}</p>}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

// Papéis disponíveis — abstração sobre as tuplas FGA de permissão
const PAPEIS = [
  { value: 'Viewer', label: 'Visualizador', desc: 'Acesso de leitura e consulta' },
  { value: 'User',   label: 'Usuário',      desc: 'Uso padrão do assistente' },
  { value: 'Admin',  label: 'Administrador', desc: 'Acesso completo à gestão' },
]

export function CriarGrupoOrgSheet({ open, onClose, orgId, orgs, contas, grupos = [], isPlatformAdmin, onSuccess }: Props) {
  const [nome, setNome]                         = useState('')
  const [descricao, setDescricao]               = useState('')
  const [papel, setPapel]                       = useState('User')
  const [escopo, setEscopo]                     = useState<'org' | 'conta'>('org')
  const [orgSelecionada, setOrgSelecionada]     = useState('')   // só usado quando isPlatformAdmin + escopo='org'
  const [contaSelecionada, setContaSelecionada] = useState('')
  const [parentId, setParentId]                 = useState<string | null>(null)
  const [searchMembro, setSearchMembro]         = useState('')
  const [allUsers, setAllUsers]                 = useState<User[]>([])
  const [membros, setMembros]                   = useState<User[]>([])
  const [saving, setSaving]                     = useState(false)
  const [error, setError]                       = useState<string | null>(null)

  // Grupos disponíveis como pai — filtrados pelo escopo atual
  const gruposDisponiveis = useMemo(() => {
    const orgIdEfetivo = isPlatformAdmin ? orgSelecionada : orgId
    if (escopo === 'org') {
      return grupos.filter(g => g.escopo === 'org' && g.orgId === orgIdEfetivo && g.status === 'Ativo')
    }
    return grupos.filter(g => g.escopo === 'conta' && g.accountId === contaSelecionada && g.status === 'Ativo')
  }, [grupos, escopo, orgSelecionada, orgId, contaSelecionada, isPlatformAdmin])

  // Contas agrupadas por org (para o optgroup do select)
  const contasPorOrg = useMemo(() => {
    const map: Record<string, { orgNome: string; contas: Account[] }> = {}
    for (const c of contas) {
      if (!map[c.orgId]) {
        const org = orgs.find(o => o.id === c.orgId)
        map[c.orgId] = { orgNome: org?.name ?? c.orgId, contas: [] }
      }
      map[c.orgId].contas.push(c)
    }
    return Object.values(map)
  }, [contas, orgs])

  useEffect(() => {
    if (!open) return
    api.getUsers().then(setAllUsers).catch(() => {})
  }, [open])

  const sugestoes = useMemo(() => {
    const q = searchMembro.trim().toLowerCase()
    if (!q) return []
    const selecionadosIds = new Set(membros.map(m => m.id))
    return allUsers
      .filter(u => !selecionadosIds.has(u.id))
      .filter(u =>
        u.nomeCompleto.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [searchMembro, allUsers, membros])

  function addMembro(user: User) {
    setMembros(prev => prev.find(m => m.id === user.id) ? prev : [...prev, user])
    setSearchMembro('')
  }

  function removeMembro(userId: string) {
    setMembros(prev => prev.filter(m => m.id !== userId))
  }

  // orgId efetivo: Platform Admin escolhe; demais usam o orgId recebido via prop
  const orgIdEfetivo = isPlatformAdmin ? orgSelecionada : orgId

  const canSave =
    nome.trim().length > 0 &&
    (escopo === 'conta' ? contaSelecionada !== '' : orgIdEfetivo !== '')

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)

    // Constrói o objeto local antecipadamente (usado como fallback se a API falhar)
    const now = new Date().toLocaleDateString('pt-BR')
    const localGrupo: Grupo = {
      id:        crypto.randomUUID(),
      nome:      nome.trim(),
      descricao: descricao.trim() || undefined,
      papel,
      escopo,
      orgId:     escopo === 'org'   ? orgIdEfetivo     : undefined,
      accountId: escopo === 'conta' ? contaSelecionada : undefined,
      parentId:  parentId ?? undefined,
      status:    'Ativo',
      createdAt: now,
      qtdMembros: membros.length,
    }

    try {
      const grupo: Grupo = await api.createGrupo({
        ...localGrupo,
        descricao: descricao.trim() || null,
        orgId:     escopo === 'org'   ? orgIdEfetivo     : null,
        accountId: escopo === 'conta' ? contaSelecionada : null,
        parentId:  parentId ?? null,
      })
      // Adiciona membros em background — falha silenciosa (API pode não ter a rota)
      if (membros.length > 0) {
        await Promise.all(membros.map(m => api.addGrupoMembro(grupo.id, m.id))).catch(() => {})
      }
      onSuccess({ ...grupo, qtdMembros: membros.length })
      handleClose()
    } catch {
      // API indisponível ou rota inexistente no serverless (Neon cold / grupos não no api/index.ts)
      // Persiste localmente — PoC pattern
      onSuccess(localGrupo)
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setNome(''); setDescricao(''); setPapel('User'); setEscopo('org')
    setOrgSelecionada(''); setContaSelecionada(''); setParentId(null); setSearchMembro('')
    setMembros([]); setError(null)
    onClose()
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[560px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Criar grupo</NestedSheetTitle>
        <NestedSheetDescription>
          Grupos de organização ficam disponíveis em todas as contas. Grupos de conta são restritos a uma conta específica.
        </NestedSheetDescription>
      </NestedSheetHeader>

      <NestedSheetBody>
        <div className="flex flex-col gap-6">

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required hint="Visível para todos os membros da organização.">
              Nome do grupo
            </FieldLabel>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Equipe de Atendimento"
              disabled={saving}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-50"
            />
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Descrição</FieldLabel>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva o propósito deste grupo (opcional)"
              rows={3}
              disabled={saving}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none disabled:bg-gray-50"
            />
          </div>

          {/* Nível de Acesso — seletor visual */}
          <div className="flex flex-col gap-2">
            <FieldLabel required hint="Define o nível de acesso padrão dos membros deste grupo.">
              Nível de Acesso
            </FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {PAPEIS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPapel(p.value)}
                  disabled={saving}
                  className={cn(
                    'flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-colors',
                    papel === p.value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  )}
                >
                  <span className="text-sm font-medium text-[#030712]">{p.label}</span>
                  <span className="text-xs text-[#6b7280] mt-0.5 leading-tight">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Escopo — seletor visual */}
          <div className="flex flex-col gap-2">
            <FieldLabel required>Escopo</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEscopo('org')}
                disabled={saving}
                className={cn(
                  'flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors',
                  escopo === 'org'
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <span className="text-sm font-medium text-[#030712]">Organização</span>
                <span className="text-xs text-[#6b7280] mt-0.5">Disponível em todas as contas</span>
              </button>
              <button
                type="button"
                onClick={() => setEscopo('conta')}
                disabled={saving}
                className={cn(
                  'flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors',
                  escopo === 'conta'
                    ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <span className="text-sm font-medium text-[#030712]">Conta específica</span>
                <span className="text-xs text-[#6b7280] mt-0.5">Restrito a uma conta</span>
              </button>
            </div>

            {/* Seletor de org — só para Platform Admin com escopo='org' */}
            {escopo === 'org' && isPlatformAdmin && (
              <div className="relative mt-1">
                <select
                  value={orgSelecionada}
                  onChange={e => setOrgSelecionada(e.target.value)}
                  disabled={saving || orgs.length === 0}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors disabled:bg-gray-50 text-[#030712]"
                >
                  <option value="">Selecione a organização...</option>
                  {orgs.filter(o => o.status !== 'Inativo').map((o: any) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Select de conta — contas agrupadas por org */}
            {escopo === 'conta' && (
              <div className="relative mt-1">
                <select
                  value={contaSelecionada}
                  onChange={e => setContaSelecionada(e.target.value)}
                  disabled={saving || contas.length === 0}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors disabled:bg-gray-50 text-[#030712]"
                >
                  <option value="">Selecione a conta...</option>
                  {isPlatformAdmin
                    /* Platform Admin: agrupa por org */
                    ? contasPorOrg.map(grupo => (
                        <optgroup key={grupo.orgNome} label={grupo.orgNome}>
                          {grupo.contas.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </optgroup>
                      ))
                    /* Org Admin: lista plana (só vê contas da sua org) */
                    : contas.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                  }
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Grupo Pai */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel hint="Deixe em branco para criar um grupo raiz.">Grupo Pai</FieldLabel>
            <div className="relative">
              <select
                value={parentId ?? ''}
                onChange={e => setParentId(e.target.value || null)}
                disabled={saving || gruposDisponiveis.length === 0}
                className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors disabled:bg-gray-50 text-[#030712]"
              >
                <option value="">(Nenhum — grupo raiz)</option>
                {gruposDisponiveis.map(g => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            {gruposDisponiveis.length === 0 && (
              <p className="text-xs text-[#6b7280]">
                {escopo === 'org' && !orgSelecionada && !orgId
                  ? 'Selecione a organização para ver grupos disponíveis.'
                  : escopo === 'conta' && !contaSelecionada
                  ? 'Selecione a conta para ver grupos disponíveis.'
                  : 'Nenhum grupo disponível para ser usado como pai.'}
              </p>
            )}
          </div>

          {/* Busca de membros */}
          <div className="flex flex-col gap-2">
            <FieldLabel>Usuários</FieldLabel>

            {/* Chips dos selecionados */}
            {membros.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {membros.map(m => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700"
                  >
                    <Avatar nome={m.nomeCompleto} size="sm" />
                    {m.nomeCompleto.split(' ')[0]}
                    <button
                      onClick={() => removeMembro(m.id)}
                      className="hover:text-blue-900 transition-colors ml-0.5"
                      title={`Remover ${m.nomeCompleto}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Campo de busca */}
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchMembro}
                  onChange={e => setSearchMembro(e.target.value)}
                  placeholder="Buscar usuário por nome ou e-mail..."
                  disabled={saving}
                  className="flex-1 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
                />
                {searchMembro && (
                  <button onClick={() => setSearchMembro('')} className="text-gray-400 hover:text-gray-600 leading-none text-base">×</button>
                )}
              </div>

              {/* Dropdown de sugestões */}
              {sugestoes.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                  {sugestoes.map(user => (
                    <button
                      key={user.id}
                      onClick={() => addMembro(user)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Avatar nome={user.nomeCompleto} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#030712] truncate">{user.nomeCompleto}</p>
                        <p className="text-xs text-[#6b7280] truncate">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Sem resultados */}
              {searchMembro.trim().length > 0 && sugestoes.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 px-4 py-3">
                  <p className="text-sm text-[#6b7280]">Nenhum usuário encontrado.</p>
                </div>
              )}
            </div>

            {membros.length === 0 && (
              <p className="text-xs text-[#6b7280]">
                Você pode adicionar membros agora ou depois, no detalhe do grupo.
              </p>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

        </div>
      </NestedSheetBody>

      <NestedSheetFooter>
        <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={!canSave || saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : 'Criar grupo'}
        </Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
