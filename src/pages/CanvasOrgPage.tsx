/**
 * CanvasOrgPage — Visão org-level do canvas de permissões.
 *
 * Hierarquia: Org → Contas → (expandir inline) Grupos / Usuários / Instâncias
 *
 * Clique em uma Conta para expandir seus detalhes no mesmo canvas.
 * Clique em Grupo / Usuário / Instância para abrir o painel lateral.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  Handle,
  Position,
  BackgroundVariant,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Users, Shield, Bot, Database, Layers, X, Building, Building2,
  UserMinus, Loader2, ChevronDown, ChevronUp, Lock, Search,
  Sun, Moon, ChevronRight, HelpCircle, Info,
} from 'lucide-react'
import { api } from '@/api/client'
import { useIsPlatformAdmin, useIsOrgAdmin } from '@/authz'
import { useSessionState } from '@/hooks/useSessionState'
import { InstanciaDetailSheet } from '@/components/instancias/InstanciaDetailSheet'
import { AtribuirPermissoesSheet } from '@/components/permissoes/AtribuirPermissoesSheet'
import { Modal } from '@/components/ui/Modal'
// import { cn } from '@/lib/utils'
import { VisualizerThemeContext, useNodeTheme, type VisualizerTheme } from '@/lib/visualizerTheme'
import { useVisualizerTheme } from '@/hooks/useVisualizerTheme'

// ── Tipos ──────────────────────────────────────────────────────

type EntityType = 'grupo' | 'usuario' | 'instancia'
interface SelectedEntity { type: EntityType; id: string; accountId: string }

interface AccountData {
  accountMembros: any[]
  groups:         any[]
  instances:      any[]
  components:     any[]
  grupoMembros:   Record<string, any[]>
  instMembros:    Record<string, any[]>
  allUsers:       any[]
}

// ── Dimensões ─────────────────────────────────────────────────

const ORG_W  = 260, ORG_H  = 88
const ACCT_W = 210, ACCT_H = 104
const GW = 200, GH = 104
const UW = 175, UH = 68
const IW = 215, IH = 98

const H_GAP_ACCT = 40   // espaço entre contas
const H_GAP_SUB  = 28   // espaço entre sub-nós
const ROW_GAP    = 60   // espaço vertical entre linhas
const INST_GAP   = 24   // espaço vertical entre instâncias

// ── Helpers ───────────────────────────────────────────────────

type CompTipo = 'assistente-ia' | 'base-conhecimento' | 'analytics' | 'default'

function inferTipo(nome?: string): CompTipo {
  const n = (nome ?? '').toLowerCase()
  if (n.includes('assistente') || n.includes('pas core')) return 'assistente-ia'
  if (n.includes('base') || n.includes('knowledge'))      return 'base-conhecimento'
  if (n.includes('analytics') || n.includes('dashboard')) return 'analytics'
  return 'default'
}

function CompIcon({ tipo, size = 14, color }: { tipo: CompTipo; size?: number; color?: string }) {
  const s = { width: size, height: size, color: color ?? 'currentColor', flexShrink: 0 }
  if (tipo === 'assistente-ia')     return <Bot      style={s} />
  if (tipo === 'base-conhecimento') return <Database style={s} />
  return                                   <Layers   style={s} />
}

function compIconColor(tipo: CompTipo, mode: 'dark' | 'light'): string {
  return mode === 'dark'
    ? tipo === 'assistente-ia' ? '#a78bfa' : tipo === 'base-conhecimento' ? '#60a5fa' : '#34d399'
    : tipo === 'assistente-ia' ? '#7c3aed' : tipo === 'base-conhecimento' ? '#2563eb' : '#059669'
}

function AvatarCircle({ nome, size = 26 }: { nome: string; size?: number }) {
  const ini = (nome ?? '?').split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
  return (
    <div className="rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {ini}
    </div>
  )
}

function papelBadgeStyle(papel: string, t: VisualizerTheme): React.CSSProperties {
  const b = papel === 'Admin' ? t.badgeAdmin : papel === 'User' ? t.badgeUser : t.badgeViewer
  return { background: b.bg, color: b.text, border: `1px solid ${b.border}` }
}

// ── Nós customizados ──────────────────────────────────────────

function OrgNode({ data }: { data: any }) {
  const t = useNodeTheme()
  return (
    <div className="rounded-2xl shadow-lg" style={{ width: ORG_W, minHeight: ORG_H, background: t.contaBg, border: '2px solid #f59e0b' }}>
      <Handle type="source" position={Position.Bottom} style={{ background: '#f59e0b', width: 8, height: 8 }} />
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
          <Building className="w-5 h-5 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold leading-tight truncate" style={{ color: t.cardText }}>{data.nome}</p>
          {data.razaoSocial && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: t.cardSub }}>{data.razaoSocial}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] font-medium text-amber-500">{data.qtdContas} {data.qtdContas === 1 ? 'conta' : 'contas'}</span>
            <span className="text-[10px]" style={{ color: t.cardMuted }}>{data.qtdUsuarios} usuários</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountNode({ data, selected }: { data: any; selected?: boolean }) {
  const t = useNodeTheme()
  const isExpanded = data.expanded
  const isLoading  = data.loading
  const border = selected || isExpanded ? '#3b82f6' : t.cardBorder
  const glow   = isExpanded ? `0 0 0 2px ${t.cardSelGlow}, 0 4px 20px rgba(0,0,0,0.15)` : '0 2px 8px rgba(0,0,0,0.08)'

  return (
    <div className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{ width: ACCT_W, minHeight: ACCT_H, background: t.cardBg, border: `1.5px solid ${border}`, boxShadow: glow }}>
      <Handle type="target" position={Position.Top}    style={{ background: t.cardBorder, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6',   width: 7, height: 7, opacity: isExpanded ? 1 : 0 }} />

      {/* Topo colorido */}
      <div style={{ height: 3, background: isExpanded ? '#3b82f6' : t.cardBorder }} />

      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: isExpanded ? 'rgba(59,130,246,0.12)' : `${t.cardBorder}40` }}>
            <Building2 className="w-3.5 h-3.5" style={{ color: isExpanded ? '#3b82f6' : t.cardMuted }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: t.cardText }}>{data.nome}</p>
            <p className="text-[10px] truncate mt-0.5" style={{ color: t.cardMuted }}>{data.subdomain}.itss.com.br</p>
            <p className="text-[10px] mt-1" style={{ color: t.cardSub }}>
              <Users className="w-2.5 h-2.5 inline mr-0.5" />
              {data.qtdMembros} {data.qtdMembros === 1 ? 'membro' : 'membros'}
            </p>
          </div>
          {isLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5 text-blue-400" />
            : isExpanded
              ? <ChevronUp   className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
              : <ChevronDown className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: t.cardMuted }} />
          }
        </div>
      </div>
    </div>
  )
}

function GrupoNode({ data, selected }: { data: any; selected?: boolean }) {
  const t = useNodeTheme()
  const barColor = data.papel === 'Admin' ? '#f97316' : data.papel === 'User' ? '#3b82f6' : '#6b7280'
  const border   = selected ? t.cardSelBorder : t.cardBorder
  const glow     = selected ? `0 0 0 2px ${t.cardSelGlow}` : '0 1px 4px rgba(0,0,0,0.07)'
  return (
    <div className="rounded-xl overflow-hidden" style={{ width: GW, minHeight: GH, background: t.cardBg, border: `1.5px solid ${border}`, boxShadow: glow }}>
      <Handle type="target" position={Position.Top}    style={{ background: t.cardBorder, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: t.cardBorder, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right}  style={{ background: t.cardBorder, width: 6, height: 6 }} id="right" />
      <div style={{ height: 3, background: barColor }} />
      <div className="px-3 py-2">
        <div className="flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: t.cardMuted }} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold truncate" style={{ color: t.cardText }}>{data.nome}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {data.papel && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={papelBadgeStyle(data.papel, t)}>{data.papel}</span>}
              <span className="text-[9px] capitalize" style={{ color: t.cardMuted }}>{data.escopo}</span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: t.cardMuted }}>
              <Users className="w-2 h-2 inline mr-0.5" />{data.qtdMembros} {data.qtdMembros === 1 ? 'membro' : 'membros'}
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
  const glow   = selected ? `0 0 0 2px ${t.cardSelGlow}` : '0 1px 4px rgba(0,0,0,0.06)'
  return (
    <div className="rounded-xl overflow-hidden" style={{ width: UW, minHeight: UH, background: t.cardBg, border: `1.5px solid ${border}`, boxShadow: glow }}>
      <Handle type="target" position={Position.Top}   style={{ background: t.cardBorder, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} style={{ background: t.cardBorder, width: 6, height: 6 }} />
      <div className="px-2.5 py-2 flex items-center gap-2">
        <AvatarCircle nome={data.nomeCompleto} size={24} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold truncate" style={{ color: t.cardText }}>{data.nomeCompleto}</p>
          <p className="text-[9px] truncate" style={{ color: t.cardSub }}>{data.email}</p>
          {data.papelConta && <p className="text-[9px] font-medium mt-0.5 text-blue-500">{data.papelConta === 'account_admin' ? '★ Admin' : 'membro'}</p>}
        </div>
      </div>
    </div>
  )
}

function InstanciaNode({ data, selected }: { data: any; selected?: boolean }) {
  const t    = useNodeTheme()
  const tipo = inferTipo(data.componenteNome)
  const border = selected ? t.instSelBorder : t.instBorder
  const glow   = selected ? `0 0 0 2px ${t.instSelGlow}` : '0 1px 6px rgba(0,0,0,0.07)'
  return (
    <div className="rounded-xl overflow-hidden" style={{ width: IW, minHeight: IH, background: t.instBg, border: `1.5px solid ${border}`, boxShadow: glow }}>
      <Handle type="target" position={Position.Left} style={{ background: t.instBorder, width: 6, height: 6 }} />
      <div style={{ height: 2, background: 'linear-gradient(90deg, #8b5cf6, #22d3ee)' }} />
      <div className="px-2.5 py-2">
        <div className="flex items-start gap-1.5">
          <CompIcon tipo={tipo} size={13} color={compIconColor(tipo, t.mode)} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold truncate" style={{ color: t.cardText }}>{data.nome}</p>
            <p className="text-[9px] truncate mt-0.5" style={{ color: t.cardSub }}>{data.componenteNome}</p>
            <p className="text-[9px] mt-1" style={{ color: '#8b5cf6' }}>
              <Users className="w-2 h-2 inline mr-0.5" />{data.qtdMembros} {data.qtdMembros === 1 ? 'membro' : 'membros'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const nodeTypes = { org: OrgNode, account: AccountNode, grupo: GrupoNode, usuario: UsuarioNode, instancia: InstanciaNode }

// ── Layout ────────────────────────────────────────────────────

interface BuildInput {
  org:              any
  accounts:         any[]
  expandedId:       string | null
  loadingId:        string | null
  accountDataCache: Record<string, AccountData>
  theme:            VisualizerTheme
  selectedNodeId:   string | null
}

function buildGraph({ org, accounts, expandedId, loadingId, accountDataCache, theme, selectedNodeId }: BuildInput): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Largura total dos nós de conta
  const totalAcctW = accounts.length * ACCT_W + Math.max(0, accounts.length - 1) * H_GAP_ACCT
  const orgX       = totalAcctW / 2 - ORG_W / 2

  // Org
  nodes.push({
    id: `org-${org.id}`, type: 'org',
    position: { x: orgX, y: 0 },
    data: { nome: org.name, razaoSocial: org.razaoSocial, qtdContas: accounts.length, qtdUsuarios: org.qtdUsuarios ?? '…' },
    selectable: false,
  })

  const acctY = ORG_H + ROW_GAP

  accounts.forEach((acct, i) => {
    const acctId  = `account-${acct.id}`
    const acctX   = i * (ACCT_W + H_GAP_ACCT)
    const isExp   = expandedId === acct.id
    const isLoad  = loadingId  === acct.id
    const acctData = accountDataCache[acct.id]

    nodes.push({
      id: acctId, type: 'account',
      position: { x: acctX, y: acctY },
      data: { nome: acct.name, subdomain: acct.subdomain, qtdMembros: acct.qtdMembros ?? 0, expanded: isExp, loading: isLoad },
      selected: selectedNodeId === acctId,
    })

    edges.push({
      id: `e-org-acct-${acct.id}`, source: `org-${org.id}`, target: acctId,
      type: 'smoothstep', style: { stroke: theme.edgeConta, strokeWidth: 1.5 },
    })

    if (!isExp || !acctData) return

    // Sub-layout abaixo da conta expandida
    const groups    = acctData.groups
    const members   = acctData.accountMembros
    const instances = acctData.instances

    const subW = Math.max(
      groups.length  * (GW + H_GAP_SUB) - H_GAP_SUB,
      members.length * (UW + H_GAP_SUB) - H_GAP_SUB,
      ACCT_W
    )
    // Centraliza o sub-layout na conta
    const subStartX = acctX + ACCT_W / 2 - subW / 2

    const groupY  = acctY + ACCT_H + ROW_GAP
    const userY   = groupY + GH + ROW_GAP
    const instX   = subStartX + subW + 60
    const instTopY = acctY + ACCT_H + ROW_GAP / 2

    // Grupos
    groups.forEach((g, gi) => {
      const id = `grupo-${g.id}`
      nodes.push({
        id, type: 'grupo',
        position: { x: subStartX + gi * (GW + H_GAP_SUB), y: groupY },
        data: { nome: g.nome, papel: g.papel ?? '', escopo: g.escopo, qtdMembros: (acctData.grupoMembros[g.id] ?? []).length },
        selected: selectedNodeId === id,
      })
      edges.push({ id: `e-acct-grp-${g.id}`, source: acctId, target: id, type: 'smoothstep', style: { stroke: theme.edgeConta, strokeWidth: 1.5 } })
    })

    // Usuários
    members.forEach((m, mi) => {
      const userId = m.userId ?? m.id
      const id = `usuario-${userId}`
      nodes.push({
        id, type: 'usuario',
        position: { x: subStartX + mi * (UW + H_GAP_SUB), y: userY },
        data: { nomeCompleto: m.nomeCompleto ?? userId, email: m.email ?? '', papelConta: m.papel },
        selected: selectedNodeId === id,
      })
      // Arestas usuário → grupo (se membro)
      groups.forEach(g => {
        const inGroup = (acctData.grupoMembros[g.id] ?? []).some((mb: any) => (mb.id ?? mb.userId) === userId)
        if (!inGroup) return
        edges.push({
          id: `e-usr-grp-${userId}-${g.id}`, source: id, target: `grupo-${g.id}`,
          type: 'smoothstep', animated: true,
          style: { stroke: theme.edgeGroup, strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed' as any, color: theme.edgeGroup },
        })
      })
    })

    // Instâncias
    instances.forEach((inst, ii) => {
      const id  = `instancia-${inst.id}`
      const mbs = acctData.instMembros[inst.id] ?? []
      const compNome = acctData.components.find(c => c.id === inst.componenteId)?.nome ?? inst.componenteId
      nodes.push({
        id, type: 'instancia',
        position: { x: instX, y: instTopY + ii * (IH + INST_GAP) },
        data: { nome: inst.nome, componenteNome: compNome, componenteId: inst.componenteId, qtdMembros: mbs.length },
        selected: selectedNodeId === id,
      })
      mbs.forEach((mb: any) => {
        const srcId = mb.entidadeTipo === 'user' ? `usuario-${mb.entidadeId}` : `grupo-${mb.entidadeId}`
        if (!nodes.some(n => n.id === srcId)) return
        edges.push({
          id: `e-inst-${inst.id}-${mb.entidadeId}`, source: srcId, target: id,
          type: 'smoothstep',
          style: { stroke: mb.entidadeTipo === 'user' ? theme.edgeInstUser : theme.edgeInstGroup, strokeWidth: 1.5, strokeDasharray: '5 3' },
          label: mb.papel,
          labelStyle: { fontSize: 9, fill: theme.cardMuted },
          labelBgStyle: { fill: theme.canvasBg, fillOpacity: 0.8 },
        })
      })
    })
  })

  return { nodes, edges }
}

// ── AutoFit (precisa estar dentro do ReactFlow) ───────────────

function AutoFit({ trigger }: { trigger: any }) {
  const { fitView } = useReactFlow()
  const prev = useRef<any>(null)
  useEffect(() => {
    if (trigger === prev.current) return
    prev.current = trigger
    const t = setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 60)
    return () => clearTimeout(t)
  }, [trigger, fitView])
  return null
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
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function GrupoPanel({ grupoId, accountId, accountData, theme, onClose, onRefresh, onOpenPermissoes }: {
  grupoId: string; accountId: string; accountData: AccountData; theme: VisualizerTheme
  onClose: () => void; onRefresh: () => void; onOpenPermissoes: (opts: any) => void
}) {
  const grupo   = accountData.groups.find(g => g.id === grupoId)
  const membros = accountData.grupoMembros[grupoId] ?? []
  const [search, setSearch]  = useState('')
  const [adding, setAdding]  = useState(false)
  const [removingId, setRem] = useState<string | null>(null)

  const jaIds    = useMemo(() => new Set(membros.map((m: any) => m.id ?? m.userId)), [membros])
  const sugestoes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return accountData.allUsers.filter(u => !jaIds.has(u.id) && (
      (u.nomeCompleto ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
    )).slice(0, 5)
  }, [search, accountData.allUsers, jaIds])

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
        title={grupo.nome} subtitle={`${grupo.escopo}${grupo.papel ? ' · ' + grupo.papel : ''}`}
        onClose={onClose} theme={theme}
      />
      <div className="px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${theme.panelBorder}` }}>
        <button onClick={() => onOpenPermissoes({ entityType: 'grupo', entityId: grupoId, entityNome: grupo.nome, accountId, papel: grupo.papel })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ background: theme.btnPermBg, border: `1px solid ${theme.btnPermBorder}`, color: theme.btnPermText }}>
          <Lock className="w-3.5 h-3.5" /> Atribuir permissões ao grupo
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: theme.sectionLabel }}>
          Membros ({membros.length})
        </p>
        <div className="relative mb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}>
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: theme.panelMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Adicionar membro..."
              className="flex-1 bg-transparent text-xs outline-none" style={{ color: theme.inputText }} />
            {search && <button onClick={() => setSearch('')} className="text-sm leading-none" style={{ color: theme.panelMuted }}>×</button>}
          </div>
          {sugestoes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-10 overflow-hidden"
              style={{ background: theme.dropBg, border: `1px solid ${theme.dropBorder}` }}>
              {sugestoes.map((u: any) => (
                <button key={u.id} onClick={() => handleAdd(u.id)} disabled={adding}
                  className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left"
                  onMouseEnter={e => (e.currentTarget.style.background = theme.dropHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <AvatarCircle nome={u.nomeCompleto} size={22} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: theme.dropText }}>{u.nomeCompleto}</p>
                    <p className="text-[10px] truncate" style={{ color: theme.dropSub }}>{u.email}</p>
                  </div>
                  {adding && <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: theme.panelMuted }} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-0.5">
          {membros.length === 0
            ? <p className="text-xs text-center py-6" style={{ color: theme.panelMuted }}>Nenhum membro ainda.</p>
            : membros.map((m: any) => {
                const uid = m.id ?? m.userId; const nome = m.nomeCompleto ?? uid
                return (
                  <div key={uid} className="group flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = theme.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <AvatarCircle nome={nome} size={24} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: theme.panelText }}>{nome}</p>
                      {m.email && <p className="text-[10px] truncate" style={{ color: theme.panelMuted }}>{m.email}</p>}
                    </div>
                    <button onClick={() => handleRemove(uid)} disabled={!!removingId}
                      className="invisible group-hover:visible p-1 rounded text-red-500 hover:bg-red-100/50 shrink-0">
                      {removingId === uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )
              })
          }
        </div>
      </div>
    </>
  )
}

function UsuarioPanel({ userId, accountId, accountData, theme, onClose, onOpenPermissoes }: {
  userId: string; accountId: string; accountData: AccountData; theme: VisualizerTheme
  onClose: () => void; onOpenPermissoes: (opts: any) => void
}) {
  const membro = accountData.accountMembros.find(m => (m.userId ?? m.id) === userId)
  const nome   = membro?.nomeCompleto ?? userId
  const userGrupos = accountData.groups.filter(g => (accountData.grupoMembros[g.id] ?? []).some((m: any) => (m.id ?? m.userId) === userId))
  if (!membro) return null
  return (
    <>
      <PainelHeader icon={<AvatarCircle nome={nome} size={36} />} title={nome} subtitle={membro.email} onClose={onClose} theme={theme} />
      <div className="px-5 py-3 shrink-0 space-y-2" style={{ borderBottom: `1px solid ${theme.panelBorder}` }}>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: theme.panelSub }}>Papel:</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={membro.papel === 'account_admin' ? papelBadgeStyle('Admin', theme) : papelBadgeStyle('Viewer', theme)}>
            {membro.papel === 'account_admin' ? '★ Account Admin' : 'Membro'}
          </span>
        </div>
        <button onClick={() => onOpenPermissoes({ entityType: 'usuario', entityId: userId, entityNome: nome, accountId })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ background: theme.btnPermBg, border: `1px solid ${theme.btnPermBorder}`, color: theme.btnPermText }}>
          <Lock className="w-3.5 h-3.5" /> Ações diretas
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.sectionLabel }}>
          Grupos ({userGrupos.length})
        </p>
        {userGrupos.length === 0
          ? <p className="text-xs" style={{ color: theme.panelMuted }}>Sem grupos nesta conta.</p>
          : <div className="space-y-1">
              {userGrupos.map(g => (
                <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: theme.rowBg, border: `1px solid ${theme.panelBorder}` }}>
                  <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: theme.btnPermText }} />
                  <span className="text-xs flex-1 truncate" style={{ color: theme.panelText }}>{g.nome}</span>
                  {g.papel && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={papelBadgeStyle(g.papel, theme)}>{g.papel}</span>}
                </div>
              ))}
            </div>
        }
      </div>
    </>
  )
}

function InstanciaPanel({ instanciaId, accountId: _accountId, accountData, theme, onClose, onOpenInstancia }: {
  instanciaId: string; accountId: string; accountData: AccountData; theme: VisualizerTheme
  onClose: () => void; onOpenInstancia: (inst: any) => void
}) {
  const inst    = accountData.instances.find(i => i.id === instanciaId)
  const membros = accountData.instMembros[instanciaId] ?? []
  const comp    = accountData.components.find(c => c.id === inst?.componenteId)
  const tipo    = inferTipo(comp?.nome)
  if (!inst) return null
  return (
    <>
      <PainelHeader
        icon={<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: theme.instBg, border: `1px solid ${theme.instBorder}` }}>
          <CompIcon tipo={tipo} size={16} color={compIconColor(tipo, theme.mode)} />
        </div>}
        title={inst.nome} subtitle={comp?.nome} onClose={onClose} theme={theme}
      />
      <div className="px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${theme.panelBorder}` }}>
        <button onClick={() => onOpenInstancia(inst)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
          <Users className="w-3.5 h-3.5" /> Gerenciar membros e permissões <ChevronRight className="w-3.5 h-3.5" />
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
                const isGroup = mb.entidadeTipo === 'group'
                const nome    = mb.displayName ?? mb.entidadeId
                return (
                  <div key={mb.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
                    style={{ background: theme.rowBg, border: `1px solid ${theme.panelBorder}` }}>
                    {isGroup
                      ? <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: theme.btnPermBg }}><Shield className="w-3.5 h-3.5" style={{ color: theme.btnPermText }} /></div>
                      : <AvatarCircle nome={nome} size={22} />}
                    <span className="text-xs flex-1 truncate" style={{ color: theme.panelText }}>{nome}</span>
                    {isGroup && <span className="text-[9px] px-1 py-0.5 rounded font-medium" style={{ background: theme.btnPermBg, color: theme.btnPermText, border: `1px solid ${theme.btnPermBorder}` }}>grupo</span>}
                    <span className="text-[9px] font-medium" style={{ color: theme.panelMuted }}>{mb.papel}</span>
                  </div>
                )
              })}
            </div>
        }
      </div>
    </>
  )
}

function DetailPanel({ selected, accountDataCache, theme, onClose, onRefresh, onOpenInstancia, onOpenPermissoes }: {
  selected: SelectedEntity; accountDataCache: Record<string, AccountData>; theme: VisualizerTheme
  onClose: () => void; onRefresh: (accountId: string) => void
  onOpenInstancia: (inst: any, accountId: string) => void
  onOpenPermissoes: (opts: any) => void
}) {
  const acctData = accountDataCache[selected.accountId]
  if (!acctData) return null
  return (
    <div className="w-[360px] shrink-0 flex flex-col overflow-hidden"
      style={{ background: theme.panelBg, borderLeft: `1px solid ${theme.panelBorder}` }}>
      {selected.type === 'grupo' && (
        <GrupoPanel grupoId={selected.id} accountId={selected.accountId} accountData={acctData} theme={theme}
          onClose={onClose} onRefresh={() => onRefresh(selected.accountId)} onOpenPermissoes={onOpenPermissoes} />
      )}
      {selected.type === 'usuario' && (
        <UsuarioPanel userId={selected.id} accountId={selected.accountId} accountData={acctData} theme={theme}
          onClose={onClose} onOpenPermissoes={onOpenPermissoes} />
      )}
      {selected.type === 'instancia' && (
        <InstanciaPanel instanciaId={selected.id} accountId={selected.accountId} accountData={acctData} theme={theme}
          onClose={onClose} onOpenInstancia={inst => onOpenInstancia(inst, selected.accountId)} />
      )}
    </div>
  )
}

// ── Canvas interno (precisa estar dentro do ReactFlowProvider) ─

function OrgCanvas({
  org, accounts, expandedId, loadingId, accountDataCache, theme, selected,
  onNodeClick, onPaneClick,
}: {
  org: any; accounts: any[]; expandedId: string | null; loadingId: string | null
  accountDataCache: Record<string, AccountData>; theme: VisualizerTheme
  selected: SelectedEntity | null; onNodeClick: (e: React.MouseEvent, n: Node) => void; onPaneClick: () => void
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const selectedNodeId = selected ? `${selected.type}-${selected.id}` : null

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph({ org, accounts, expandedId, loadingId, accountDataCache, theme, selectedNodeId })
    setNodes(n)
    setEdges(e)
  }, [org, accounts, expandedId, loadingId, accountDataCache, theme, selectedNodeId])

  const fitTrigger = `${expandedId}-${Object.keys(accountDataCache).length}`

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick} onPaneClick={onPaneClick}
      colorMode={theme.rfColorMode}
      fitView fitViewOptions={{ padding: 0.15 }}
      minZoom={0.15} maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <AutoFit trigger={fitTrigger} />
      <Background color={theme.dotColor} variant={BackgroundVariant.Dots} gap={22} size={1.5}
        style={{ background: theme.canvasBg }} />
      <Controls />
      <MiniMap
        nodeColor={n => n.type === 'org' ? '#f59e0b' : n.type === 'account' ? '#3b82f6' : n.type === 'grupo' ? '#6366f1' : n.type === 'usuario' ? '#10b981' : '#8b5cf6'}
        maskColor={theme.minimapMask}
        style={{ background: theme.minimapBg, border: `1px solid ${theme.minimapBorder}`, borderRadius: 12 }}
      />
      <Panel position="bottom-left">
        <div className="rounded-xl px-4 py-3 backdrop-blur-sm"
          style={{ background: theme.legendBg, border: `1px solid ${theme.legendBorder}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.sectionLabel }}>Legenda</p>

          {/* Nós */}
          <div className="space-y-1.5 mb-3">
            {[
              { c: '#f59e0b', l: 'Organização' },
              { c: '#3b82f6', l: 'Conta (clique p/ expandir)' },
              { c: '#6366f1', l: 'Grupo' },
              { c: '#10b981', l: 'Usuário' },
              { c: '#8b5cf6', l: 'Objeto' },
            ].map(({ c, l }) => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} />
                <span className="text-[11px]" style={{ color: theme.legendText }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Separador */}
          <div className="mb-2.5" style={{ borderTop: `1px solid ${theme.legendBorder}` }} />

          {/* Arestas */}
          <div className="space-y-1.5">
            {/* Hierarquia: sólida, sem seta */}
            <div className="flex items-center gap-2">
              <svg width="28" height="10" className="shrink-0">
                <line x1="0" y1="5" x2="28" y2="5"
                  stroke={theme.edgeConta} strokeWidth="1.5" />
              </svg>
              <span className="text-[11px]" style={{ color: theme.legendText }}>Hierarquia (org / conta)</span>
            </div>
            {/* Membro de grupo: animada, com seta */}
            <div className="flex items-center gap-2">
              <svg width="28" height="10" className="shrink-0">
                <defs>
                  <marker id="leg-arrow" markerWidth="6" markerHeight="6"
                    refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill={theme.edgeGroup} />
                  </marker>
                </defs>
                <line x1="0" y1="5" x2="22" y2="5"
                  stroke={theme.edgeGroup} strokeWidth="1.5"
                  markerEnd="url(#leg-arrow)" />
              </svg>
              <span className="text-[11px]" style={{ color: theme.legendText }}>Membro de grupo</span>
            </div>
            {/* Acesso à instância: tracejada */}
            <div className="flex items-center gap-2">
              <svg width="28" height="10" className="shrink-0">
                <line x1="0" y1="5" x2="28" y2="5"
                  stroke={theme.edgeInstUser} strokeWidth="1.5"
                  strokeDasharray="5 3" />
              </svg>
              <span className="text-[11px]" style={{ color: theme.legendText }}>Acesso ao objeto</span>
            </div>
          </div>
        </div>
      </Panel>
    </ReactFlow>
  )
}

// ── Página principal ──────────────────────────────────────────

function CanvasOrgInner() {
  useIsPlatformAdmin()
  useIsOrgAdmin()
  const { theme, mode, toggle } = useVisualizerTheme()

  // orgId e expandedId persistem no sessionStorage para sobreviver à navegação entre abas
  const [orgId,      setOrgIdRaw]      = useSessionState<string | null>('canvas-org-orgId', null)
  const [expandedId, setExpandedId]    = useSessionState<string | null>('canvas-org-expandedId', null)

  const setOrgId = useCallback((id: string) => {
    setOrgIdRaw(id)
    setExpandedId(null)
  }, [setOrgIdRaw, setExpandedId])

  const [allOrgs,    setAllOrgs]   = useState<any[]>([])
  const [accounts,   setAccounts]  = useState<any[]>([])
  const [loadingOrg, setLoadingOrg]= useState(true)
  const [loadingId,        setLoadingId]         = useState<string | null>(null)
  const [accountDataCache, setAccountDataCache]  = useState<Record<string, AccountData>>({})

  const [selected,       setSelected]   = useState<SelectedEntity | null>(null)
  const [instanciaSheet, setInstSheet]  = useState<{ inst: any; accountId: string } | null>(null)
  const [permissoesSheet,setPermSheet]  = useState<any>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Carrega orgs (roda uma vez; preserva orgId da URL se já existir)
  useEffect(() => {
    api.getOrganizations()
      .then((orgs: any[]) => {
        const ativas = orgs.filter((o: any) => o.status !== 'Inativo')
        setAllOrgs(ativas)
        // Só define orgId se ainda não houver um salvo (preserva navegação anterior)
        if (ativas.length > 0 && !orgId) {
          setOrgId(ativas[0].id)
        } else if (ativas.length === 0) {
          setLoadingOrg(false)
        }
      })
      .catch(() => {
        api.getAccounts()
          .then((accs: any[]) => {
            const ativos = accs.filter((a: any) => !a.deletedAt)
            const virtualOrg = { id: 'all', name: 'Plataforma', razaoSocial: '' }
            setAllOrgs([virtualOrg])
            if (!orgId) setOrgIdRaw('all')
            setAccounts(ativos)
          })
          .catch(() => {})
          .finally(() => setLoadingOrg(false))
      })
  }, [])

  // Carrega contas ao mudar de org
  useEffect(() => {
    if (!orgId) return
    setLoadingOrg(true)
    setAccountDataCache({})
    setSelected(null)
    // 'all' é o org virtual quando não há orgs reais
    const req = orgId === 'all'
      ? api.getAccounts()
      : api.getAccounts(orgId)
    req
      .then((accs: any[]) => {
        setAccounts(accs.filter((a: any) => !a.deletedAt))
      })
      .catch(() => {})
      .finally(() => setLoadingOrg(false))
  }, [orgId])

  // Carrega dados de uma conta (compartilhado entre toggleAccount e restauração via URL)
  async function loadAccountData(accountId: string) {
    if (accountDataCache[accountId]) return // já em cache
    setLoadingId(accountId)
    try {
      const [membros, grupos, instances, components] = await Promise.all([
        api.getAccountMembros(accountId),
        api.getGrupos({ accountId }),
        api.getInstancias({ accountId }),
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
      const allUsers = await api.getUsers().catch(() => [])
      setAccountDataCache(prev => ({
        ...prev,
        [accountId]: {
          accountMembros: membros as any[],
          groups:    grupos    as any[],
          instances: instances as any[],
          components: (components as any[]).filter((c: any) => c.status !== 'Inativo'),
          grupoMembros: Object.fromEntries(gmEntries),
          instMembros:  Object.fromEntries(imEntries),
          allUsers: allUsers as any[],
        },
      }))
    } catch (e) { console.error(e) }
    finally     { setLoadingId(null) }
  }

  // Restaura conta expandida da URL ao retornar para a página
  useEffect(() => {
    if (!expandedId || accountDataCache[expandedId] || loadingId) return
    if (!accounts.some(a => a.id === expandedId)) return
    loadAccountData(expandedId)
  }, [accounts, expandedId])

  // Expande/recolhe conta
  async function toggleAccount(accountId: string) {
    if (expandedId === accountId) {
      setExpandedId(null)
      setSelected(null)
      return
    }
    setExpandedId(accountId)
    setSelected(null)
    loadAccountData(accountId)
  }

  // Recarrega dados de uma conta (após add/remove membro)
  async function refreshAccount(accountId: string) {
    setAccountDataCache(prev => { const next = { ...prev }; delete next[accountId]; return next })
    setLoadingId(accountId)
    try {
      const [membros, grupos, instances, components] = await Promise.all([
        api.getAccountMembros(accountId),
        api.getGrupos({ accountId }),
        api.getInstancias({ accountId }),
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
      const allUsers = await api.getUsers().catch(() => [])
      setAccountDataCache(prev => ({
        ...prev,
        [accountId]: {
          accountMembros: membros as any[],
          groups:    grupos    as any[],
          instances: instances as any[],
          components: (components as any[]).filter((c: any) => c.status !== 'Inativo'),
          grupoMembros: Object.fromEntries(gmEntries),
          instMembros:  Object.fromEntries(imEntries),
          allUsers: allUsers as any[],
        },
      }))
    } catch (e) { console.error(e) }
    finally     { setLoadingId(null) }
  }

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'org') return
    if (node.type === 'account') {
      const accountId = node.id.replace('account-', '')
      toggleAccount(accountId)
      return
    }
    // Sub-nós (grupo / usuario / instancia)
    if (!expandedId) return
    const parts = node.id.split('-')
    const type  = parts[0] as EntityType
    const id    = parts.slice(1).join('-')
    setSelected({ type, id, accountId: expandedId })
  }, [expandedId, accountDataCache])

  const onPaneClick = useCallback(() => setSelected(null), [])

  const currentOrg = allOrgs.find(o => o.id === orgId) ?? null

  return (
    <VisualizerThemeContext.Provider value={theme}>
      <div className="flex flex-col flex-1 min-h-0" style={{ background: theme.canvasBg }}>

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-3 shrink-0"
          style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.headerBorder}` }}>
          <div>
            <h1 className="text-base font-semibold" style={{ color: theme.headerText }}>Canvas Org</h1>
            <p className="text-xs" style={{ color: theme.headerSub }}>
              Visão da organização — clique em uma conta para expandir
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Seletor de org */}
            {allOrgs.length > 1 && (
              <select value={orgId ?? ''} onChange={e => setOrgId(e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5 outline-none min-w-[200px] transition-colors"
                style={{ background: theme.selectBg, border: `1px solid ${theme.selectBorder}`, color: theme.selectText }}>
                {allOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
            {/* Toggle light/dark */}
            <button onClick={toggle} title={mode === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ background: theme.toggleBg, border: `1px solid ${theme.toggleBorder}`, color: theme.toggleText }}>
              {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="text-xs font-medium">{mode === 'dark' ? 'Claro' : 'Escuro'}</span>
            </button>
            {/* Sobre */}
            <button
              onClick={() => setShowOnboarding(true)}
              title="Sobre o Canvas Org"
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
            {loadingOrg || !currentOrg ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: theme.panelMuted }} />
                  <p className="text-sm" style={{ color: theme.panelMuted }}>Carregando organização…</p>
                </div>
              </div>
            ) : (
              <OrgCanvas
                org={{ ...currentOrg, qtdUsuarios: accounts.reduce((s: number, a: any) => s + (a.qtdMembros ?? 0), 0) }}
                accounts={accounts}
                expandedId={expandedId}
                loadingId={loadingId}
                accountDataCache={accountDataCache}
                theme={theme}
                selected={selected}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
              />
            )}
          </div>

          {/* Painel lateral */}
          {selected && accountDataCache[selected.accountId] && (
            <DetailPanel
              selected={selected}
              accountDataCache={accountDataCache}
              theme={theme}
              onClose={() => setSelected(null)}
              onRefresh={refreshAccount}
              onOpenInstancia={(inst, accountId) => setInstSheet({ inst, accountId })}
              onOpenPermissoes={opts => setPermSheet(opts)}
            />
          )}
        </div>

        {/* Sheets */}
        {instanciaSheet && (
          <InstanciaDetailSheet
            open={!!instanciaSheet}
            onClose={() => setInstSheet(null)}
            instancia={instanciaSheet.inst}
            componenteNome={accountDataCache[instanciaSheet.accountId]?.components.find(c => c.id === instanciaSheet.inst?.componenteId)?.nome}
            accountNome={accounts.find(a => a.id === instanciaSheet.accountId)?.name}
            accountId={instanciaSheet.accountId}
          />
        )}
        {permissoesSheet && (
          <AtribuirPermissoesSheet
            open={!!permissoesSheet}
            onClose={() => { setPermSheet(null) }}
            {...permissoesSheet}
          />
        )}

        {/* Modal — Sobre o Canvas Org */}
        <Modal
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          title="Sobre o Canvas Org"
          footer={
            <button
              onClick={() => setShowOnboarding(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-[#030712] rounded-lg hover:bg-[#1f2937] transition-colors"
            >
              Entendi
            </button>
          }
        >
          <div className="space-y-5">
            <p className="text-sm text-[#374151] leading-relaxed">
              Visão <strong className="font-semibold">estrutural</strong> da organização — explore a hierarquia de contas e veja grupos, usuários e objetos vinculados a cada uma.
            </p>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Canvas Org vs Canvas</p>
              <div className="rounded-xl overflow-hidden border border-[#e5e7eb]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#f3f4f6]">
                      <th className="text-left px-3 py-2.5 font-semibold text-[#6b7280] w-[90px]"> </th>
                      <th className="text-left px-3 py-2.5 font-semibold text-[#030712]">Canvas Org <span className="font-normal text-[#6b7280]">(esta tela)</span></th>
                      <th className="text-left px-3 py-2.5 font-semibold text-[#6b7280]">Canvas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f4f6]">
                    {([
                      ['Seletor', 'Organização', 'Conta'],
                      ['Foco', 'Hierarquia Org → Contas', 'Permissões dentro de uma conta'],
                      ['Uso', 'Entender a estrutura organizacional', 'Gerenciar e editar acessos'],
                    ] as const).map(([label, current, other]) => (
                      <tr key={label} className="hover:bg-[#fafafa]">
                        <td className="px-3 py-2.5 font-semibold text-[#374151]">{label}</td>
                        <td className="px-3 py-2.5 text-[#030712] font-medium">{current}</td>
                        <td className="px-3 py-2.5 text-[#6b7280]">{other}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Como usar</p>
              <div className="space-y-2">
                {([
                  { step: '1', text: 'Selecione uma organização no seletor do topo.' },
                  { step: '2', text: <span>Clique em uma <strong className="font-semibold text-[#030712]">Conta</strong> para expandir grupos, usuários e objetos.</span> },
                  { step: '3', text: 'Clique em qualquer nó expandido para ver detalhes no painel lateral.' },
                ] as { step: string; text: React.ReactNode }[]).map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3 p-3 rounded-xl bg-[#f9fafb] border border-[#f3f4f6]">
                    <span className="w-5 h-5 rounded-full bg-[#e5e7eb] flex items-center justify-center text-[10px] font-bold text-[#374151] shrink-0 mt-0.5">{step}</span>
                    <p className="text-sm text-[#374151] leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Para gerenciar permissões granulares dentro de uma conta, use o <strong className="font-semibold">Canvas</strong>.
              </p>
            </div>
          </div>
        </Modal>
      </div>
    </VisualizerThemeContext.Provider>
  )
}

export default function CanvasOrgPage() {
  return (
    <ReactFlowProvider>
      <CanvasOrgInner />
    </ReactFlowProvider>
  )
}
