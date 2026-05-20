/**
 * SchemaVisualizerPage
 *
 * Visualizador interativo com duas abas:
 *  - "Schema DB"    : tabelas, colunas, tipos e FK do banco (Drizzle schema)
 *  - "Modelo FGA"   : entidades e relações do modelo de autorização (ReBAC)
 *
 * Construído com @xyflow/react (ReactFlow v12).
 */

import { useState, useCallback } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '@/lib/utils'

// ── Tipos internos ────────────────────────────────────────────

type ColType = 'pk' | 'fk' | 'text' | 'int' | 'bool' | 'json' | 'ts'

interface ColDef {
  name:     string
  type:     ColType
  nullable?: boolean
  note?:    string
}

interface TableNodeData {
  label:    string
  category: 'core' | 'access' | 'permission' | 'meta'
  cols:     ColDef[]
}

interface FGANodeData {
  label:    string
  category: 'entity' | 'relation'
  items:    string[]
  color:    string
}

// ── Ícones por tipo de coluna ─────────────────────────────────

function ColIcon({ type }: { type: ColType }) {
  const base = 'w-3 h-3 rounded-sm shrink-0 flex items-center justify-center text-[8px] font-bold leading-none'
  switch (type) {
    case 'pk':   return <span className={cn(base, 'bg-amber-400 text-amber-900')}>PK</span>
    case 'fk':   return <span className={cn(base, 'bg-blue-400 text-blue-900')}>FK</span>
    case 'int':  return <span className={cn(base, 'bg-slate-300 text-slate-700')}>#</span>
    case 'bool': return <span className={cn(base, 'bg-purple-300 text-purple-800')}>B</span>
    case 'json': return <span className={cn(base, 'bg-green-300 text-green-800')}>J</span>
    case 'ts':   return <span className={cn(base, 'bg-rose-300 text-rose-800')}>T</span>
    default:     return <span className={cn(base, 'bg-gray-200 text-gray-600')}>A</span>
  }
}

// ── Paleta de categorias ──────────────────────────────────────

const CATEGORY_COLORS: Record<string, { header: string; border: string }> = {
  core:       { header: 'bg-emerald-500',  border: 'border-emerald-400' },
  access:     { header: 'bg-blue-500',     border: 'border-blue-400' },
  permission: { header: 'bg-violet-500',   border: 'border-violet-400' },
  meta:       { header: 'bg-slate-500',    border: 'border-slate-400' },
}

// ── Nó de tabela (Schema DB) ──────────────────────────────────

function TableNode({ data }: { data: TableNodeData }) {
  const d = data
  const { header, border } = CATEGORY_COLORS[d.category] ?? CATEGORY_COLORS.meta

  return (
    <div className={cn(
      'rounded-lg overflow-hidden border shadow-lg min-w-[220px] bg-[#1c1c1e] text-white',
      border,
    )}>
      <Handle type="target" position={Position.Left}  className="!bg-gray-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-2 !h-2" />

      {/* Header */}
      <div className={cn('px-3 py-2 text-xs font-semibold tracking-wide', header)}>
        {d.label}
      </div>

      {/* Columns */}
      <div className="divide-y divide-white/5">
        {(d.cols as ColDef[]).map(col => (
          <div key={col.name} className="flex items-center gap-2 px-3 py-1.5">
            <ColIcon type={col.type} />
            <span className="text-[11px] text-gray-200 font-mono flex-1">{col.name}</span>
            {col.note && (
              <span className="text-[9px] text-gray-500 font-mono">{col.note}</span>
            )}
            {col.nullable && (
              <span className="text-[9px] text-gray-600">?</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Nó de entidade FGA ────────────────────────────────────────

function FGANode({ data }: { data: FGANodeData }) {
  const d = data
  const isRelation = d.category === 'relation'

  return (
    <div className={cn(
      'rounded-xl overflow-hidden border-2 shadow-xl min-w-[200px]',
      isRelation
        ? 'border-dashed border-gray-500 bg-[#1c1c1e]'
        : 'border-solid bg-[#1c1c1e]',
    )}
    style={{ borderColor: d.color }}>
      <Handle type="target" position={Position.Left}  className="!w-2.5 !h-2.5" style={{ background: d.color }} />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5" style={{ background: d.color }} />

      {/* Header */}
      <div
        className="px-4 py-2.5 text-sm font-bold text-white tracking-wide"
        style={{ background: d.color }}
      >
        {isRelation ? '⇌ ' : ''}{d.label}
      </div>

      {/* Items */}
      <div className="px-4 py-2 space-y-1">
        {(d.items as string[]).map((item, i) => (
          <div key={i} className="text-[11px] text-gray-300 font-mono flex items-center gap-2">
            <span className="text-gray-600">›</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

const nodeTypes = { table: TableNode, fga: FGANode }

// ────────────────────────────────────────────────────────────────
// Dados: Schema DB
// ────────────────────────────────────────────────────────────────

const DB_NODES: Node[] = [
  // ── Core ──────────────────────────────
  {
    id: 'organizations', type: 'table', position: { x: 0, y: 0 },
    data: {
      label: 'organizations', category: 'core',
      cols: [
        { name: 'id',            type: 'pk' },
        { name: 'name',          type: 'text' },
        { name: 'razaoSocial',   type: 'text' },
        { name: 'docType',       type: 'text' },
        { name: 'docNumber',     type: 'text' },
        { name: 'domain',        type: 'text' },
        { name: 'status',        type: 'text',  note: 'Ativo|Inativo' },
        { name: 'arquitetoPAS',  type: 'text' },
        { name: 'contacts',      type: 'json' },
        { name: 'createdAt',     type: 'ts' },
      ],
    },
  },
  {
    id: 'accounts', type: 'table', position: { x: 340, y: 0 },
    data: {
      label: 'accounts', category: 'core',
      cols: [
        { name: 'id',               type: 'pk' },
        { name: 'orgId',            type: 'fk',   note: '→ organizations' },
        { name: 'name',             type: 'text' },
        { name: 'subdomain',        type: 'text' },
        { name: 'provisioningStatus', type: 'text' },
        { name: 'arquitetoPAS',     type: 'text' },
        { name: 'isDefault',        type: 'bool' },
        { name: 'admins',           type: 'json' },
        { name: 'status',           type: 'text',  note: 'Criado|Ativo' },
        { name: 'deletedAt',        type: 'ts',    nullable: true },
        { name: 'createdAt',        type: 'ts' },
      ],
    },
  },
  {
    id: 'solutions', type: 'table', position: { x: 0, y: 420 },
    data: {
      label: 'solutions', category: 'core',
      cols: [
        { name: 'id',           type: 'pk' },
        { name: 'orgId',        type: 'fk',  note: '→ organizations' },
        { name: 'name',         type: 'text' },
        { name: 'type',         type: 'text' },
        { name: 'plans',        type: 'json' },
        { name: 'componenteIds', type: 'json' },
        { name: 'status',       type: 'text' },
        { name: 'arquitetoPAS', type: 'text' },
      ],
    },
  },
  {
    id: 'contracts', type: 'table', position: { x: 0, y: 700 },
    data: {
      label: 'contracts', category: 'core',
      cols: [
        { name: 'id',          type: 'pk' },
        { name: 'orgId',       type: 'fk',  note: '→ organizations' },
        { name: 'contratante', type: 'text' },
        { name: 'objetos',     type: 'json' },
        { name: 'historico',   type: 'json' },
        { name: 'dataInicio',  type: 'ts' },
        { name: 'dataTermino', type: 'ts' },
        { name: 'status',      type: 'text' },
      ],
    },
  },

  // ── Access ────────────────────────────
  {
    id: 'users', type: 'table', position: { x: 720, y: 0 },
    data: {
      label: 'users', category: 'access',
      cols: [
        { name: 'id',           type: 'pk' },
        { name: 'nomeCompleto', type: 'text' },
        { name: 'usuario',      type: 'text',  note: 'unique' },
        { name: 'email',        type: 'text',  note: 'unique' },
        { name: 'papel',        type: 'text' },
        { name: 'status',       type: 'text',  note: 'Ativo|Inativo' },
        { name: 'ultimoAcesso', type: 'ts' },
        { name: 'createdAt',    type: 'ts' },
      ],
    },
  },
  {
    id: 'grupos', type: 'table', position: { x: 720, y: 360 },
    data: {
      label: 'grupos', category: 'access',
      cols: [
        { name: 'id',        type: 'pk' },
        { name: 'nome',      type: 'text' },
        { name: 'escopo',    type: 'text',  note: 'org|conta' },
        { name: 'orgId',     type: 'fk',    note: '→ organizations', nullable: true },
        { name: 'accountId', type: 'fk',    note: '→ accounts',      nullable: true },
        { name: 'papel',     type: 'text',  note: 'Viewer|User|Admin' },
        { name: 'status',    type: 'text' },
        { name: 'createdAt', type: 'ts' },
      ],
    },
  },
  {
    id: 'usuario_grupos', type: 'table', position: { x: 1080, y: 0 },
    data: {
      label: 'usuario_grupos', category: 'access',
      cols: [
        { name: 'id',         type: 'pk' },
        { name: 'userId',     type: 'fk', note: '→ users' },
        { name: 'grupoId',    type: 'fk', note: '→ grupos' },
        { name: 'assignedAt', type: 'ts' },
      ],
    },
  },
  {
    id: 'user_account_memberships', type: 'table', position: { x: 1080, y: 260 },
    data: {
      label: 'user_account_memberships', category: 'access',
      cols: [
        { name: 'id',         type: 'pk' },
        { name: 'userId',     type: 'fk', note: '→ users' },
        { name: 'accountId',  type: 'fk', note: '→ accounts' },
        { name: 'papel',      type: 'text', note: 'member|account_admin' },
        { name: 'assignedAt', type: 'ts' },
      ],
    },
  },

  // ── Componentes / Instâncias ──────────
  {
    id: 'componentes', type: 'table', position: { x: 1440, y: 0 },
    data: {
      label: 'componentes', category: 'meta',
      cols: [
        { name: 'id',          type: 'pk' },
        { name: 'nome',        type: 'text' },
        { name: 'descricao',   type: 'text', nullable: true },
        { name: 'metadataUrl', type: 'text', nullable: true },
        { name: 'tiposLicenca', type: 'json' },
        { name: 'status',      type: 'text', note: 'Ativo|Inativo' },
        { name: 'createdAt',   type: 'ts' },
      ],
    },
  },
  {
    id: 'tipos_licenca', type: 'table', position: { x: 1440, y: 320 },
    data: {
      label: 'tipos_licenca', category: 'meta',
      cols: [
        { name: 'id',       type: 'pk' },
        { name: 'nome',     type: 'text' },
        { name: 'descricao', type: 'text', nullable: true },
        { name: 'unidade',  type: 'text', note: 'usuários|GB|tokens' },
        { name: 'createdAt', type: 'ts' },
      ],
    },
  },
  {
    id: 'instancias', type: 'table', position: { x: 1440, y: 560 },
    data: {
      label: 'instancias', category: 'meta',
      cols: [
        { name: 'id',           type: 'pk' },
        { name: 'componenteId', type: 'fk',  note: '→ componentes' },
        { name: 'accountId',    type: 'fk',  note: '→ accounts' },
        { name: 'nome',         type: 'text' },
        { name: 'descricao',    type: 'text', nullable: true },
        { name: 'status',       type: 'text', note: 'Ativo|Inativo' },
        { name: 'createdAt',    type: 'ts' },
      ],
    },
  },

  // ── Permissões ────────────────────────
  {
    id: 'instancia_membros', type: 'table', position: { x: 1800, y: 560 },
    data: {
      label: 'instancia_membros', category: 'permission',
      cols: [
        { name: 'id',           type: 'pk' },
        { name: 'instanciaId',  type: 'fk',  note: '→ instancias' },
        { name: 'entidadeTipo', type: 'text', note: 'user|group' },
        { name: 'entidadeId',   type: 'text', note: '→ users|grupos' },
        { name: 'papel',        type: 'text', note: 'viewer|member|admin' },
        { name: 'assignedAt',   type: 'ts' },
      ],
    },
  },
  {
    id: 'component_permissions', type: 'table', position: { x: 1800, y: 0 },
    data: {
      label: 'component_permissions', category: 'permission',
      cols: [
        { name: 'id',           type: 'pk' },
        { name: 'entidadeTipo', type: 'text', note: 'user|group' },
        { name: 'entidadeId',   type: 'text', note: '→ users|grupos' },
        { name: 'componenteId', type: 'fk',   note: '→ componentes' },
        { name: 'acao',         type: 'text',  note: 'can_use_assistant…' },
        { name: 'instanciaId',  type: 'fk',   note: '→ instancias', nullable: true },
        { name: 'createdAt',    type: 'ts' },
      ],
    },
  },
  {
    id: 'account_entitlements', type: 'table', position: { x: 1800, y: 300 },
    data: {
      label: 'account_entitlements', category: 'permission',
      cols: [
        { name: 'id',         type: 'pk' },
        { name: 'accountId',  type: 'fk',  note: '→ accounts' },
        { name: 'capability', type: 'text', note: 'assistant.use…' },
        { name: 'enabledAt',  type: 'ts' },
      ],
    },
  },
]

const DB_EDGES: Edge[] = [
  // accounts
  { id: 'e-acc-org',  source: 'accounts',  target: 'organizations', label: 'orgId', animated: false, style: { stroke: '#10b981' } },
  // solutions & contracts
  { id: 'e-sol-org',  source: 'solutions',  target: 'organizations', label: 'orgId', style: { stroke: '#10b981', strokeDasharray: '4 2' } },
  { id: 'e-con-org',  source: 'contracts',  target: 'organizations', label: 'orgId', style: { stroke: '#10b981', strokeDasharray: '4 2' } },
  // grupos
  { id: 'e-grp-org',  source: 'grupos', target: 'organizations', label: 'orgId?',  style: { stroke: '#3b82f6', strokeDasharray: '4 2' } },
  { id: 'e-grp-acc',  source: 'grupos', target: 'accounts',      label: 'accountId?', style: { stroke: '#3b82f6', strokeDasharray: '4 2' } },
  // usuario_grupos
  { id: 'e-ug-usr',   source: 'usuario_grupos', target: 'users',  label: 'userId',  style: { stroke: '#3b82f6' } },
  { id: 'e-ug-grp',   source: 'usuario_grupos', target: 'grupos', label: 'grupoId', style: { stroke: '#3b82f6' } },
  // memberships
  { id: 'e-uam-usr',  source: 'user_account_memberships', target: 'users',    label: 'userId',    style: { stroke: '#3b82f6' } },
  { id: 'e-uam-acc',  source: 'user_account_memberships', target: 'accounts', label: 'accountId', style: { stroke: '#3b82f6' } },
  // instancias
  { id: 'e-inst-comp', source: 'instancias', target: 'componentes', label: 'componenteId', style: { stroke: '#64748b' } },
  { id: 'e-inst-acc',  source: 'instancias', target: 'accounts',    label: 'accountId',    style: { stroke: '#64748b' } },
  // instancia_membros
  { id: 'e-im-inst',   source: 'instancia_membros', target: 'instancias', label: 'instanciaId', style: { stroke: '#8b5cf6' } },
  // component_permissions
  { id: 'e-cp-comp',   source: 'component_permissions', target: 'componentes', label: 'componenteId', style: { stroke: '#8b5cf6' } },
  { id: 'e-cp-inst',   source: 'component_permissions', target: 'instancias',  label: 'instanciaId?', style: { stroke: '#8b5cf6', strokeDasharray: '4 2' } },
  // account_entitlements
  { id: 'e-ae-acc',    source: 'account_entitlements', target: 'accounts', label: 'accountId', style: { stroke: '#8b5cf6' } },
]

// ────────────────────────────────────────────────────────────────
// Dados: Modelo FGA
// ────────────────────────────────────────────────────────────────

const FGA_NODES: Node[] = [
  {
    id: 'fga-org', type: 'fga', position: { x: 0, y: 200 },
    data: {
      label: 'Organization', category: 'entity', color: '#10b981',
      items: ['id: string', 'name: string', 'escopo: global'],
    },
  },
  {
    id: 'fga-account', type: 'fga', position: { x: 360, y: 200 },
    data: {
      label: 'Account', category: 'entity', color: '#3b82f6',
      items: ['id: string', 'orgId: FK', 'subdomain: string', 'capabilities: string[]'],
    },
  },
  {
    id: 'fga-user', type: 'fga', position: { x: 720, y: 0 },
    data: {
      label: 'User', category: 'entity', color: '#f59e0b',
      items: ['id: string', 'email: string', 'papel: string'],
    },
  },
  {
    id: 'fga-group', type: 'fga', position: { x: 720, y: 380 },
    data: {
      label: 'Group', category: 'entity', color: '#8b5cf6',
      items: ['id: string', 'escopo: org|conta', 'papel: Viewer|User|Admin', 'members: User[]'],
    },
  },
  {
    id: 'fga-component', type: 'fga', position: { x: 1140, y: 0 },
    data: {
      label: 'Component', category: 'entity', color: '#64748b',
      items: ['id: string', 'nome: string', 'metadataUrl?: string'],
    },
  },
  {
    id: 'fga-instance', type: 'fga', position: { x: 1140, y: 300 },
    data: {
      label: 'Instance', category: 'entity', color: '#06b6d4',
      items: ['id: string', 'componenteId: FK', 'accountId: FK', 'nome: string'],
    },
  },
  {
    id: 'fga-permission', type: 'fga', position: { x: 1500, y: 140 },
    data: {
      label: 'Permission', category: 'entity', color: '#ef4444',
      items: [
        'can_use_assistant',
        'can_view_consulted_sources',
        'can_upload_rag_sources',
        'can_configure_agents',
        'can_manage_users',
        'pode_ler / pode_editar / …',
      ],
    },
  },
]

const FGA_EDGES: Edge[] = [
  {
    id: 'fe-org-acc', source: 'fga-org', target: 'fga-account',
    label: 'has_account', animated: true,
    style: { stroke: '#10b981' },
    labelStyle: { fill: '#10b981', fontWeight: 600, fontSize: 11 },
  },
  {
    id: 'fe-acc-user', source: 'fga-account', target: 'fga-user',
    label: 'member / account_admin', animated: true,
    style: { stroke: '#3b82f6' },
    labelStyle: { fill: '#3b82f6', fontWeight: 600, fontSize: 11 },
  },
  {
    id: 'fe-acc-group', source: 'fga-account', target: 'fga-group',
    label: 'has_group (conta)', animated: true,
    style: { stroke: '#8b5cf6' },
    labelStyle: { fill: '#8b5cf6', fontWeight: 600, fontSize: 11 },
  },
  {
    id: 'fe-org-group', source: 'fga-org', target: 'fga-group',
    label: 'has_group (org)', animated: true,
    style: { stroke: '#8b5cf6', strokeDasharray: '5 3' },
    labelStyle: { fill: '#8b5cf6', fontWeight: 600, fontSize: 11 },
  },
  {
    id: 'fe-group-user', source: 'fga-group', target: 'fga-user',
    label: 'member', animated: true,
    style: { stroke: '#f59e0b' },
    labelStyle: { fill: '#f59e0b', fontWeight: 600, fontSize: 11 },
  },
  {
    id: 'fe-acc-comp', source: 'fga-account', target: 'fga-component',
    label: 'entitlement', animated: false,
    style: { stroke: '#64748b', strokeDasharray: '5 3' },
    labelStyle: { fill: '#94a3b8', fontWeight: 600, fontSize: 11 },
  },
  {
    id: 'fe-comp-inst', source: 'fga-component', target: 'fga-instance',
    label: 'has_instance', animated: true,
    style: { stroke: '#06b6d4' },
    labelStyle: { fill: '#06b6d4', fontWeight: 600, fontSize: 11 },
  },
  {
    id: 'fe-inst-user', source: 'fga-instance', target: 'fga-user',
    label: 'viewer / member / admin', animated: true,
    style: { stroke: '#06b6d4', strokeDasharray: '5 3' },
    labelStyle: { fill: '#06b6d4', fontWeight: 600, fontSize: 11 },
  },
  {
    id: 'fe-inst-perm', source: 'fga-instance', target: 'fga-permission',
    label: 'scoped_permission', animated: true,
    style: { stroke: '#ef4444' },
    labelStyle: { fill: '#ef4444', fontWeight: 600, fontSize: 11 },
  },
  {
    id: 'fe-comp-perm', source: 'fga-component', target: 'fga-permission',
    label: 'global_permission', animated: true,
    style: { stroke: '#ef4444', strokeDasharray: '5 3' },
    labelStyle: { fill: '#ef4444', fontWeight: 600, fontSize: 11 },
  },
]

// ────────────────────────────────────────────────────────────────
// Legenda
// ────────────────────────────────────────────────────────────────

function LegendaDB() {
  const items = [
    { color: 'bg-emerald-500', label: 'Core (orgs, contas, soluções)' },
    { color: 'bg-blue-500',    label: 'Access (usuários, grupos, memberships)' },
    { color: 'bg-slate-500',   label: 'Componentes & Instâncias' },
    { color: 'bg-violet-500',  label: 'Permissões & Entitlements' },
  ]
  const col = [
    { cls: 'bg-amber-400', label: 'PK — Primary Key' },
    { cls: 'bg-blue-400',  label: 'FK — Foreign Key' },
    { cls: 'bg-gray-300',  label: 'A — text / varchar' },
    { cls: 'bg-slate-300', label: '# — integer' },
    { cls: 'bg-purple-300',label: 'B — boolean' },
    { cls: 'bg-green-300', label: 'J — jsonb' },
    { cls: 'bg-rose-300',  label: 'T — timestamp' },
  ]
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-[#1c1c1e]/90 border border-white/10 rounded-xl p-4 text-white space-y-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Legenda</p>
      <div className="space-y-1.5">
        {items.map(i => (
          <div key={i.label} className="flex items-center gap-2">
            <span className={cn('w-3 h-3 rounded-sm shrink-0', i.color)} />
            <span className="text-[11px] text-gray-300">{i.label}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 pt-2 space-y-1">
        {col.map(c => (
          <div key={c.label} className="flex items-center gap-2">
            <span className={cn('w-3 h-3 rounded-sm shrink-0 flex items-center justify-center text-[7px] font-bold', c.cls)} />
            <span className="text-[11px] text-gray-400">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LegendaFGA() {
  const items = [
    { color: '#10b981', label: 'Organization' },
    { color: '#3b82f6', label: 'Account' },
    { color: '#f59e0b', label: 'User' },
    { color: '#8b5cf6', label: 'Group' },
    { color: '#64748b', label: 'Component' },
    { color: '#06b6d4', label: 'Instance' },
    { color: '#ef4444', label: 'Permission' },
  ]
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-[#1c1c1e]/90 border border-white/10 rounded-xl p-4 text-white space-y-2 backdrop-blur-sm">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Entidades FGA</p>
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: i.color }} />
          <span className="text-[11px] text-gray-300">{i.label}</span>
        </div>
      ))}
      <div className="border-t border-white/10 pt-2 space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-6 border-t-2 border-white/60" />
          <span className="text-[11px] text-gray-400">Relação direta</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 border-t-2 border-dashed border-white/40" />
          <span className="text-[11px] text-gray-400">Relação opcional/herdada</span>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Página principal
// ────────────────────────────────────────────────────────────────

type Aba = 'db' | 'fga'

export default function SchemaVisualizerPage() {
  const [aba, setAba] = useState<Aba>('db')

  const [dbNodes, , onDbNodesChange] = useNodesState(DB_NODES)
  const [dbEdges, , onDbEdgesChange] = useEdgesState(DB_EDGES)
  const [fgaNodes, , onFgaNodesChange] = useNodesState(FGA_NODES)
  const [fgaEdges, , onFgaEdgesChange] = useEdgesState(FGA_EDGES)

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#111113]">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white">Schema Visualizer</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Diagrama interativo do banco de dados e do modelo de autorização (FGA)
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setAba('db')}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              aba === 'db'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-gray-200',
            )}
          >
            🗄️ Schema DB
          </button>
          <button
            onClick={() => setAba('fga')}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              aba === 'fga'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-gray-200',
            )}
          >
            🔐 Modelo FGA
          </button>
        </div>
      </div>

      {/* Canvas — ReactFlow precisa de height explícita no container */}
      <div className="flex-1 min-h-0 relative">
        {aba === 'db' ? (
          <ReactFlow
            nodes={dbNodes}
            edges={dbEdges}
            onNodesChange={onDbNodesChange}
            onEdgesChange={onDbEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#333" variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls className="!bg-[#1c1c1e] !border-white/10 !text-white [&_button]:!bg-[#1c1c1e] [&_button]:!border-white/10 [&_button]:!text-white [&_button:hover]:!bg-white/10" />
            <MiniMap
              nodeColor={n => {
                const cat = (n.data as TableNodeData).category
                if (cat === 'core')       return '#10b981'
                if (cat === 'access')     return '#3b82f6'
                if (cat === 'permission') return '#8b5cf6'
                return '#64748b'
              }}
              maskColor="rgba(0,0,0,0.6)"
              className="!bg-[#1c1c1e] !border-white/10"
            />
            <LegendaDB />
          </ReactFlow>
        ) : (
          <ReactFlow
            nodes={fgaNodes}
            edges={fgaEdges}
            onNodesChange={onFgaNodesChange}
            onEdgesChange={onFgaEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#333" variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls className="!bg-[#1c1c1e] !border-white/10 !text-white [&_button]:!bg-[#1c1c1e] [&_button]:!border-white/10 [&_button]:!text-white [&_button:hover]:!bg-white/10" />
            <MiniMap
              nodeColor={n => (n.data as FGANodeData).color as string}
              maskColor="rgba(0,0,0,0.6)"
              className="!bg-[#1c1c1e] !border-white/10"
            />
            <LegendaFGA />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
