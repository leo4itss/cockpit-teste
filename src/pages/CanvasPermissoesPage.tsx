/**
 * CanvasPermissoesPage — Canvas interativo de gestão por conta.
 * Tema: dark
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
} from 'lucide-react'
import { api } from '@/api/client'
import { useIsPlatformAdmin, useIsOrgAdmin } from '@/authz'
import { useAdminAccountId } from '@/authz/hooks'
import { InstanciaDetailSheet } from '@/components/instancias/InstanciaDetailSheet'
import { AtribuirPermissoesSheet } from '@/components/permissoes/AtribuirPermissoesSheet'
import { cn } from '@/lib/utils'

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
const H_GAP    = 36
const ROW_GAP  = 70
const INST_GAP = 32

// ── Cores dark ────────────────────────────────────────────────

// card base
const CARD = '#1e293b'       // bg dos nós
const CARD_BORDER = '#334155' // borda padrão
const SEL_RING = '#3b82f6'   // anel de seleção

// ── Helpers visuais ───────────────────────────────────────────

type CompTipo = 'assistente-ia' | 'base-conhecimento' | 'analytics' | 'default'

function inferTipo(nome?: string): CompTipo {
  const n = (nome ?? '').toLowerCase()
  if (n.includes('assistente') || n.includes('pas core')) return 'assistente-ia'
  if (n.includes('base') || n.includes('knowledge'))      return 'base-conhecimento'
  if (n.includes('analytics') || n.includes('dashboard')) return 'analytics'
  return 'default'
}

function CompIcon({ tipo, size = 16 }: { tipo: CompTipo; size?: number }) {
  const s = { width: size, height: size }
  if (tipo === 'assistente-ia')     return <Bot      style={s} className="shrink-0 text-violet-400" />
  if (tipo === 'base-conhecimento') return <Database style={s} className="shrink-0 text-blue-400" />
  if (tipo === 'analytics')         return <Layers   style={s} className="shrink-0 text-emerald-400" />
  return                                   <Layers   style={s} className="shrink-0 text-slate-400" />
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

// badges papel dark
const PAPEL_BADGE: Record<string, string> = {
  Viewer: 'bg-slate-700 text-slate-300 border-slate-600',
  User:   'bg-blue-900/60 text-blue-300 border-blue-700',
  Admin:  'bg-orange-900/50 text-orange-300 border-orange-700',
  '':     'bg-slate-800 text-slate-400 border-slate-700',
}

// ── Nós customizados ──────────────────────────────────────────

function ContaNode({ data }: { data: any }) {
  return (
    <div
      className="rounded-2xl shadow-lg"
      style={{
        width: AW, minHeight: AH,
        background: '#1a2236',
        border: '2px solid #f59e0b',
      }}
    >
      <Handle type="source" position={Position.Bottom}
        style={{ background: '#f59e0b', width: 8, height: 8 }} />
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245,158,11,0.15)' }}>
          <Building2 className="w-5 h-5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-tight truncate">{data.nome}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{data.subdomain}.itss.com.br</p>
          <p className="text-[10px] text-amber-400 font-medium mt-1">{data.qtdMembros} membros</p>
        </div>
      </div>
    </div>
  )
}

function GrupoNode({ data, selected }: { data: any; selected?: boolean }) {
  const barColor = {
    Viewer: '#6b7280',
    User:   '#3b82f6',
    Admin:  '#f97316',
    '':     '#374151',
  }[data.papel ?? ''] ?? '#374151'

  return (
    <div
      className="rounded-xl shadow-md overflow-hidden transition-shadow"
      style={{
        width: GW, minHeight: GH,
        background: CARD,
        border: `1.5px solid ${selected ? SEL_RING : CARD_BORDER}`,
        boxShadow: selected ? `0 0 0 2px ${SEL_RING}40, 0 4px 20px #0004` : '0 2px 8px #0003',
      }}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: CARD_BORDER, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ background: CARD_BORDER, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Right}
        style={{ background: CARD_BORDER, width: 7, height: 7 }} id="right" />

      <div style={{ height: 3, background: barColor }} />
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-100 truncate leading-tight">{data.nome}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {data.papel && (
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-semibold',
                  PAPEL_BADGE[data.papel] ?? PAPEL_BADGE[''])}>
                  {data.papel}
                </span>
              )}
              <span className="text-[9px] text-slate-500 capitalize">{data.escopo}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              <Users className="w-2.5 h-2.5 inline mr-0.5" />
              {data.qtdMembros} {data.qtdMembros === 1 ? 'membro' : 'membros'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsuarioNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-shadow"
      style={{
        width: UW, minHeight: UH,
        background: CARD,
        border: `1.5px solid ${selected ? SEL_RING : CARD_BORDER}`,
        boxShadow: selected ? `0 0 0 2px ${SEL_RING}40, 0 4px 16px #0004` : '0 1px 6px #0003',
      }}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: CARD_BORDER, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Right}
        style={{ background: CARD_BORDER, width: 7, height: 7 }} />

      <div className="px-3 py-2 flex items-center gap-2.5">
        <AvatarCircle nome={data.nomeCompleto} size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-100 truncate leading-tight">{data.nomeCompleto}</p>
          <p className="text-[10px] text-slate-400 truncate">{data.email}</p>
          {data.papelConta && (
            <p className="text-[9px] text-blue-400 font-medium mt-0.5">
              {data.papelConta === 'account_admin' ? '★ Admin' : 'membro'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function InstanciaNode({ data, selected }: { data: any; selected?: boolean }) {
  const tipo = inferTipo(data.componenteNome)
  return (
    <div
      className="rounded-xl overflow-hidden transition-shadow"
      style={{
        width: IW, minHeight: IH,
        background: '#1a1530',
        border: `1.5px solid ${selected ? '#8b5cf6' : '#4c3a7a'}`,
        boxShadow: selected ? '0 0 0 2px #8b5cf640, 0 4px 20px #0004' : '0 2px 10px #0003',
      }}
    >
      <Handle type="target" position={Position.Left}
        style={{ background: '#7c3aed', width: 7, height: 7 }} />

      <div style={{ height: 2, background: 'linear-gradient(90deg, #8b5cf6, #22d3ee)' }} />
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <CompIcon tipo={tipo} size={15} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-100 truncate leading-tight">{data.nome}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{data.componenteNome}</p>
            <p className="text-[10px] text-violet-400 mt-1">
              <Users className="w-2.5 h-2.5 inline mr-0.5" />
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

function buildGraph(data: GraphData, selectedNodeId: string | null): { nodes: Node[]; edges: Edge[] } {
  const { account, accountMembros, groups, instances, components, grupoMembros, instMembros } = data

  const nodes: Node[] = []
  const edges: Edge[] = []

  const groupsW = groups.length  * (GW + H_GAP)
  const usersW  = accountMembros.length * (UW + H_GAP)
  const leftW   = Math.max(groupsW, usersW, AW + 100)

  // ── Conta (âncora) ──
  nodes.push({
    id: `conta-${account.id}`,
    type: 'conta',
    position: { x: leftW / 2 - AW / 2, y: 0 },
    data: { nome: account.name, subdomain: account.subdomain, qtdMembros: accountMembros.length },
    selectable: false,
  })

  // ── Grupos ──
  const groupY = AH + ROW_GAP
  groups.forEach((g, i) => {
    const id = `grupo-${g.id}`
    nodes.push({
      id,
      type: 'grupo',
      position: { x: i * (GW + H_GAP), y: groupY },
      data: {
        nome: g.nome,
        papel: g.papel ?? '',
        escopo: g.escopo,
        qtdMembros: (grupoMembros[g.id] ?? []).length,
      },
      selected: selectedNodeId === id,
    })
    edges.push({
      id: `e-conta-grp-${g.id}`,
      source: `conta-${account.id}`,
      target: id,
      type: 'smoothstep',
      style: { stroke: '#334155', strokeWidth: 1.5 },
    })
  })

  // ── Usuários ──
  const userY = groupY + GH + ROW_GAP
  accountMembros.forEach((m, i) => {
    const userId = m.userId ?? m.id
    const id = `usuario-${userId}`
    nodes.push({
      id,
      type: 'usuario',
      position: { x: i * (UW + H_GAP), y: userY },
      data: {
        nomeCompleto: m.nomeCompleto ?? userId,
        email: m.email ?? '',
        papelConta: m.papel,
      },
      selected: selectedNodeId === id,
    })

    // Arestas usuário → grupo
    groups.forEach(g => {
      const mbs = grupoMembros[g.id] ?? []
      const inGroup = mbs.some((mb: any) => (mb.id ?? mb.userId) === userId)
      if (!inGroup) return
      edges.push({
        id: `e-usr-grp-${userId}-${g.id}`,
        source: id,
        target: `grupo-${g.id}`,
        type: 'smoothstep',
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        animated: true,
        markerEnd: { type: 'arrowclosed' as any, color: '#3b82f6' },
      })
    })
  })

  // ── Instâncias (coluna à direita) ──
  const instX = leftW + 80
  instances.forEach((inst, i) => {
    const id  = `instancia-${inst.id}`
    const mbs = instMembros[inst.id] ?? []
    const compNome = components.find(c => c.id === inst.componenteId)?.nome ?? inst.componenteId

    nodes.push({
      id,
      type: 'instancia',
      position: { x: instX, y: i * (IH + INST_GAP) },
      data: {
        nome: inst.nome,
        componenteNome: compNome,
        componenteId: inst.componenteId,
        qtdMembros: mbs.length,
        descricao: inst.descricao,
      },
      selected: selectedNodeId === id,
    })

    mbs.forEach((mb: any) => {
      const srcId = mb.entidadeTipo === 'user'
        ? `usuario-${mb.entidadeId}`
        : `grupo-${mb.entidadeId}`
      if (!nodes.some(n => n.id === srcId)) return
      edges.push({
        id: `e-inst-${inst.id}-${mb.entidadeId}`,
        source: srcId,
        target: id,
        type: 'smoothstep',
        style: {
          stroke: mb.entidadeTipo === 'user' ? '#22d3ee' : '#a78bfa',
          strokeWidth: 1.5,
          strokeDasharray: '6 3',
        },
        label: mb.papel,
        labelStyle: { fontSize: 9, fill: '#64748b' },
        labelBgStyle: { fill: 'rgba(15,23,42,0.8)' },
      })
    })
  })

  return { nodes, edges }
}

// ── Painéis laterais ──────────────────────────────────────────

const PANEL_BG   = 'bg-[#0f172a]'
const PANEL_BDR  = 'border-[#1e293b]'
const ROW_HOVER  = 'hover:bg-[#1e293b]'
const INPUT_CLS  = 'bg-[#1e293b] border-[#334155] text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40'
const SECTION_LBL = 'text-[10px] font-semibold text-slate-500 uppercase tracking-wider'

function PainelHeader({ icon, title, subtitle, onClose }: {
  icon: React.ReactNode; title: string; subtitle?: string; onClose: () => void
}) {
  return (
    <div className={cn('px-5 py-4 border-b flex items-start gap-3 shrink-0', PANEL_BDR)}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <button onClick={onClose}
        className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 shrink-0 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Painel de Grupo
function GrupoPanel({ grupoId, graphData, accountId, onClose, onRefresh, onOpenPermissoes }: {
  grupoId: string; graphData: GraphData; accountId: string
  onClose: () => void; onRefresh: () => void
  onOpenPermissoes: (opts: any) => void
}) {
  const grupo   = graphData.groups.find(g => g.id === grupoId)
  const membros = graphData.grupoMembros[grupoId] ?? []
  const [search, setSearch]  = useState('')
  const [adding, setAdding]  = useState(false)
  const [removingId, setRem] = useState<string | null>(null)

  const jaIds = useMemo(() => new Set(membros.map((m: any) => m.id ?? m.userId)), [membros])

  const sugestoes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return graphData.allUsers
      .filter(u => !jaIds.has(u.id) && (
        (u.nomeCompleto ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      ))
      .slice(0, 5)
  }, [search, graphData.allUsers, jaIds])

  async function handleAdd(userId: string) {
    setAdding(true)
    try { await api.addGrupoMembro(grupoId, userId); setSearch(''); onRefresh() }
    finally { setAdding(false) }
  }

  async function handleRemove(userId: string) {
    setRem(userId)
    try { await api.removeGrupoMembro(grupoId, userId); onRefresh() }
    finally { setRem(null) }
  }

  if (!grupo) return null

  return (
    <>
      <PainelHeader
        icon={
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
        }
        title={grupo.nome}
        subtitle={`${grupo.escopo}${grupo.papel ? ' · ' + grupo.papel : ''}`}
        onClose={onClose}
      />

      <div className={cn('px-5 py-3 border-b shrink-0', PANEL_BDR)}>
        <button
          onClick={() => onOpenPermissoes({ entityType: 'grupo', entityId: grupoId, entityNome: grupo.nome, accountId, papel: grupo.papel })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-violet-300 bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/20 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          Atribuir permissões ao grupo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className={cn(SECTION_LBL, 'mb-3')}>Membros ({membros.length})</p>

        {/* Busca de adição */}
        <div className="relative mb-3">
          <div className={cn('flex items-center gap-2 px-3 py-2 border rounded-lg transition-all', INPUT_CLS)}>
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Adicionar membro..."
              className="flex-1 bg-transparent text-xs outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400 text-sm leading-none">×</button>
            )}
          </div>
          {sugestoes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl z-10 overflow-hidden">
              {sugestoes.map((u: any) => (
                <button key={u.id} onClick={() => handleAdd(u.id)} disabled={adding}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#273549] transition-colors text-left">
                  <AvatarCircle nome={u.nomeCompleto} size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate">{u.nomeCompleto}</p>
                    <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                  </div>
                  {adding && <Loader2 className="w-3 h-3 animate-spin text-slate-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}
          {search.trim() && sugestoes.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e293b] border border-[#334155] rounded-lg shadow-lg px-3 py-2.5 z-10">
              <p className="text-xs text-slate-500">Nenhum usuário encontrado.</p>
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          {membros.length === 0
            ? <p className="text-xs text-slate-600 text-center py-6">Nenhum membro ainda.</p>
            : membros.map((m: any) => {
                const uid  = m.id ?? m.userId
                const nome = m.nomeCompleto ?? uid
                return (
                  <div key={uid}
                    className={cn('group flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors', ROW_HOVER)}>
                    <AvatarCircle nome={nome} size={26} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{nome}</p>
                      {m.email && <p className="text-[10px] text-slate-500 truncate">{m.email}</p>}
                    </div>
                    <button
                      onClick={() => handleRemove(uid)}
                      disabled={!!removingId}
                      className="invisible group-hover:visible p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                      title="Remover do grupo"
                    >
                      {removingId === uid
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <UserMinus className="w-3.5 h-3.5" />}
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

// Painel de Usuário
function UsuarioPanel({ userId, graphData, accountId, onClose, onRefresh, onOpenPermissoes }: {
  userId: string; graphData: GraphData; accountId: string
  onClose: () => void; onRefresh: () => void
  onOpenPermissoes: (opts: any) => void
}) {
  const membro = graphData.accountMembros.find(m => (m.userId ?? m.id) === userId)
  const nome   = membro?.nomeCompleto ?? userId

  const userGrupos = graphData.groups.filter(g => {
    const mbs = graphData.grupoMembros[g.id] ?? []
    return mbs.some((m: any) => (m.id ?? m.userId) === userId)
  })

  const userInstancias = graphData.instances.filter(inst => {
    const mbs = graphData.instMembros[inst.id] ?? []
    return mbs.some((m: any) => m.entidadeTipo === 'user' && m.entidadeId === userId)
  })

  if (!membro) return null

  return (
    <>
      <PainelHeader
        icon={<AvatarCircle nome={nome} size={36} />}
        title={nome}
        subtitle={membro.email}
        onClose={onClose}
      />

      <div className={cn('px-5 py-3 border-b shrink-0 space-y-2', PANEL_BDR)}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Papel na conta:</span>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold',
            membro.papel === 'account_admin'
              ? 'bg-orange-900/40 text-orange-300 border-orange-700'
              : 'bg-slate-700 text-slate-300 border-slate-600'
          )}>
            {membro.papel === 'account_admin' ? '★ Account Admin' : 'Membro'}
          </span>
        </div>
        <button
          onClick={() => onOpenPermissoes({ entityType: 'usuario', entityId: userId, entityNome: nome, accountId })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-violet-300 bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/20 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          Permissões diretas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Grupos */}
        <div>
          <p className={cn(SECTION_LBL, 'mb-2')}>Grupos ({userGrupos.length})</p>
          {userGrupos.length === 0
            ? <p className="text-xs text-slate-600">Não pertence a nenhum grupo desta conta.</p>
            : <div className="space-y-1">
                {userGrupos.map(g => (
                  <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e293b]">
                    <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-xs text-slate-300 flex-1 truncate">{g.nome}</span>
                    {g.papel && (
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-semibold',
                        PAPEL_BADGE[g.papel] ?? PAPEL_BADGE[''])}>
                        {g.papel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Instâncias com acesso direto */}
        <div>
          <p className={cn(SECTION_LBL, 'mb-2')}>Instâncias com acesso direto ({userInstancias.length})</p>
          {userInstancias.length === 0
            ? <p className="text-xs text-slate-600">Sem acesso direto a instâncias.</p>
            : <div className="space-y-1">
                {userInstancias.map(inst => {
                  const mb       = (graphData.instMembros[inst.id] ?? []).find((m: any) => m.entidadeId === userId)
                  const compNome = graphData.components.find(c => c.id === inst.componenteId)?.nome
                  return (
                    <div key={inst.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/20">
                      <CompIcon tipo={inferTipo(compNome)} size={13} />
                      <span className="text-xs text-slate-300 flex-1 truncate">{inst.nome}</span>
                      {mb?.papel && <span className="text-[9px] text-violet-400 font-semibold">{mb.papel}</span>}
                    </div>
                  )
                })}
              </div>
          }
        </div>
      </div>
    </>
  )
}

// Painel de Instância
function InstanciaPanel({ instanciaId, graphData, onClose, onOpenInstancia }: {
  instanciaId: string; graphData: GraphData; accountId: string
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
        icon={
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <CompIcon tipo={tipo} size={18} />
          </div>
        }
        title={inst.nome}
        subtitle={comp?.nome ?? inst.componenteId}
        onClose={onClose}
      />

      <div className={cn('px-5 py-3 border-b shrink-0', PANEL_BDR)}>
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
        <p className={cn(SECTION_LBL, 'mb-3')}>Membros ({membros.length})</p>
        {membros.length === 0
          ? <p className="text-xs text-slate-600 text-center py-6">Nenhum membro ainda.</p>
          : <div className="space-y-0.5">
              {membros.map((mb: any) => {
                const isGroup = mb.entidadeTipo === 'group'
                const nome    = mb.displayName ?? mb.entidadeId
                return (
                  <div key={mb.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-[#1e293b]">
                    {isGroup
                      ? <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                          <Shield className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                      : <AvatarCircle nome={nome} size={24} />}
                    <span className="text-xs text-slate-300 flex-1 truncate">{nome}</span>
                    {isGroup && (
                      <span className="text-[9px] bg-violet-500/10 text-violet-400 border border-violet-500/30 rounded px-1 py-0.5">grupo</span>
                    )}
                    <span className="text-[9px] text-slate-500 font-medium">{mb.papel}</span>
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

function DetailPanel({ selected, graphData, accountId, onClose, onRefresh, onOpenInstancia, onOpenPermissoes }: {
  selected: SelectedEntity; graphData: GraphData; accountId: string
  onClose: () => void; onRefresh: () => void
  onOpenInstancia: (inst: any) => void; onOpenPermissoes: (opts: any) => void
}) {
  return (
    <div className={cn('w-[360px] shrink-0 border-l flex flex-col overflow-hidden', PANEL_BG, PANEL_BDR)}>
      {selected.type === 'grupo' && (
        <GrupoPanel grupoId={selected.id} graphData={graphData} accountId={accountId}
          onClose={onClose} onRefresh={onRefresh} onOpenPermissoes={onOpenPermissoes} />
      )}
      {selected.type === 'usuario' && (
        <UsuarioPanel userId={selected.id} graphData={graphData} accountId={accountId}
          onClose={onClose} onRefresh={onRefresh} onOpenPermissoes={onOpenPermissoes} />
      )}
      {selected.type === 'instancia' && (
        <InstanciaPanel instanciaId={selected.id} graphData={graphData} accountId={accountId}
          onClose={onClose} onOpenInstancia={onOpenInstancia} />
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function CanvasPermissoesPage() {
  const isPlatformAdmin = useIsPlatformAdmin()
  const isOrgAdmin      = useIsOrgAdmin()
  const defaultAccId    = useAdminAccountId()

  const [allAccounts, setAllAccounts] = useState<any[]>([])
  const [accountId,   setAccountId]   = useState<string | null>(null)
  const [graphData,   setGraphData]   = useState<GraphData | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [refreshKey,  setRefreshKey]  = useState(0)

  const [selected,      setSelected]   = useState<SelectedEntity | null>(null)
  const [instanciaSheet, setInstSheet] = useState<any>(null)
  const [permissoesSheet, setPermSheet] = useState<any>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Carrega contas disponíveis
  useEffect(() => {
    api.getAccounts().then(acc => {
      const ativos = (acc as any[]).filter(a => !a.deletedAt)
      setAllAccounts(ativos)
      if (!accountId) {
        const def = defaultAccId ?? ativos[0]?.id ?? null
        setAccountId(def)
      }
    }).catch(() => {})
  }, [])

  // Carrega dados do grafo ao mudar de conta
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
          Promise.all(
            (grupos as any[]).map(g =>
              api.getGrupoMembros(g.id)
                .then(mbs => [g.id, mbs] as [string, any[]])
                .catch(() => [g.id, []] as [string, any[]])
            )
          ),
          Promise.all(
            (instances as any[]).map(inst =>
              api.getInstanciaMembros(inst.id)
                .then(mbs => [inst.id, mbs] as [string, any[]])
                .catch(() => [inst.id, []] as [string, any[]])
            )
          ),
        ])

        const allUsers = await api.getUsers().catch(() => [])

        setGraphData({
          account,
          accountMembros: membros as any[],
          groups:         grupos  as any[],
          instances:      instances as any[],
          components:     (components as any[]).filter(c => c.status !== 'Inativo'),
          grupoMembros:   Object.fromEntries(gmEntries),
          instMembros:    Object.fromEntries(imEntries),
          allUsers:       allUsers as any[],
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [accountId, refreshKey])

  // Reconstrói o grafo quando dados ou seleção mudam
  useEffect(() => {
    if (!graphData) return
    const selId = selected ? `${selected.type}-${selected.id}` : null
    const { nodes: n, edges: e } = buildGraph(graphData, selId)
    setNodes(n)
    setEdges(e)
  }, [graphData, selected?.id, selected?.type])

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
    <div className="flex flex-col flex-1 min-h-0 bg-[#0a0f1a]">
      {/* Header dark */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[#1e293b] bg-[#0f172a] shrink-0">
        <div>
          <h1 className="text-base font-semibold text-slate-100">Canvas de Permissões</h1>
          <p className="text-xs text-slate-500">Visualize e gerencie grupos, usuários e instâncias de uma conta</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <select
            value={accountId ?? ''}
            onChange={e => { setAccountId(e.target.value); setSelected(null) }}
            className="text-sm border border-[#334155] rounded-lg px-3 py-1.5 bg-[#1e293b] text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 min-w-[220px] transition-colors"
          >
            <option value="" disabled>Selecionar conta…</option>
            {allAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Canvas + Painel */}
      <div className="flex flex-1 min-h-0">
        {/* ReactFlow */}
        <div className="flex-1 min-w-0 min-h-0">
          {!accountId ? (
            <div className="flex items-center justify-center h-full bg-[#0a0f1a]">
              <div className="text-center">
                <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">Selecione uma conta para visualizar o canvas</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full bg-[#0a0f1a]">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-slate-500">Carregando canvas…</p>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              colorMode="dark"
              fitView
              fitViewOptions={{ padding: 0.18 }}
              minZoom={0.25}
              maxZoom={1.8}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                color="#1e293b"
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1.5}
                style={{ background: '#0a0f1a' }}
              />
              <Controls />
              <MiniMap
                nodeColor={n => {
                  if (n.type === 'conta')    return '#f59e0b'
                  if (n.type === 'grupo')    return '#3b82f6'
                  if (n.type === 'usuario')  return '#10b981'
                  return '#8b5cf6'
                }}
                maskColor="rgba(10,15,26,0.75)"
                style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}
              />

              {/* Legenda */}
              <Panel position="bottom-left">
                <div
                  className="rounded-xl px-4 py-3 backdrop-blur-sm"
                  style={{ background: 'rgba(15,23,42,0.92)', border: '1px solid #1e293b' }}
                >
                  <p className={cn(SECTION_LBL, 'mb-2')}>Legenda</p>
                  <div className="space-y-1.5">
                    {[
                      { c: 'bg-amber-400',   l: 'Conta (âncora)' },
                      { c: 'bg-blue-500',    l: 'Grupo' },
                      { c: 'bg-emerald-500', l: 'Usuário' },
                      { c: 'bg-violet-500',  l: 'Instância' },
                    ].map(({ c, l }) => (
                      <div key={l} className="flex items-center gap-2">
                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', c)} />
                        <span className="text-[11px] text-slate-400">{l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#1e293b] mt-2.5 pt-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 border-t-2 border-blue-500" />
                      <span className="text-[10px] text-slate-500">membro de grupo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 border-t-2 border-dashed border-violet-500" />
                      <span className="text-[10px] text-slate-500">acesso à instância</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </ReactFlow>
          )}
        </div>

        {/* Painel lateral dark */}
        {selected && graphData && (
          <DetailPanel
            selected={selected}
            graphData={graphData}
            accountId={accountId!}
            onClose={() => setSelected(null)}
            onRefresh={refresh}
            onOpenInstancia={inst => setInstSheet(inst)}
            onOpenPermissoes={opts => setPermSheet(opts)}
          />
        )}
      </div>

      {/* Sheets */}
      {instanciaSheet && (
        <InstanciaDetailSheet
          open={!!instanciaSheet}
          onClose={() => setInstSheet(null)}
          instancia={instanciaSheet}
          componenteNome={graphData?.components.find(c => c.id === instanciaSheet?.componenteId)?.nome}
          accountNome={selectedAccount?.name}
          accountId={accountId!}
        />
      )}
      {permissoesSheet && (
        <AtribuirPermissoesSheet
          open={!!permissoesSheet}
          onClose={() => { setPermSheet(null); refresh() }}
          {...permissoesSheet}
        />
      )}
    </div>
  )
}
