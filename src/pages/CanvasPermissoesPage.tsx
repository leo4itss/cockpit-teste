/**
 * CanvasPermissoesPage — Canvas interativo de gestão por conta.
 * Suporta tema dark / light com switch persistido em localStorage.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Handle,
  Position,
  BackgroundVariant,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Users, Shield, Bot, Database, Layers, X,
  UserMinus, Loader2, Building2, ChevronRight, Lock, Search,
  Sun, Moon, HelpCircle, Info,
} from 'lucide-react'
import { api } from '@/api/client'
import { useIsPlatformAdmin, useIsOrgAdmin, useIsAccountAdmin } from '@/authz'
import { useAdminAccountId, useAdminOrgId } from '@/authz/hooks'
import { useSessionState } from '@/hooks/useSessionState'
import {
  accounts  as mockAccounts,
  users     as mockUsers,
  grupos    as mockGrupos,
  instancias as mockInstancias,
  accountMembrosIds,
  grupoMembrosMap,
  instanciaMembros as mockInstMembros,
} from '@/data/mock'
import { InstanciaDetailSheet } from '@/components/instancias/InstanciaDetailSheet'
import { AtribuirPermissoesSheet } from '@/components/permissoes/AtribuirPermissoesSheet'
import { Modal } from '@/components/ui/Modal'
// import { cn } from '@/lib/utils'
import { VisualizerThemeContext, useNodeTheme, type VisualizerTheme } from '@/lib/visualizerTheme'
import { useVisualizerTheme } from '@/hooks/useVisualizerTheme'

// ── Tipos ──────────────────────────────────────────────────────

type EntityType = 'grupo' | 'usuario' | 'instancia'
interface SelectedEntity { type: EntityType; id: string }

interface GraphData {
  account:        any
  accountMembros: any[]
  groups:         any[]
  instances:      any[]
  components:     any[]
  grupoMembros:   Record<string, any[]>
  instMembros:    Record<string, any[]>
  allUsers:       any[]
}

// ── Dimensões de layout ───────────────────────────────────────

const AW = 240, AH = 90
const GW = 210, GH = 110
const UW = 185, UH = 72
const IW = 225, IH = 105
const H_GAP   = 36
const ROW_GAP = 70
const INST_GAP= 32

// ── Helpers visuais ───────────────────────────────────────────

type CompTipo = 'assistente-ia' | 'base-conhecimento' | 'analytics' | 'default'

function inferTipo(nome?: string): CompTipo {
  const n = (nome ?? '').toLowerCase()
  if (n.includes('assistente') || n.includes('pas core')) return 'assistente-ia'
  if (n.includes('base') || n.includes('knowledge'))      return 'base-conhecimento'
  if (n.includes('analytics') || n.includes('dashboard')) return 'analytics'
  return 'default'
}

function CompIcon({ tipo, size = 16, color }: { tipo: CompTipo; size?: number; color?: string }) {
  const s = { width: size, height: size, color: color ?? 'currentColor', flexShrink: 0 }
  if (tipo === 'assistente-ia')     return <Bot      style={s} />
  if (tipo === 'base-conhecimento') return <Database style={s} />
  return                                   <Layers   style={s} />
}

// Cor de CompIcon por tipo e tema
function compIconColor(tipo: CompTipo, mode: 'dark' | 'light'): string {
  if (mode === 'dark') {
    if (tipo === 'assistente-ia')     return '#a78bfa'
    if (tipo === 'base-conhecimento') return '#60a5fa'
    return '#34d399'
  }
  if (tipo === 'assistente-ia')     return '#7c3aed'
  if (tipo === 'base-conhecimento') return '#2563eb'
  return '#059669'
}

function AvatarCircle({ nome, size = 28 }: { nome: string; size?: number }) {
  const ini = (nome ?? '?').split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
  return (
    <div
      className="rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {ini}
    </div>
  )
}

function papelBadgeStyle(papel: string, t: VisualizerTheme): React.CSSProperties {
  const b = papel === 'Admin'  ? t.badgeAdmin
          : papel === 'User'   ? t.badgeUser
          : t.badgeViewer
  return { background: b.bg, color: b.text, border: `1px solid ${b.border}` }
}

// ── Nós customizados ──────────────────────────────────────────

function ContaNode({ data }: { data: any }) {
  const t = useNodeTheme()
  return (
    <div className="rounded-2xl shadow-lg" style={{ width: AW, minHeight: AH, background: t.contaBg, border: '2px solid #f59e0b' }}>
      <Handle type="source" position={Position.Bottom} style={{ background: '#f59e0b', width: 8, height: 8 }} />
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245,158,11,0.15)' }}>
          <Building2 className="w-5 h-5 text-amber-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight truncate" style={{ color: t.cardText }}>{data.nome}</p>
          <p className="text-[10px] mt-0.5" style={{ color: t.cardMuted }}>{data.subdomain}.itss.com.br</p>
          <p className="text-[10px] font-medium mt-1 text-amber-500">{data.qtdMembros} membros</p>
        </div>
      </div>
    </div>
  )
}

function GrupoNode({ data, selected }: { data: any; selected?: boolean }) {
  const t = useNodeTheme()
  const barColor = data.papel === 'Admin' ? '#f97316'
                 : data.papel === 'User'  ? '#3b82f6'
                 : data.papel === 'Viewer'? '#6b7280'
                 : '#94a3b8'
  const border = selected ? t.cardSelBorder : t.cardBorder
  const glow   = selected ? `0 0 0 2px ${t.cardSelGlow}, 0 4px 20px rgba(0,0,0,0.15)` : '0 2px 8px rgba(0,0,0,0.08)'

  return (
    <div className="rounded-xl overflow-hidden transition-shadow" style={{ width: GW, minHeight: GH, background: t.cardBg, border: `1.5px solid ${border}`, boxShadow: glow }}>
      <Handle type="target" position={Position.Top}    style={{ background: t.cardBorder, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: t.cardBorder, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Right}  style={{ background: t.cardBorder, width: 7, height: 7 }} id="right" />
      <div style={{ height: 3, background: barColor }} />
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 shrink-0 mt-0.5" style={{ color: t.cardMuted }} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: t.cardText }}>{data.nome}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {data.papel && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={papelBadgeStyle(data.papel, t)}>
                  {data.papel}
                </span>
              )}
              <span className="text-[9px] capitalize" style={{ color: t.cardMuted }}>{data.escopo}</span>
            </div>
            <p className="text-[10px] mt-1.5 flex items-center gap-0.5" style={{ color: t.cardMuted }}>
              <Users className="w-2.5 h-2.5" />
              {data.qtdMembros} {data.qtdMembros === 1 ? 'membro' : 'membros'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsuarioNode({ data, selected }: { data: any; selected?: boolean }) {
  const t = useNodeTheme()
  const border = selected ? t.cardSelBorder : t.cardBorder
  const glow   = selected ? `0 0 0 2px ${t.cardSelGlow}, 0 4px 16px rgba(0,0,0,0.12)` : '0 1px 6px rgba(0,0,0,0.06)'

  return (
    <div className="rounded-xl overflow-hidden transition-shadow" style={{ width: UW, minHeight: UH, background: t.cardBg, border: `1.5px solid ${border}`, boxShadow: glow }}>
      <Handle type="target" position={Position.Top}   style={{ background: t.cardBorder, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Right} style={{ background: t.cardBorder, width: 7, height: 7 }} />
      <div className="px-3 py-2 flex items-center gap-2.5">
        <AvatarCircle nome={data.nomeCompleto} size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: t.cardText }}>{data.nomeCompleto}</p>
          <p className="text-[10px] truncate" style={{ color: t.cardSub }}>{data.email}</p>
          {data.papelConta && (
            <p className="text-[9px] font-medium mt-0.5 text-blue-500">
              {data.papelConta === 'account_admin' ? '★ Admin' : 'membro'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function InstanciaNode({ data, selected }: { data: any; selected?: boolean }) {
  const t     = useNodeTheme()
  const tipo  = inferTipo(data.componenteNome)
  const border= selected ? t.instSelBorder : t.instBorder
  const glow  = selected ? `0 0 0 2px ${t.instSelGlow}, 0 4px 20px rgba(0,0,0,0.12)` : '0 2px 10px rgba(0,0,0,0.07)'
  const iconC = compIconColor(tipo, t.mode)

  return (
    <div className="rounded-xl overflow-hidden transition-shadow" style={{ width: IW, minHeight: IH, background: t.instBg, border: `1.5px solid ${border}`, boxShadow: glow }}>
      <Handle type="target" position={Position.Left} style={{ background: t.instBorder, width: 7, height: 7 }} />
      <div style={{ height: 2, background: 'linear-gradient(90deg, #8b5cf6, #22d3ee)' }} />
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <CompIcon tipo={tipo} size={15} color={iconC} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: t.cardText }}>{data.nome}</p>
              {data.isDocNix && (
                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                  DocNix
                </span>
              )}
            </div>
            <p className="text-[10px] truncate mt-0.5" style={{ color: t.cardSub }}>{data.componenteNome}</p>
            <p className="text-[10px] mt-1 flex items-center gap-0.5" style={{ color: t.instBorder === t.instSelBorder ? t.instSelBorder : '#8b5cf6' }}>
              <Users className="w-2.5 h-2.5" />
              {data.qtdMembros} {data.qtdMembros === 1 ? 'membro' : 'membros'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const nodeTypes = { conta: ContaNode, grupo: GrupoNode, usuario: UsuarioNode, instancia: InstanciaNode }

// ── Algoritmo de layout ───────────────────────────────────────

function buildGraph(data: GraphData, selectedId: string | null, theme: VisualizerTheme): { nodes: Node[]; edges: Edge[] } {
  const { account, accountMembros, groups, instances, components, grupoMembros, instMembros } = data
  const nodes: Node[] = []
  const edges: Edge[] = []

  const groupsW = groups.length  * (GW + H_GAP)
  const usersW  = accountMembros.length * (UW + H_GAP)
  const leftW   = Math.max(groupsW, usersW, AW + 100)

  // Conta
  nodes.push({
    id: `conta-${account.id}`, type: 'conta',
    position: { x: leftW / 2 - AW / 2, y: 0 },
    data: { nome: account.name, subdomain: account.subdomain, qtdMembros: accountMembros.length },
    selectable: false,
  })

  // Grupos
  const groupY = AH + ROW_GAP
  groups.forEach((g, i) => {
    const id = `grupo-${g.id}`
    nodes.push({
      id, type: 'grupo',
      position: { x: i * (GW + H_GAP), y: groupY },
      data: { nome: g.nome, papel: g.papel ?? '', escopo: g.escopo, qtdMembros: (grupoMembros[g.id] ?? []).length },
      selected: selectedId === id,
    })
    edges.push({ id: `e-conta-grp-${g.id}`, source: `conta-${account.id}`, target: id, type: 'smoothstep', style: { stroke: theme.edgeConta, strokeWidth: 1.5 } })
  })

  // Usuários
  const userY = groupY + GH + ROW_GAP
  accountMembros.forEach((m, i) => {
    const userId = m.userId ?? m.id
    const id = `usuario-${userId}`
    nodes.push({
      id, type: 'usuario',
      position: { x: i * (UW + H_GAP), y: userY },
      data: { nomeCompleto: m.nomeCompleto ?? userId, email: m.email ?? '', papelConta: m.papel },
      selected: selectedId === id,
    })
    groups.forEach(g => {
      const inGroup = (grupoMembros[g.id] ?? []).some((mb: any) => (mb.id ?? mb.userId) === userId)
      if (!inGroup) return
      edges.push({
        id: `e-usr-grp-${userId}-${g.id}`, source: id, target: `grupo-${g.id}`,
        type: 'smoothstep', animated: true,
        style: { stroke: theme.edgeGroup, strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed' as any, color: theme.edgeGroup },
      })
    })
  })

  // Instâncias (coluna à direita)
  const instX = leftW + 80
  instances.forEach((inst, i) => {
    const id  = `instancia-${inst.id}`
    const mbs = instMembros[inst.id] ?? []
    const comp    = components.find(c => c.id === inst.componenteId)
    const compNome = comp?.nome ?? inst.componenteId
    const isDocNix = (comp as any)?.tipoModelo === 'docnix'
    // Conta apenas membros que têm nó visível no grafo
    const qtdMembros = mbs.filter((mb: any) => {
      const srcId = mb.entidadeTipo === 'user' ? `usuario-${mb.entidadeId}` : `grupo-${mb.entidadeId}`
      return nodes.some(n => n.id === srcId)
    }).length
    nodes.push({
      id, type: 'instancia',
      position: { x: instX, y: i * (IH + INST_GAP) },
      data: { nome: inst.nome, componenteNome: compNome, componenteId: inst.componenteId, qtdMembros, isDocNix },
      selected: selectedId === id,
    })
    mbs.forEach((mb: any) => {
      const srcId = mb.entidadeTipo === 'user' ? `usuario-${mb.entidadeId}` : `grupo-${mb.entidadeId}`
      if (!nodes.some(n => n.id === srcId)) return
      edges.push({
        id: `e-inst-${inst.id}-${mb.entidadeId}`, source: srcId, target: id,
        type: 'smoothstep',
        style: {
          stroke: mb.entidadeTipo === 'user' ? theme.edgeInstUser : theme.edgeInstGroup,
          strokeWidth: 1.5, strokeDasharray: '6 3',
        },
        label: isDocNix ? 'DocNix' : mb.papel,
        labelStyle: { fontSize: 9, fill: theme.cardMuted },
        labelBgStyle: { fill: theme.canvasBg, fillOpacity: 0.85 },
      })
    })
  })

  return { nodes, edges }
}

// ── Painéis laterais ──────────────────────────────────────────

function PainelHeader({ icon, title, subtitle, onClose, theme }: {
  icon: React.ReactNode; title: string; subtitle?: string
  onClose: () => void; theme: VisualizerTheme
}) {
  return (
    <div className="px-5 py-4 flex items-start gap-3 shrink-0"
      style={{ borderBottom: `1px solid ${theme.panelBorder}` }}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: theme.panelText }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5 truncate" style={{ color: theme.panelMuted }}>{subtitle}</p>}
      </div>
      <button onClick={onClose} className="p-1 rounded transition-colors shrink-0"
        style={{ color: theme.panelMuted }}
        onMouseEnter={e => (e.currentTarget.style.background = theme.rowHover)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Painel de Grupo
function GrupoPanel({ grupoId, graphData, accountId, theme, onClose, onRefresh, onOpenPermissoes }: {
  grupoId: string; graphData: GraphData; accountId: string; theme: VisualizerTheme
  onClose: () => void; onRefresh: () => void; onOpenPermissoes: (opts: any) => void
}) {
  const grupo   = graphData.groups.find(g => g.id === grupoId)
  const membros = graphData.grupoMembros[grupoId] ?? []
  const [search, setSearch]  = useState('')
  const [adding, setAdding]  = useState(false)
  const [removingId, setRem] = useState<string | null>(null)

  const jaIds    = useMemo(() => new Set(membros.map((m: any) => m.id ?? m.userId)), [membros])
  const sugestoes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return graphData.allUsers
      .filter(u => !jaIds.has(u.id) && (
        (u.nomeCompleto ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      )).slice(0, 5)
  }, [search, graphData.allUsers, jaIds])

  async function handleAdd(uid: string) {
    setAdding(true)
    try { await api.addGrupoMembro(grupoId, uid); setSearch(''); onRefresh() }
    finally { setAdding(false) }
  }
  async function handleRemove(uid: string) {
    setRem(uid)
    try { await api.removeGrupoMembro(grupoId, uid); onRefresh() }
    finally { setRem(null) }
  }

  if (!grupo) return null

  return (
    <>
      <PainelHeader
        icon={<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: theme.btnPermBg }}><Shield className="w-5 h-5" style={{ color: theme.btnPermText }} /></div>}
        title={grupo.nome}
        subtitle={`${grupo.escopo}${grupo.papel ? ' · ' + grupo.papel : ''}`}
        onClose={onClose} theme={theme}
      />

      {/* Membros + Objetos */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: theme.sectionLabel }}>
          Membros ({membros.length})
        </p>

        {/* Busca */}
        <div className="relative mb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
            style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}>
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: theme.panelMuted }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Adicionar membro..."
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: theme.inputText }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-sm leading-none" style={{ color: theme.panelMuted }}>×</button>
            )}
          </div>
          {sugestoes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-10 overflow-hidden"
              style={{ background: theme.dropBg, border: `1px solid ${theme.dropBorder}` }}>
              {sugestoes.map((u: any) => (
                <button key={u.id} onClick={() => handleAdd(u.id)} disabled={adding}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left"
                  style={{ color: theme.dropText }}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.dropHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <AvatarCircle nome={u.nomeCompleto} size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{u.nomeCompleto}</p>
                    <p className="text-[10px] truncate" style={{ color: theme.dropSub }}>{u.email}</p>
                  </div>
                  {adding && <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: theme.panelMuted }} />}
                </button>
              ))}
            </div>
          )}
          {search.trim() && sugestoes.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg px-3 py-2.5 z-10"
              style={{ background: theme.dropBg, border: `1px solid ${theme.dropBorder}` }}>
              <p className="text-xs" style={{ color: theme.panelMuted }}>Nenhum usuário encontrado.</p>
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          {membros.length === 0
            ? <p className="text-xs text-center py-6" style={{ color: theme.panelMuted }}>Nenhum membro ainda.</p>
            : membros.map((m: any) => {
                const uid  = m.id ?? m.userId
                const nome = m.nomeCompleto ?? uid
                return (
                  <div key={uid} className="group flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors"
                    style={{ color: theme.panelText }}
                    onMouseEnter={e => (e.currentTarget.style.background = theme.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <AvatarCircle nome={nome} size={26} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{nome}</p>
                      {m.email && <p className="text-[10px] truncate" style={{ color: theme.panelMuted }}>{m.email}</p>}
                    </div>
                    <button onClick={() => handleRemove(uid)} disabled={!!removingId}
                      className="invisible group-hover:visible p-1 rounded transition-colors shrink-0 text-red-500 hover:bg-red-100/50">
                      {removingId === uid
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <UserMinus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )
              })
          }
        </div>

        {/* Objetos */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.sectionLabel }}>
              Objetos ({graphData.instances.length})
            </p>
            <span title="Objetos desta conta — clique no cadeado para atribuir permissões do grupo" className="cursor-default">
              <Info className="w-3 h-3 opacity-40 hover:opacity-70 transition-opacity" style={{ color: theme.sectionLabel }} />
            </span>
          </div>
          <div className="space-y-1">
            {graphData.instances.map(inst => {
              const membroDoGrupo = (graphData.instMembros[inst.id] ?? []).find(
                (m: any) => m.entidadeTipo === 'group' && m.entidadeId === grupoId
              )
              const comp     = graphData.components.find(c => c.id === inst.componenteId)
              const tipo     = inferTipo(comp?.nome ?? '')
              const isDocNix = (comp as any)?.tipoModelo === 'docnix'
              return (
                <div key={inst.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: theme.instBg, border: `1px solid ${theme.instBorder}` }}
                >
                  <CompIcon tipo={tipo} size={13} color={compIconColor(tipo, theme.mode)} />
                  <span className="text-xs flex-1 truncate" style={{ color: theme.panelText }}>{inst.nome}</span>
                  {membroDoGrupo && (
                    isDocNix
                      ? <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 border border-violet-200">DocNix</span>
                      : <span className="text-[9px] font-semibold" style={{ color: theme.btnPermText }}>{membroDoGrupo.papel}</span>
                  )}
                  <button
                    onClick={() => onOpenPermissoes({
                      entityType: 'grupo',
                      entityId: grupoId,
                      entityNome: grupo.nome,
                      accountId,
                      instanciaId: inst.id,
                      instanciaComponenteId: inst.componenteId,
                      instanciaNome: inst.nome,
                    })}
                    title="Atribuir permissões neste objeto"
                    className="p-1 rounded transition-colors shrink-0"
                    style={{ color: membroDoGrupo ? theme.btnPermText : theme.panelMuted }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = membroDoGrupo ? '1' : '0.4')}
                  >
                    <Lock className="w-3 h-3" style={{ opacity: membroDoGrupo ? 1 : 0.4 }} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

// Painel de Usuário
function UsuarioPanel({ userId, graphData, accountId, theme, onClose, onRefresh: _onRefresh, onOpenPermissoes }: {
  userId: string; graphData: GraphData; accountId: string; theme: VisualizerTheme
  onClose: () => void; onRefresh: () => void; onOpenPermissoes: (opts: any) => void
}) {
  const membro = graphData.accountMembros.find(m => (m.userId ?? m.id) === userId)
  const nome   = membro?.nomeCompleto ?? userId

  const userGrupos = graphData.groups.filter(g =>
    (graphData.grupoMembros[g.id] ?? []).some((m: any) => (m.id ?? m.userId) === userId)
  )
  const userGrupoIds = new Set(userGrupos.map(g => g.id))
  const userInstanciasDiretas = graphData.instances.filter(inst =>
    (graphData.instMembros[inst.id] ?? []).some((m: any) => m.entidadeTipo === 'user' && m.entidadeId === userId)
  )
  const userInstanciasViaGrupo = graphData.instances.filter(inst =>
    !userInstanciasDiretas.some(d => d.id === inst.id) &&
    (graphData.instMembros[inst.id] ?? []).some((m: any) => m.entidadeTipo === 'group' && userGrupoIds.has(m.entidadeId))
  )
  const userInstanciasSemAcesso = graphData.instances.filter(inst =>
    !userInstanciasDiretas.some(d => d.id === inst.id) &&
    !userInstanciasViaGrupo.some(v => v.id === inst.id)
  )

  if (!membro) return null

  return (
    <>
      <PainelHeader icon={<AvatarCircle nome={nome} size={36} />} title={nome} subtitle={membro.email} onClose={onClose} theme={theme} />

      <div className="px-5 py-3 shrink-0 flex items-center gap-2" style={{ borderBottom: `1px solid ${theme.panelBorder}` }}>
        <span className="text-xs" style={{ color: theme.panelSub }}>Papel na conta:</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={membro.papel === 'account_admin' ? papelBadgeStyle('Admin', theme) : papelBadgeStyle('Viewer', theme)}>
          {membro.papel === 'account_admin' ? '★ Account Admin' : 'Membro'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.sectionLabel }}>
              Grupos ({userGrupos.length})
            </p>
            <span title="Grupos dos quais este usuário é membro" className="cursor-default">
              <Info className="w-3 h-3 opacity-40 hover:opacity-70 transition-opacity" style={{ color: theme.sectionLabel }} />
            </span>
          </div>
          {userGrupos.length === 0
            ? <p className="text-xs" style={{ color: theme.panelMuted }}>Não pertence a nenhum grupo desta conta.</p>
            : <div className="space-y-1">
                {userGrupos.map(g => (
                  <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: theme.rowBg, border: `1px solid ${theme.panelBorder}` }}>
                    <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: theme.btnPermText }} />
                    <span className="text-xs flex-1 truncate" style={{ color: theme.panelText }}>{g.nome}</span>
                    {g.papel && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={papelBadgeStyle(g.papel, theme)}>
                        {g.papel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
          }
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.sectionLabel }}>
              Acesso direto ({userInstanciasDiretas.length})
            </p>
            <span title="Objetos onde este usuário foi adicionado individualmente" className="cursor-default">
              <Info className="w-3 h-3 opacity-40 hover:opacity-70 transition-opacity" style={{ color: theme.sectionLabel }} />
            </span>
          </div>
          {userInstanciasDiretas.length === 0
            ? <p className="text-xs" style={{ color: theme.panelMuted }}>Sem acesso direto a objetos.</p>
            : <div className="space-y-1">
                {userInstanciasDiretas.map(inst => {
                  const mb       = (graphData.instMembros[inst.id] ?? []).find((m: any) => m.entidadeId === userId)
                  const comp     = graphData.components.find(c => c.id === inst.componenteId)
                  const compNome = comp?.nome
                  const tipo     = inferTipo(compNome)
                  const isDocNix = (comp as any)?.tipoModelo === 'docnix'
                  return (
                    <div key={inst.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: theme.instBg, border: `1px solid ${theme.instBorder}` }}>
                      <CompIcon tipo={tipo} size={13} color={compIconColor(tipo, theme.mode)} />
                      <span className="text-xs flex-1 truncate" style={{ color: theme.panelText }}>{inst.nome}</span>
                      {isDocNix
                        ? <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 border border-violet-200">DocNix</span>
                        : mb?.papel && <span className="text-[9px] font-semibold" style={{ color: theme.btnPermText }}>{mb.papel}</span>
                      }
                      <button
                        onClick={() => onOpenPermissoes({
                          entityType: 'usuario',
                          entityId: userId,
                          entityNome: nome,
                          accountId,
                          instanciaId: inst.id,
                          instanciaComponenteId: inst.componenteId,
                          instanciaNome: inst.nome,
                        })}
                        title="Editar permissões neste objeto"
                        className="p-1 rounded transition-colors shrink-0"
                        style={{ color: theme.btnPermText }}
                      >
                        <Lock className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
          }
        </div>

        {userInstanciasViaGrupo.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.sectionLabel }}>
                Via grupo ({userInstanciasViaGrupo.length})
              </p>
              <span title="Objetos acessíveis por herança de um grupo do qual este usuário faz parte" className="cursor-default">
                <Info className="w-3 h-3 opacity-40 hover:opacity-70 transition-opacity" style={{ color: theme.sectionLabel }} />
              </span>
            </div>
            <div className="space-y-1">
              {userInstanciasViaGrupo.map(inst => {
                const grupoConcedente = userGrupos.find(g =>
                  (graphData.instMembros[inst.id] ?? []).some((m: any) => m.entidadeTipo === 'group' && m.entidadeId === g.id)
                )
                const comp     = graphData.components.find(c => c.id === inst.componenteId)
                const compNome = comp?.nome
                const tipo     = inferTipo(compNome)
                const isDocNix = (comp as any)?.tipoModelo === 'docnix'
                return (
                  <div key={inst.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: theme.instBg, border: `1px solid ${theme.instBorder}` }}>
                    <CompIcon tipo={tipo} size={13} color={compIconColor(tipo, theme.mode)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: theme.panelText }}>{inst.nome}</p>
                      {grupoConcedente && (
                        <p className="text-[10px] truncate" style={{ color: theme.panelMuted }}>{grupoConcedente.nome}</p>
                      )}
                    </div>
                    {isDocNix
                      ? <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 border border-violet-200">DocNix</span>
                      : <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">grupo</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Painel de Instância
function InstanciaPanel({ instanciaId, graphData, theme, onClose, onOpenInstancia }: {
  instanciaId: string; graphData: GraphData; accountId: string; theme: VisualizerTheme
  onClose: () => void; onOpenInstancia: (inst: any) => void
}) {
  const inst    = graphData.instances.find(i => i.id === instanciaId)
  const membros = graphData.instMembros[instanciaId] ?? []
  const comp    = graphData.components.find(c => c.id === inst?.componenteId)
  const tipo    = inferTipo(comp?.nome)

  if (!inst) return null

  return (
    <>
      <PainelHeader
        icon={<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: theme.instBg, border: `1px solid ${theme.instBorder}` }}>
          <CompIcon tipo={tipo} size={18} color={compIconColor(tipo, theme.mode)} />
        </div>}
        title={inst.nome} subtitle={comp?.nome ?? inst.componenteId}
        onClose={onClose} theme={theme}
      />

      <div className="px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${theme.panelBorder}` }}>
        <button
          onClick={() => onOpenInstancia(inst)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          Gerenciar membros e permissões
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: theme.sectionLabel }}>
          Membros ({membros.length})
        </p>
        {membros.length === 0
          ? <p className="text-xs text-center py-6" style={{ color: theme.panelMuted }}>Nenhum membro ainda.</p>
          : <div className="space-y-0.5">
              {membros.map((mb: any) => {
                const isGroup   = mb.entidadeTipo === 'group'
                const nome      = mb.displayName ?? mb.entidadeId
                const isDocNix  = (comp as any)?.tipoModelo === 'docnix'
                return (
                  <div key={mb.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
                    style={{ background: theme.rowBg, border: `1px solid ${theme.panelBorder}` }}>
                    {isGroup
                      ? <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: theme.btnPermBg }}>
                          <Shield className="w-3.5 h-3.5" style={{ color: theme.btnPermText }} />
                        </div>
                      : <AvatarCircle nome={nome} size={24} />}
                    <span className="text-xs flex-1 truncate" style={{ color: theme.panelText }}>{nome}</span>
                    {isGroup && (
                      <span className="text-[9px] px-1 py-0.5 rounded font-medium"
                        style={{ background: theme.btnPermBg, color: theme.btnPermText, border: `1px solid ${theme.btnPermBorder}` }}>
                        grupo
                      </span>
                    )}
                    {isDocNix
                      ? <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 border border-violet-200">DocNix</span>
                      : <span className="text-[9px] font-medium" style={{ color: theme.panelMuted }}>{mb.papel}</span>
                    }
                  </div>
                )
              })}
            </div>
        }
      </div>
    </>
  )
}

// ── Painel lateral unificado ──────────────────────────────────

function DetailPanel({ selected, graphData, accountId, theme, onClose, onRefresh, onOpenInstancia, onOpenPermissoes }: {
  selected: SelectedEntity; graphData: GraphData; accountId: string; theme: VisualizerTheme
  onClose: () => void; onRefresh: () => void
  onOpenInstancia: (inst: any) => void; onOpenPermissoes: (opts: any) => void
}) {
  return (
    <div className="w-[360px] shrink-0 flex flex-col overflow-hidden"
      style={{ background: theme.panelBg, borderLeft: `1px solid ${theme.panelBorder}` }}>
      {selected.type === 'grupo' && (
        <GrupoPanel grupoId={selected.id} graphData={graphData} accountId={accountId} theme={theme}
          onClose={onClose} onRefresh={onRefresh} onOpenPermissoes={onOpenPermissoes} />
      )}
      {selected.type === 'usuario' && (
        <UsuarioPanel userId={selected.id} graphData={graphData} accountId={accountId} theme={theme}
          onClose={onClose} onRefresh={onRefresh} onOpenPermissoes={onOpenPermissoes} />
      )}
      {selected.type === 'instancia' && (
        <InstanciaPanel instanciaId={selected.id} graphData={graphData} accountId={accountId} theme={theme}
          onClose={onClose} onOpenInstancia={onOpenInstancia} />
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function CanvasPermissoesPage() {
  const isPlatformAdmin   = useIsPlatformAdmin()
  const isOrgAdmin        = useIsOrgAdmin()
  const isAccountAdmin    = useIsAccountAdmin()
  const defaultAccId      = useAdminAccountId()
  const adminOrgId        = useAdminOrgId()
  const isAccountAdminOnly = isAccountAdmin && !isPlatformAdmin && !isOrgAdmin
  const { theme, mode, toggle } = useVisualizerTheme()

  // accountId persiste em sessionStorage — sobrevive à navegação entre abas
  const [accountId, setAccountId] = useSessionState<string | null>('canvas-accountId', null)

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [allAccounts, setAllAccounts] = useState<any[]>([])
  const [graphData,   setGraphData]   = useState<GraphData | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [refreshKey,  setRefreshKey]  = useState(0)

  const [selected,       setSelected]  = useState<SelectedEntity | null>(null)
  const [instanciaSheet, setInstSheet] = useState<any>(null)
  const [permissoesSheet,setPermSheet] = useState<any>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Carrega contas:
  // - Account Admin: fixa na própria conta (sem dropdown)
  // - Org Admin: só contas da sua org
  // - Platform Admin: todas
  useEffect(() => {
    if (isAccountAdminOnly && defaultAccId) {
      api.getAccount(defaultAccId).then(acc => {
        setAllAccounts([acc])
        setAccountId(defaultAccId)
      }).catch(() => {
        const mock = mockAccounts.find(a => a.id === defaultAccId)
        if (mock) { setAllAccounts([mock]); setAccountId(defaultAccId) }
      })
      return
    }
    const orgFilter = (!isPlatformAdmin && isOrgAdmin && adminOrgId) ? adminOrgId : undefined
    api.getAccounts(orgFilter).then(acc => {
      const ativos = (acc as any[]).filter(a => !a.deletedAt)
      setAllAccounts(ativos)
      if (!accountId) setAccountId(defaultAccId ?? ativos[0]?.id ?? null)
    }).catch(() => {
      const fallback = mockAccounts.filter(a => !orgFilter || a.orgId === orgFilter)
      setAllAccounts(fallback)
      if (!accountId) setAccountId(defaultAccId ?? fallback[0]?.id ?? null)
    })
  }, [])

  // Carrega dados da conta
  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    setSelected(null)
    async function load() {
      try {
        const [account, membros, grupos, instances, components] = await Promise.all([
          api.getAccount(accountId!),
          api.getAccountMembros(accountId!),
          api.getGrupos({ accountId: accountId! }),
          api.getInstancias({ accountId: accountId! }),
          api.getComponentes(),
        ])
        const [gmEntries, imEntries] = await Promise.all([
          Promise.all((grupos as any[]).map(g =>
            api.getGrupoMembros(g.id).then(mbs => [g.id, mbs] as [string, any[]]).catch(() => [g.id, []] as [string, any[]])
          )),
          Promise.all((instances as any[]).map(inst =>
            api.getInstanciaMembros(inst.id).then(mbs => [inst.id, mbs] as [string, any[]]).catch(() => [inst.id, []] as [string, any[]])
          )),
        ])
        setGraphData({
          account,
          accountMembros: membros as any[],
          groups:    grupos    as any[],
          instances: instances as any[],
          components: (components as any[]).filter(c => c.status !== 'Inativo'),
          grupoMembros: Object.fromEntries(gmEntries),
          instMembros:  Object.fromEntries(imEntries),
          allUsers: membros as any[],
        })
      } catch (e) {
        console.error(e)
        // Fallback mock para quando o Neon está hibernando
        const accMock     = mockAccounts.find(a => a.id === accountId) ?? null
        const membroIds   = accountMembrosIds[accountId!] ?? []
        const membrosMock = mockUsers.filter(u => membroIds.includes(u.id))
        const gruposMock  = mockGrupos.filter(g => g.accountId === accountId)
        const instsMock   = mockInstancias.filter(i => i.accountId === accountId)
        if (accMock) {
          const grupoMembros = Object.fromEntries(
            gruposMock.map(g => [
              g.id,
              mockUsers.filter(u => (grupoMembrosMap[g.id] ?? []).includes(u.id)),
            ])
          )
          const instMembros = Object.fromEntries(
            instsMock.map(i => [
              i.id,
              mockInstMembros.filter(m => m.instanciaId === i.id),
            ])
          )
          setGraphData({
            account:       accMock,
            accountMembros: membrosMock,
            groups:    gruposMock,
            instances: instsMock.filter((i: any) => i.status !== 'Inativo'),
            components: [],
            grupoMembros,
            instMembros,
            allUsers: membrosMock,
          })
        }
      }
      finally { setLoading(false) }
    }
    load()
  }, [accountId, refreshKey])

  // Reconstrói o grafo
  useEffect(() => {
    if (!graphData) return
    const selId = selected ? `${selected.type}-${selected.id}` : null
    const { nodes: n, edges: e } = buildGraph(graphData, selId, theme)
    setNodes(n)
    setEdges(e)
  }, [graphData, selected?.id, selected?.type, theme])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'conta') return
    const parts = node.id.split('-')
    const type  = parts[0] as EntityType
    const id    = parts.slice(1).join('-')
    setSelected({ type, id })
  }, [])

  const onPaneClick = useCallback(() => setSelected(null), [])
  const refresh = () => setRefreshKey(k => k + 1)
  const selectedAccount = allAccounts.find(a => a.id === accountId)

  return (
    <VisualizerThemeContext.Provider value={theme}>
      <div className="flex flex-col flex-1 min-h-0" style={{ background: theme.canvasBg }}>

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-3 shrink-0"
          style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.headerBorder}` }}>
          <div>
            <h1 className="text-base font-semibold" style={{ color: theme.headerText }}>Canvas de Permissões</h1>
            <p className="text-xs" style={{ color: theme.headerSub }}>
              Visualize e gerencie grupos, usuários e instâncias de uma conta
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Seletor de conta */}
            <select
              value={accountId ?? ''}
              onChange={e => { setAccountId(e.target.value); setSelected(null) }}
              className="text-sm rounded-lg px-3 py-1.5 outline-none min-w-[220px] transition-colors"
              style={{ background: theme.selectBg, border: `1px solid ${theme.selectBorder}`, color: theme.selectText }}
            >
              <option value="" disabled>Selecionar conta…</option>
              {allAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            {/* Toggle light/dark */}
            <button
              onClick={toggle}
              title={mode === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ background: theme.toggleBg, border: `1px solid ${theme.toggleBorder}`, color: theme.toggleText }}
            >
              {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="text-xs font-medium">{mode === 'dark' ? 'Claro' : 'Escuro'}</span>
            </button>

            {/* Sobre o Canvas */}
            <button
              onClick={() => setShowOnboarding(true)}
              title="Sobre o Canvas"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ background: theme.toggleBg, border: `1px solid ${theme.toggleBorder}`, color: theme.toggleText }}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Sobre</span>
            </button>
          </div>
        </div>

        {/* Canvas + Painel */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 min-h-0">
            {!accountId ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: theme.panelMuted }} />
                  <p className="text-sm font-medium" style={{ color: theme.panelMuted }}>
                    Selecione uma conta para visualizar o canvas
                  </p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500" />
                  <p className="text-sm" style={{ color: theme.panelMuted }}>Carregando canvas…</p>
                </div>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes} edges={edges}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick} onPaneClick={onPaneClick}
                colorMode={theme.rfColorMode}
                fitView fitViewOptions={{ padding: 0.18 }}
                minZoom={0.25} maxZoom={1.8}
                proOptions={{ hideAttribution: true }}
              >
                <Background
                  color={theme.dotColor}
                  variant={BackgroundVariant.Dots}
                  gap={24} size={1.5}
                  style={{ background: theme.canvasBg }}
                />
                <Controls />
                <MiniMap
                  nodeColor={n => {
                    if (n.type === 'conta')   return '#f59e0b'
                    if (n.type === 'grupo')   return '#3b82f6'
                    if (n.type === 'usuario') return '#10b981'
                    return '#8b5cf6'
                  }}
                  maskColor={theme.minimapMask}
                  style={{ background: theme.minimapBg, border: `1px solid ${theme.minimapBorder}`, borderRadius: 12 }}
                />

                {/* Legenda */}
                <Panel position="bottom-left">
                  <div className="rounded-xl px-4 py-3 backdrop-blur-sm"
                    style={{ background: theme.legendBg, border: `1px solid ${theme.legendBorder}` }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.sectionLabel }}>
                      Legenda
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { c: '#f59e0b', l: 'Conta (âncora)' },
                        { c: '#3b82f6', l: 'Grupo' },
                        { c: '#10b981', l: 'Usuário' },
                        { c: '#8b5cf6', l: 'Objeto' },
                      ].map(({ c, l }) => (
                        <div key={l} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} />
                          <span className="text-[11px]" style={{ color: theme.legendText }}>{l}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 pt-2.5 space-y-1.5" style={{ borderTop: `1px solid ${theme.legendDivide}` }}>
                      <div className="flex items-center gap-2">
                        <span className="w-5 border-t-2" style={{ borderColor: theme.edgeGroup }} />
                        <span className="text-[10px]" style={{ color: theme.legendSub }}>membro de grupo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 border-t-2 border-dashed" style={{ borderColor: theme.instBorder }} />
                        <span className="text-[10px]" style={{ color: theme.legendSub }}>acesso ao objeto</span>
                      </div>
                    </div>
                  </div>
                </Panel>
              </ReactFlow>
            )}
          </div>

          {/* Painel lateral */}
          {selected && graphData && (
            <DetailPanel
              selected={selected} graphData={graphData} accountId={accountId!} theme={theme}
              onClose={() => setSelected(null)} onRefresh={refresh}
              onOpenInstancia={inst => setInstSheet(inst)}
              onOpenPermissoes={opts => setPermSheet(opts)}
            />
          )}
        </div>

        {/* Sheets */}
        {instanciaSheet && (
          <InstanciaDetailSheet
            open={!!instanciaSheet} onClose={() => setInstSheet(null)}
            instancia={instanciaSheet}
            componenteNome={graphData?.components.find(c => c.id === instanciaSheet?.componenteId)?.nome}
            componenteTipoModelo={(graphData?.components.find(c => c.id === instanciaSheet?.componenteId) as any)?.tipoModelo ?? 'fga'}
            accountNome={selectedAccount?.name}
            accountId={accountId!}
          />
        )}
        {permissoesSheet && (
          <AtribuirPermissoesSheet
            open={!!permissoesSheet} onClose={() => { setPermSheet(null); refresh() }}
            {...permissoesSheet}
          />
        )}

        {/* Modal — Onboarding Canvas */}
        <Modal
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          title="Sobre o Canvas de Permissões"
          footer={
            <button
              onClick={() => setShowOnboarding(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-[#030712] rounded-lg hover:bg-[#1f2937] transition-colors"
            >
              Entendi
            </button>
          }
        >
          <div className="text-sm text-[#374151] leading-relaxed space-y-3">
            <p>Você está no Canvas de Permissões. Esta tela mostra uma visão gráfica da estrutura de acessos da conta: grupos, usuários e objetos, conectados pelas relações de permissão.</p>
            <ul className="space-y-1.5 pl-1">
              <li><strong className="font-semibold">Linha sólida</strong> entre usuário e grupo: o usuário é membro daquele grupo.</li>
              <li><strong className="font-semibold">Linha tracejada</strong> entre grupo/usuário e objeto: o grupo ou usuário tem acesso direto ao objeto.</li>
            </ul>
            <p>Clique em qualquer nó para ver detalhes no painel lateral.</p>
          </div>
        </Modal>
      </div>
    </VisualizerThemeContext.Provider>
  )
}
