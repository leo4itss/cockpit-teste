/**
 * SchemaVisualizerPage
 *
 * Visualizador interativo com duas abas:
 *  - "Schema DB"    : tabelas, colunas, tipos e FK do banco (Drizzle schema)
 *  - "Modelo FGA"   : entidades e relações do modelo de autorização (ReBAC)
 *
 * Suporta tema dark / light com switch persistido em localStorage.
 */

import { useState } from 'react'
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
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisualizerThemeContext, useNodeTheme } from '@/lib/visualizerTheme'
import { useVisualizerTheme } from '@/hooks/useVisualizerTheme'

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
// Cores próprias, funcionam bem em ambos os temas

function ColIcon({ type }: { type: ColType }) {
  const base = 'w-3 h-3 rounded-sm shrink-0 flex items-center justify-center text-[8px] font-bold leading-none'
  switch (type) {
    case 'pk':   return <span className={cn(base, 'bg-amber-400 text-amber-900')}>PK</span>
    case 'fk':   return <span className={cn(base, 'bg-blue-400 text-blue-900')}>FK</span>
    case 'int':  return <span className={cn(base, 'bg-slate-400 text-slate-900')}>#</span>
    case 'bool': return <span className={cn(base, 'bg-purple-400 text-purple-900')}>B</span>
    case 'json': return <span className={cn(base, 'bg-green-400 text-green-900')}>J</span>
    case 'ts':   return <span className={cn(base, 'bg-rose-400 text-rose-900')}>T</span>
    default:     return <span className={cn(base, 'bg-gray-400 text-gray-900')}>A</span>
  }
}

// ── Paleta de categorias (header dos nós) ─────────────────────

const CATEGORY_HEADER: Record<string, string> = {
  core:       'bg-emerald-600 text-white',
  access:     'bg-blue-600 text-white',
  permission: 'bg-violet-600 text-white',
  meta:       'bg-slate-600 text-white',
}

const CATEGORY_BORDER: Record<string, string> = {
  core:       '#059669',
  access:     '#2563eb',
  permission: '#7c3aed',
  meta:       '#475569',
}

// ── Nó de tabela (Schema DB) ──────────────────────────────────

function TableNode({ data }: { data: TableNodeData }) {
  const t = useNodeTheme()
  const borderColor = CATEGORY_BORDER[data.category] ?? CATEGORY_BORDER.meta
  const headerCls   = CATEGORY_HEADER[data.category]  ?? CATEGORY_HEADER.meta

  return (
    <div
      className="rounded-lg overflow-hidden shadow-lg min-w-[220px]"
      style={{ background: t.schNodeBg, border: `1.5px solid ${borderColor}` }}
    >
      <Handle type="target" position={Position.Left}
        style={{ background: borderColor, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right}
        style={{ background: borderColor, width: 8, height: 8 }} />

      {/* Header */}
      <div className={cn('px-3 py-2 text-xs font-semibold tracking-wide', headerCls)}>
        {data.label}
      </div>

      {/* Columns */}
      <div style={{ borderTop: `1px solid ${t.schNodeDivide}` }}>
        {data.cols.map((col, i) => (
          <div
            key={col.name}
            className="flex items-center gap-2 px-3 py-1.5"
            style={{
              borderTop: i === 0 ? 'none' : `1px solid ${t.schNodeDivide}`,
            }}
          >
            <ColIcon type={col.type} />
            <span className="text-[11px] font-mono flex-1" style={{ color: t.schNodeText }}>
              {col.name}
            </span>
            {col.note && (
              <span className="text-[9px] font-mono" style={{ color: t.schNodeNote }}>
                {col.note}
              </span>
            )}
            {col.nullable && (
              <span className="text-[9px]" style={{ color: t.schNodeNull }}>?</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Nó de entidade FGA ────────────────────────────────────────

function FGANode({ data }: { data: FGANodeData }) {
  const t = useNodeTheme()
  const isRelation = data.category === 'relation'

  return (
    <div
      className="rounded-xl overflow-hidden shadow-xl min-w-[200px]"
      style={{
        background: t.fgaNodeBg,
        border: `2px ${isRelation ? 'dashed' : 'solid'} ${data.color}`,
      }}
    >
      <Handle type="target" position={Position.Left}
        style={{ background: data.color, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right}
        style={{ background: data.color, width: 10, height: 10 }} />

      {/* Header colorido */}
      <div
        className="px-4 py-2.5 text-sm font-bold text-white tracking-wide"
        style={{ background: data.color }}
      >
        {isRelation ? '⇌ ' : ''}{data.label}
      </div>

      {/* Items */}
      <div className="px-4 py-2 space-y-1">
        {data.items.map((item, i) => (
          <div key={i} className="text-[11px] font-mono flex items-center gap-2"
            style={{ color: t.fgaNodeText }}>
            <span style={{ color: t.fgaNodeArrow }}>›</span>
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
  { id: 'e-acc-org',  source: 'accounts',  target: 'organizations', label: 'orgId',        style: { stroke: '#059669' } },
  { id: 'e-sol-org',  source: 'solutions',  target: 'organizations', label: 'orgId',        style: { stroke: '#059669', strokeDasharray: '4 2' } },
  { id: 'e-con-org',  source: 'contracts',  target: 'organizations', label: 'orgId',        style: { stroke: '#059669', strokeDasharray: '4 2' } },
  { id: 'e-grp-org',  source: 'grupos', target: 'organizations',    label: 'orgId?',        style: { stroke: '#2563eb', strokeDasharray: '4 2' } },
  { id: 'e-grp-acc',  source: 'grupos', target: 'accounts',         label: 'accountId?',    style: { stroke: '#2563eb', strokeDasharray: '4 2' } },
  { id: 'e-ug-usr',   source: 'usuario_grupos', target: 'users',    label: 'userId',        style: { stroke: '#2563eb' } },
  { id: 'e-ug-grp',   source: 'usuario_grupos', target: 'grupos',   label: 'grupoId',       style: { stroke: '#2563eb' } },
  { id: 'e-uam-usr',  source: 'user_account_memberships', target: 'users',    label: 'userId',    style: { stroke: '#2563eb' } },
  { id: 'e-uam-acc',  source: 'user_account_memberships', target: 'accounts', label: 'accountId', style: { stroke: '#2563eb' } },
  { id: 'e-inst-comp', source: 'instancias', target: 'componentes', label: 'componenteId', style: { stroke: '#475569' } },
  { id: 'e-inst-acc',  source: 'instancias', target: 'accounts',    label: 'accountId',    style: { stroke: '#475569' } },
  { id: 'e-im-inst',   source: 'instancia_membros', target: 'instancias', label: 'instanciaId', style: { stroke: '#7c3aed' } },
  { id: 'e-cp-comp',   source: 'component_permissions', target: 'componentes', label: 'componenteId', style: { stroke: '#7c3aed' } },
  { id: 'e-cp-inst',   source: 'component_permissions', target: 'instancias',  label: 'instanciaId?', style: { stroke: '#7c3aed', strokeDasharray: '4 2' } },
  { id: 'e-ae-acc',    source: 'account_entitlements', target: 'accounts',    label: 'accountId',    style: { stroke: '#7c3aed' } },
]

// ────────────────────────────────────────────────────────────────
// Dados: Modelo FGA
// ────────────────────────────────────────────────────────────────

const FGA_NODES: Node[] = [
  { id: 'fga-org',    type: 'fga', position: { x: 0,    y: 200 }, data: { label: 'Organization', category: 'entity', color: '#059669', items: ['id: string', 'name: string', 'escopo: global'] } },
  { id: 'fga-account',type: 'fga', position: { x: 360,  y: 200 }, data: { label: 'Account',      category: 'entity', color: '#2563eb', items: ['id: string', 'orgId: FK', 'subdomain: string', 'capabilities: string[]'] } },
  { id: 'fga-user',   type: 'fga', position: { x: 720,  y: 0   }, data: { label: 'User',         category: 'entity', color: '#d97706', items: ['id: string', 'email: string', 'papel: string'] } },
  { id: 'fga-group',  type: 'fga', position: { x: 720,  y: 380 }, data: { label: 'Group',        category: 'entity', color: '#7c3aed', items: ['id: string', 'escopo: org|conta', 'papel: Viewer|User|Admin', 'members: User[]'] } },
  { id: 'fga-component',type:'fga',position: { x: 1140, y: 0   }, data: { label: 'Component',    category: 'entity', color: '#475569', items: ['id: string', 'nome: string', 'metadataUrl?: string'] } },
  { id: 'fga-instance', type:'fga',position: { x: 1140, y: 300 }, data: { label: 'Instance',     category: 'entity', color: '#0891b2', items: ['id: string', 'componenteId: FK', 'accountId: FK', 'nome: string'] } },
  { id: 'fga-permission',type:'fga',position:{ x: 1500, y: 140 }, data: { label: 'Permission',   category: 'entity', color: '#dc2626', items: ['can_use_assistant', 'can_view_consulted_sources', 'can_upload_rag_sources', 'can_configure_agents', 'can_manage_users', 'pode_ler / pode_editar / …'] } },
]

const FGA_EDGES: Edge[] = [
  { id: 'fe-org-acc',   source: 'fga-org',       target: 'fga-account',    label: 'has_account',            animated: true,  style: { stroke: '#059669' }, labelStyle: { fill: '#059669', fontWeight: 600, fontSize: 11 } },
  { id: 'fe-acc-user',  source: 'fga-account',   target: 'fga-user',       label: 'member / account_admin', animated: true,  style: { stroke: '#2563eb' }, labelStyle: { fill: '#2563eb', fontWeight: 600, fontSize: 11 } },
  { id: 'fe-acc-group', source: 'fga-account',   target: 'fga-group',      label: 'has_group (conta)',      animated: true,  style: { stroke: '#7c3aed' }, labelStyle: { fill: '#7c3aed', fontWeight: 600, fontSize: 11 } },
  { id: 'fe-org-group', source: 'fga-org',       target: 'fga-group',      label: 'has_group (org)',        animated: true,  style: { stroke: '#7c3aed', strokeDasharray: '5 3' }, labelStyle: { fill: '#7c3aed', fontWeight: 600, fontSize: 11 } },
  { id: 'fe-group-user',source: 'fga-group',     target: 'fga-user',       label: 'member',                 animated: true,  style: { stroke: '#d97706' }, labelStyle: { fill: '#d97706', fontWeight: 600, fontSize: 11 } },
  { id: 'fe-acc-comp',  source: 'fga-account',   target: 'fga-component',  label: 'entitlement',            animated: false, style: { stroke: '#475569', strokeDasharray: '5 3' }, labelStyle: { fill: '#64748b', fontWeight: 600, fontSize: 11 } },
  { id: 'fe-comp-inst', source: 'fga-component', target: 'fga-instance',   label: 'has_instance',           animated: true,  style: { stroke: '#0891b2' }, labelStyle: { fill: '#0891b2', fontWeight: 600, fontSize: 11 } },
  { id: 'fe-inst-user', source: 'fga-instance',  target: 'fga-user',       label: 'viewer / member / admin',animated: true,  style: { stroke: '#0891b2', strokeDasharray: '5 3' }, labelStyle: { fill: '#0891b2', fontWeight: 600, fontSize: 11 } },
  { id: 'fe-inst-perm', source: 'fga-instance',  target: 'fga-permission', label: 'scoped_permission',      animated: true,  style: { stroke: '#dc2626' }, labelStyle: { fill: '#dc2626', fontWeight: 600, fontSize: 11 } },
  { id: 'fe-comp-perm', source: 'fga-component', target: 'fga-permission', label: 'global_permission',      animated: true,  style: { stroke: '#dc2626', strokeDasharray: '5 3' }, labelStyle: { fill: '#dc2626', fontWeight: 600, fontSize: 11 } },
]

// ── Legendas ──────────────────────────────────────────────────

function LegendaDB() {
  const t = useNodeTheme()
  const cats = [
    { color: '#059669', label: 'Core (orgs, contas, soluções)' },
    { color: '#2563eb', label: 'Access (usuários, grupos, memberships)' },
    { color: '#475569', label: 'Componentes & Instâncias' },
    { color: '#7c3aed', label: 'Permissões & Entitlements' },
  ]
  const cols = [
    { cls: 'bg-amber-400', label: 'PK — Primary Key' },
    { cls: 'bg-blue-400',  label: 'FK — Foreign Key' },
    { cls: 'bg-gray-400',  label: 'A — text / varchar' },
    { cls: 'bg-slate-400', label: '# — integer' },
    { cls: 'bg-purple-400',label: 'B — boolean' },
    { cls: 'bg-green-400', label: 'J — jsonb' },
    { cls: 'bg-rose-400',  label: 'T — timestamp' },
  ]
  return (
    <div
      className="absolute bottom-4 left-4 z-10 rounded-xl p-4 space-y-3 backdrop-blur-sm"
      style={{ background: t.legendBg, border: `1px solid ${t.legendBorder}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.legendSub }}>
        Legenda
      </p>
      <div className="space-y-1.5">
        {cats.map(i => (
          <div key={i.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: i.color }} />
            <span className="text-[11px]" style={{ color: t.legendText }}>{i.label}</span>
          </div>
        ))}
      </div>
      <div className="pt-2 space-y-1" style={{ borderTop: `1px solid ${t.legendDivide}` }}>
        {cols.map(c => (
          <div key={c.label} className="flex items-center gap-2">
            <span className={cn('w-3 h-3 rounded-sm shrink-0', c.cls)} />
            <span className="text-[11px]" style={{ color: t.legendSub }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LegendaFGA() {
  const t = useNodeTheme()
  const items = [
    { color: '#059669', label: 'Organization' },
    { color: '#2563eb', label: 'Account' },
    { color: '#d97706', label: 'User' },
    { color: '#7c3aed', label: 'Group' },
    { color: '#475569', label: 'Component' },
    { color: '#0891b2', label: 'Instance' },
    { color: '#dc2626', label: 'Permission' },
  ]
  return (
    <div
      className="absolute bottom-4 left-4 z-10 rounded-xl p-4 space-y-2 backdrop-blur-sm"
      style={{ background: t.legendBg, border: `1px solid ${t.legendBorder}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.legendSub }}>
        Entidades FGA
      </p>
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: i.color }} />
          <span className="text-[11px]" style={{ color: t.legendText }}>{i.label}</span>
        </div>
      ))}
      <div className="pt-2 space-y-1" style={{ borderTop: `1px solid ${t.legendDivide}` }}>
        <div className="flex items-center gap-2">
          <span className="w-6 border-t-2" style={{ borderColor: t.legendText }} />
          <span className="text-[11px]" style={{ color: t.legendSub }}>Relação direta</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 border-t-2 border-dashed" style={{ borderColor: t.legendSub }} />
          <span className="text-[11px]" style={{ color: t.legendSub }}>Relação opcional/herdada</span>
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
  const { theme, mode, toggle } = useVisualizerTheme()
  const [aba, setAba] = useState<Aba>('db')

  const [dbNodes,  , onDbNodesChange ] = useNodesState(DB_NODES)
  const [dbEdges,  , onDbEdgesChange ] = useEdgesState(DB_EDGES)
  const [fgaNodes, , onFgaNodesChange] = useNodesState(FGA_NODES)
  const [fgaEdges, , onFgaEdgesChange] = useEdgesState(FGA_EDGES)

  return (
    <VisualizerThemeContext.Provider value={theme}>
      <div className="flex flex-col flex-1 min-h-0" style={{ background: theme.canvasBg }}>

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.headerBorder}` }}
        >
          <div>
            <h1 className="text-lg font-semibold" style={{ color: theme.headerText }}>
              Schema Visualizer
            </h1>
            <p className="text-xs mt-0.5" style={{ color: theme.headerSub }}>
              Diagrama interativo do banco de dados e do modelo de autorização (FGA)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div
              className="flex items-center gap-1 rounded-lg p-1"
              style={{ background: theme.tabWrapBg, border: `1px solid ${theme.tabWrapBorder}` }}
            >
              {(['db', 'fga'] as Aba[]).map(a => (
                <button
                  key={a}
                  onClick={() => setAba(a)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    background: aba === a ? theme.tabActiveBg : 'transparent',
                    color:      aba === a ? theme.tabActiveText : theme.tabInactiveText,
                  }}
                >
                  {a === 'db' ? '🗄️ Schema DB' : '🔐 Modelo FGA'}
                </button>
              ))}
            </div>

            {/* Toggle light/dark */}
            <button
              onClick={toggle}
              title={mode === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{
                background:   theme.toggleBg,
                border:      `1px solid ${theme.toggleBorder}`,
                color:        theme.toggleText,
              }}
            >
              {mode === 'dark'
                ? <Sun  className="w-4 h-4" />
                : <Moon className="w-4 h-4" />}
              <span className="text-xs font-medium">
                {mode === 'dark' ? 'Claro' : 'Escuro'}
              </span>
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0 relative">
          {aba === 'db' ? (
            <ReactFlow
              nodes={dbNodes} edges={dbEdges}
              onNodesChange={onDbNodesChange} onEdgesChange={onDbEdgesChange}
              nodeTypes={nodeTypes}
              colorMode={theme.rfColorMode}
              fitView fitViewOptions={{ padding: 0.15 }}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              minZoom={0.2} maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                color={theme.dotColor}
                variant={BackgroundVariant.Dots}
                gap={20} size={1}
                style={{ background: theme.canvasBg }}
              />
              <Controls />
              <MiniMap
                nodeColor={n => {
                  const cat = ((n.data as unknown) as TableNodeData).category
                  return cat === 'core' ? '#059669' : cat === 'access' ? '#2563eb' : cat === 'permission' ? '#7c3aed' : '#475569'
                }}
                maskColor={theme.minimapMask}
                style={{ background: theme.minimapBg, border: `1px solid ${theme.minimapBorder}`, borderRadius: 12 }}
              />
              <LegendaDB />
            </ReactFlow>
          ) : (
            <ReactFlow
              nodes={fgaNodes} edges={fgaEdges}
              onNodesChange={onFgaNodesChange} onEdgesChange={onFgaEdgesChange}
              nodeTypes={nodeTypes}
              colorMode={theme.rfColorMode}
              fitView fitViewOptions={{ padding: 0.2 }}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              minZoom={0.2} maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                color={theme.dotColor}
                variant={BackgroundVariant.Dots}
                gap={20} size={1}
                style={{ background: theme.canvasBg }}
              />
              <Controls />
              <MiniMap
                nodeColor={n => (n.data as FGANodeData).color as string}
                maskColor={theme.minimapMask}
                style={{ background: theme.minimapBg, border: `1px solid ${theme.minimapBorder}`, borderRadius: 12 }}
              />
              <LegendaFGA />
            </ReactFlow>
          )}
        </div>

      </div>
    </VisualizerThemeContext.Provider>
  )
}
