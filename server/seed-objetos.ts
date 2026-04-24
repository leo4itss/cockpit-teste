import 'dotenv/config'
import { db } from './db'
import { componenteObjetos } from './schema'
import { eq } from 'drizzle-orm'

const agora = new Date().toISOString()

const objetos = [
  // PAS Core
  {
    id: 'obj-pascore-assistentes',
    componenteId: 'comp-1',
    objetoId: 'assistentes',
    nome: 'Assistentes',
    descricao: 'Gerenciamento de assistentes de IA',
    permissoesDisponiveis: [
      { id: 'perm-visualizar', nome: 'Visualizar' },
      { id: 'perm-criar', nome: 'Criar' },
      { id: 'perm-editar', nome: 'Editar' },
      { id: 'perm-excluir', nome: 'Excluir' },
    ],
    importadoEm: agora,
  },
  {
    id: 'obj-pascore-sessoes',
    componenteId: 'comp-1',
    objetoId: 'sessoes',
    nome: 'Sessões',
    descricao: 'Histórico de sessões de conversa',
    permissoesDisponiveis: [
      { id: 'perm-visualizar', nome: 'Visualizar' },
      { id: 'perm-excluir', nome: 'Excluir' },
      { id: 'perm-exportar', nome: 'Exportar' },
    ],
    importadoEm: agora,
  },
  {
    id: 'obj-pascore-configuracoes',
    componenteId: 'comp-1',
    objetoId: 'configuracoes',
    nome: 'Configurações',
    descricao: 'Configurações do componente PAS Core',
    permissoesDisponiveis: [
      { id: 'perm-visualizar', nome: 'Visualizar' },
      { id: 'perm-editar', nome: 'Editar' },
    ],
    importadoEm: agora,
  },
  {
    id: 'obj-pascore-usuarios',
    componenteId: 'comp-1',
    objetoId: 'usuarios',
    nome: 'Usuários',
    descricao: 'Gestão de usuários no PAS Core',
    permissoesDisponiveis: [
      { id: 'perm-visualizar', nome: 'Visualizar' },
      { id: 'perm-criar', nome: 'Criar' },
      { id: 'perm-editar', nome: 'Editar' },
      { id: 'perm-excluir', nome: 'Excluir' },
      { id: 'perm-admin', nome: 'Administrar' },
    ],
    importadoEm: agora,
  },
  // Knowledge Base
  {
    id: 'obj-kb-bases',
    componenteId: 'comp-2',
    objetoId: 'bases',
    nome: 'Bases de conhecimento',
    descricao: 'Coleções de documentos indexados',
    permissoesDisponiveis: [
      { id: 'perm-visualizar', nome: 'Visualizar' },
      { id: 'perm-criar', nome: 'Criar' },
      { id: 'perm-editar', nome: 'Editar' },
      { id: 'perm-excluir', nome: 'Excluir' },
    ],
    importadoEm: agora,
  },
  {
    id: 'obj-kb-documentos',
    componenteId: 'comp-2',
    objetoId: 'documentos',
    nome: 'Documentos',
    descricao: 'Arquivos e documentos nas bases',
    permissoesDisponiveis: [
      { id: 'perm-visualizar', nome: 'Visualizar' },
      { id: 'perm-upload', nome: 'Upload' },
      { id: 'perm-excluir', nome: 'Excluir' },
    ],
    importadoEm: agora,
  },
  {
    id: 'obj-kb-integrações',
    componenteId: 'comp-2',
    objetoId: 'integracoes',
    nome: 'Integrações',
    descricao: 'Conectores externos para indexação',
    permissoesDisponiveis: [
      { id: 'perm-visualizar', nome: 'Visualizar' },
      { id: 'perm-configurar', nome: 'Configurar' },
    ],
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
