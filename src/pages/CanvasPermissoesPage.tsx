/**
 * CanvasPermissoesPage — Canvas interativo de gestão por conta.
 *
 * Visualiza e permite gerenciar em um único lugar:
 *   • Usuários membros da conta
 *   • Grupos e seus membros
 *   • Instâncias de componentes e seus membros
 *
 * Clicar em qualquer nó abre um painel lateral com ações
 * equivalentes às abas de Grupos, Acessos e Instâncias.
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
  const cls = `shrink-0`
  const s   = { width: size, height: size }
  if (tipo === 'assistente-ia')     return <Bot      style={s} className={cn(cls, 'text-violet-400')} />
  if (tipo === 'base-conhecimento') return <Database style={s} className={cn(cls, 'text-blue-400')} />
  if (tipo === 'analytics')         return <Layers   style={s} className={cn(cls, 'text-emerald-400')} />
  return                                   <Layers   style={s} className={cn(cls, 'text-gray-400')} />
}

function AvatarCircle({ nome, size = 28 }: { nome: string; size?: number }) {
  const ini = (nome ?? '?').split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
  return (
    <div
      className="rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-white font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {ini}
    </div>
  )
}

const PAPEL_BADGE: Record<string, string> = {
  Viewer: 'bg-gray-100 text-gray-600 border-gray-200',
  User:   'bg-blue-50 text-blue-700 border-blue-200',
  Admin:  'bg-orange-50 text-orange-700 border-orange-200',
  '':     'bg-gray-50 text-gray-500 border-gray-100',
}

// ── Nós customizados ──────────────────────────────────────────

function ContaNode({ data }: { data: any }) {
  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-white shadow-lg"
      style={{ width: AW, minHeight: AH }}>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-2 !h-2" />
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-amber-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight truncate">{data.nome}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{data.subdomain}.itss.com.br</p>
          <p className="text-[10px] text-amber-600 font-medium mt-1">{data.qtdMembros} membros</p>
        </div>
      </div>
    </div>
  )
}

function GrupoNode({ data, selected }: { data: any; selected?: boolean }) {
  const colors = {
    Viewer: { bar: 'bg-gray-400',    ring: 'border-gray-300'  },
    User:   { bar: 'bg-blue-500',    ring: 'border-blue-300'  },
    Admin:  { bar: 'bg-orange-500',  ring: 'border-orange-300'},
    '':     { bar: 'bg-gray-200',    ring: 'border-gray-200'  },
  }[data.papel ?? ''] ?? { bar: 'bg-gray-200', ring: 'border-gray-200' }

  return (
    <div className={cn(
      'rounded-xl border bg-white shadow-md overflow-hidden transition-shadow',
      selected ? 'border-blue-400 shadow-blue-100 shadow-lg ring-2 ring-blue-300 ring-offset-1' : 'border-gray-200',
    )} style={{ width: GW, minHeight: GH }}>
      <Handle type="target" position={Position.Top}    className="!bg-gray-300 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-2 !h-2" />
      <Handle type="source" position={Position.Right}  className="!bg-gray-300 !w-2 !h-2" id="right" />

      <div className={cn('h-1', colors.bar)} />
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">{data.nome}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {data.papel && (
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-semibold', PAPEL_BADGE[data.papel] ?? PAPEL_BADGE[''])}>
                  {data.papel}
                </span>
              )}
              <span className="text-[9px] text-gray-400 capitalize">{data.escopo}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
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
    <div className={cn(
      'rounded-xl border bg-white shadow-sm overflow-hidden transition-shadow',
      selected ? 'border-blue-400 shadow-md ring-2 ring-blue-300 ring-offset-1' : 'border-gray-200',
    )} style={{ width: UW, minHeight: UH }}>
      <Handle type="target" position={Position.Top}   className="!bg-gray-300 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-gray-300 !w-2 !h-2" />

      <div className="px-3 py-2 flex items-center gap-2.5">
        <AvatarCircle nome={data.nomeCompleto} size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">{data.nomeCompleto}</p>
          <p className="text-[10px] text-gray-400 truncate">{data.email}</p>
          {data.papelConta && (
            <p className="text-[9px] text-blue-600 font-medium mt-0.5">
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
    <div className={cn(
      'rounded-xl border-2 bg-white shadow-md overflow-hidden transition-shadow',
      selected ? 'border-violet-500 shadow-lg ring-2 ring-violet-300 ring-offset-1' : 'border-violet-200',
    )} style={{ width: IW, minHeight: IH }}>
      <Handle type="target" position={Position.Left}  className="!bg-violet-300 !w-2 !h-2" />

      <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 to-cyan-400" />
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <CompIcon tipo={tipo} size={15} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">{data.nome}</p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{data.componenteNome}</p>
            <p className="text-[10px] text-violet-500 mt-1">
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
      style: { stroke: '#d1d5db', strokeWidth: 1.5 },
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

    // Arestas usuário → grupo (se membro)
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

    // Arestas usuário/grupo → instância
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
          stroke: mb.entidadeTipo === 'user' ? '#06b6d4' : '#8b5cf6',
          strokeWidth: 1.5,
          strokeDasharray: '6 3',
        },
        label: mb.papel,
        labelStyle: { fontSize: 9, fill: '#9ca3af' },
        labelBgStyle: { fill: 'rgba(255,255,255,0.8)' },
      })
    })
  })

  return { nodes, edges }
}

// ── Painéis laterais ──────────────────────────────────────────

function PainelHeader({ icon, title, subtitle, onClose }: {
  icon: React.ReactNode; title: string; subtitle?: string; onClose: () => void
}) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3 shrink-0">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0">
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
  const grupo  = graphData.groups.find(g => g.id === grupoId)
  const membros = graphData.grupoMembros[grupoId] ?? []
  const [search, setSearch]   = useState('')
  const [adding, setAdding]   = useState(false)
  const [removingId, setRem]  = useState<string | null>(null)

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
        icon={<div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Shield className="w-5 h-5 text-blue-500" /></div>}
        title={grupo.nome}
        subtitle={`${grupo.escopo}${grupo.papel ? ' · ' + grupo.papel : ''}`}
        onClose={onClose}
      />

      {/* Ação permissões */}
      <div className="px-5 py-3 border-b border-gray-100 shrink-0">
        <button
          onClick={() => onOpenPermissoes({ entityType: 'grupo', entityId: grupoId, entityNome: grupo.nome, accountId, papel: grupo.papel })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          Atribuir permissões ao grupo
        </button>
      </div>

      {/* Membros */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Membros ({membros.length})
        </p>

        {/* Busca de adição */}
        <div className="relative mb-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-300 transition-all">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Adicionar membro..."
              className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder:text-gray-400"
            />
            {search && <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 text-sm leading-none">×</button>}
          </div>
          {sugestoes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
              {sugestoes.map((u: any) => (
                <button key={u.id} onClick={() => handleAdd(u.id)} disabled={adding}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                  <AvatarCircle nome={u.nomeCompleto} size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{u.nomeCompleto}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                  </div>
                  {adding && <Loader2 className="w-3 h-3 animate-spin text-gray-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
          {search.trim() && sugestoes.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2.5 z-10">
              <p className="text-xs text-gray-400">Nenhum usuário encontrado.</p>
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          {membros.length === 0
            ? <p className="text-xs text-gray-400 text-center py-6">Nenhum membro ainda.</p>
            : membros.map((m: any) => {
                const uid  = m.id ?? m.userId
                const nome = m.nomeCompleto ?? uid
                return (
                  <div key={uid} className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <AvatarCircle nome={nome} size={26} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{nome}</p>
                      {m.email && <p className="text-[10px] text-gray-400 truncate">{m.email}</p>}
                    </div>
                    <button
                      onClick={() => handleRemove(uid)}
                      disabled={!!removingId}
                      className="invisible group-hover:visible p-1 rounded text-red-400 hover:bg-red-50 transition-colors shrink-0"
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

      <div className="px-5 py-3 border-b border-gray-100 shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Papel na conta:</span>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold',
            membro.papel === 'account_admin' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-100 text-gray-600 border-gray-200'
          )}>
            {membro.papel === 'account_admin' ? '★ Account Admin' : 'Membro'}
          </span>
        </div>
        <button
          onClick={() => onOpenPermissoes({ entityType: 'usuario', entityId: userId, entityNome: nome, accountId })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          Permissões diretas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Grupos */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Grupos ({userGrupos.length})
          </p>
          {userGrupos.length === 0
            ? <p className="text-xs text-gray-400">Não pertence a nenhum grupo desta conta.</p>
            : <div className="space-y-1">
                {userGrupos.map(g => (
                  <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
                    <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-xs text-gray-700 flex-1 truncate">{g.nome}</span>
                    {g.papel && (
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-semibold', PAPEL_BADGE[g.papel] ?? PAPEL_BADGE[''])}>
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
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Instâncias com acesso direto ({userInstancias.length})
          </p>
          {userInstancias.length === 0
            ? <p className="text-xs text-gray-400">Sem acesso direto a instâncias.</p>
            : <div className="space-y-1">
                {userInstancias.map(inst => {
                  const mb      = (graphData.instMembros[inst.id] ?? []).find((m: any) => m.entidadeId === userId)
                  const compNome = graphData.components.find(c => c.id === inst.componenteId)?.nome
                  return (
                    <div key={inst.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50/60">
                      <CompIcon tipo={inferTipo(compNome)} size={13} />
                      <span className="text-xs text-gray-700 flex-1 truncate">{inst.nome}</span>
                      {mb?.papel && <span className="text-[9px] text-violet-600 font-semibold">{mb.papel}</span>}
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
function InstanciaPanel({ instanciaId, graphData, accountId, onClose, onOpenInstancia }: {
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
        icon={<div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0"><CompIcon tipo={tipo} size={18} /></div>}
        title={inst.nome}
        subtitle={comp?.nome ?? inst.componenteId}
        onClose={onClose}
      />

      <div className="px-5 py-3 border-b border-gray-100 shrink-0">
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
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Membros ({membros.length})
        </p>
        {membros.length === 0
          ? <p className="text-xs text-gray-400 text-center py-6">Nenhum membro ainda.</p>
          : <div className="space-y-0.5">
              {membros.map((mb: any) => {
                const isGroup = mb.entidadeTipo === 'group'
                const nome    = mb.displayName ?? mb.entidadeId
                return (
                  <div key={mb.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-50">
                    {isGroup
                      ? <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0"><Shield className="w-3.5 h-3.5 text-violet-500" /></div>
                      : <AvatarCircle nome={nome} size={24} />}
                    <span className="text-xs text-gray-700 flex-1 truncate">{nome}</span>
                    {isGroup && <span className="text-[9px] bg-violet-50 text-violet-600 border border-violet-200 rounded px-1 py-0.5">grupo</span>}
                    <span className="text-[9px] text-gray-500 font-medium">{mb.papel}</span>
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
    <div className="w-[360px] shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
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

  const [allAccounts, setAllAccounts]   = useState<any[]>([])
  const [accountId,   setAccountId]     = useState<string | null>(null)
  const [graphData,   setGraphData]     = useState<GraphData | null>(null)
  const [loading,     setLoading]       = useState(false)
  const [refreshKey,  setRefreshKey]    = useState(0)

  const [selected, setSelected]           = useState<SelectedEntity | null>(null)
  const [instanciaSheet, setInstSheet]    = useState<any>(null)
  const [permissoesSheet, setPermSheet]   = useState<any>(null)

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
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Canvas de Permissões</h1>
          <p className="text-xs text-gray-500">Visualize e gerencie grupos, usuários e instâncias de uma conta</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Seletor de conta */}
          <select
            value={accountId ?? ''}
            onChange={e => { setAccountId(e.target.value); setSelected(null) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-400 min-w-[220px] text-gray-700"
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
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-400">Selecione uma conta para visualizar o canvas</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-gray-400">Carregando canvas…</p>
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
              fitView
              fitViewOptions={{ padding: 0.18 }}
              minZoom={0.25}
              maxZoom={1.8}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#e5e7eb" variant={BackgroundVariant.Dots} gap={22} size={1} />
              <Controls />
              <MiniMap
                nodeColor={n => {
                  if (n.type === 'conta')    return '#f59e0b'
                  if (n.type === 'grupo')    return '#3b82f6'
                  if (n.type === 'usuario')  return '#10b981'
                  return '#8b5cf6'
                }}
                maskColor="rgba(255,255,255,0.7)"
                className="!bg-white !border-gray-200 !rounded-xl"
              />

              {/* Legenda */}
              <Panel position="bottom-left">
                <div className="bg-white/95 border border-gray-200 rounded-xl px-4 py-3 shadow-sm backdrop-blur-sm">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Legenda</p>
                  <div className="space-y-1.5">
                    {[
                      { c: 'bg-amber-400',   l: 'Conta (âncora)' },
                      { c: 'bg-blue-500',    l: 'Grupo' },
                      { c: 'bg-emerald-500', l: 'Usuário' },
                      { c: 'bg-violet-500',  l: 'Instância' },
                    ].map(({ c, l }) => (
                      <div key={l} className="flex items-center gap-2">
                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', c)} />
                        <span className="text-[11px] text-gray-600">{l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 mt-2.5 pt-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 border-t-2 border-blue-400" />
                      <span className="text-[10px] text-gray-400">membro de grupo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 border-t-2 border-dashed border-violet-400" />
                      <span className="text-[10px] text-gray-400">acesso à instância</span>
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
