import 'dotenv/config'
import { db } from './db'
import { componenteObjetos, grupoPermissoes } from './schema'
import { eq } from 'drizzle-orm'

const agora = new Date().toISOString()

// ── Roles FGA — usados como permissoesDisponiveis em cada objeto ─────────────
// Mapeiam diretamente para as relações do modelo FGA:
//
//   type component
//     define viewer:  [user, group#member]  → can_view
//     define editor:  [user, group#member]  → can_edit + can_view
//     define manager: [user, group#member]  → can_manage + can_edit + can_view
//
// Quando um grupo tem permissoesAtivas: ['editor'] sobre um objeto,
// isso representa a tupla FGA:  group:<id>#member → editor → component:<objId>
const FGA_ROLES = [
  { id: 'viewer',  nome: 'Viewer'  },
  { id: 'editor',  nome: 'Editor'  },
  { id: 'manager', nome: 'Manager' },
]

const objetos = [
  // PAS Core (comp-1)
  {
    id: 'obj-pascore-assistentes',
    componenteId: 'comp-1',
    objetoId: 'assistentes',
    nome: 'Assistentes',
    descricao: 'Gerenciamento de assistentes de IA',
    permissoesDisponiveis: FGA_ROLES,
    importadoEm: agora,
  },
  {
    id: 'obj-pascore-sessoes',
    componenteId: 'comp-1',
    objetoId: 'sessoes',
    nome: 'Sessões',
    descricao: 'Histórico de sessões de conversa',
    permissoesDisponiveis: FGA_ROLES,
    importadoEm: agora,
  },
  {
    id: 'obj-pascore-configuracoes',
    componenteId: 'comp-1',
    objetoId: 'configuracoes',
    nome: 'Configurações',
    descricao: 'Configurações do componente PAS Core',
    permissoesDisponiveis: FGA_ROLES,
    importadoEm: agora,
  },
  {
    id: 'obj-pascore-usuarios',
    componenteId: 'comp-1',
    objetoId: 'usuarios',
    nome: 'Usuários',
    descricao: 'Gestão de usuários no PAS Core',
    permissoesDisponiveis: FGA_ROLES,
    importadoEm: agora,
  },
  // Knowledge Base (comp-2)
  {
    id: 'obj-kb-bases',
    componenteId: 'comp-2',
    objetoId: 'bases',
    nome: 'Bases de conhecimento',
    descricao: 'Coleções de documentos indexados',
    permissoesDisponiveis: FGA_ROLES,
    importadoEm: agora,
  },
  {
    id: 'obj-kb-documentos',
    componenteId: 'comp-2',
    objetoId: 'documentos',
    nome: 'Arquivos e documentos nas bases',
    descricao: 'Arquivos e documentos nas bases',
    permissoesDisponiveis: FGA_ROLES,
    importadoEm: agora,
  },
  {
    id: 'obj-kb-integracoes',
    componenteId: 'comp-2',
    objetoId: 'integracoes',
    nome: 'Integrações',
    descricao: 'Conectores externos para indexação',
    permissoesDisponiveis: FGA_ROLES,
    importadoEm: agora,
  },
]

async function seed() {
  console.log('Populando objetos de componentes...')

  await db.delete(componenteObjetos).where(eq(componenteObjetos.componenteId, 'comp-1'))
  await db.delete(componenteObjetos).where(eq(componenteObjetos.componenteId, 'comp-2'))

  await db.insert(componenteObjetos).values(objetos as any)
  console.log(`✓ ${objetos.length} objetos inseridos`)

  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
