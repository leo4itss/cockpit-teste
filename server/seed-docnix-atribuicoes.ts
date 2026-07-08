import 'dotenv/config'
import { db } from './db'
import { componentes, componenteAtribuicoes } from './schema'
import { eq } from 'drizzle-orm'

// Catálogo alinhado a docs/06-catalogo-acoes.md
// MaxDoc: 47 · DocAction: 19

type AtribSeed = { id: string; nome: string; modulo: string | null }

const MAXDOC_ATRIBUICOES: AtribSeed[] = [
  // Integração / Administração
  { id: 'atrib-maxdoc-acesso-ext-xml',      nome: 'Acesso Externo Exportar XML',     modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-admin-modulo',        nome: 'Administrador Módulo MaxDoc',     modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-admin-registro',      nome: 'Administrador Registro',          modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-controle-acesso',     nome: 'Controle de Acesso',              modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-tabelas-admin',       nome: 'Tabelas Administrativas',         modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-criar-tipos-anexos',  nome: 'Criar Tipos Anexos',              modulo: 'MaxDoc' },
  // Global
  { id: 'atrib-maxdoc-acessar-todos',       nome: 'Acessar Todos',                   modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-ler-todos',           nome: 'Ler Todos',                       modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-comprovante-leitura', nome: 'Comprovante de Leitura',          modulo: 'MaxDoc' },
  // Documento — ciclo de vida
  { id: 'atrib-maxdoc-criar-doc',           nome: 'Criar Documento',                 modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-editar-doc',          nome: 'Editar Documento',                modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-excluir-doc',         nome: 'Excluir Documento',               modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-aprovar-doc',         nome: 'Aprovar Documento',               modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-revisar-doc',         nome: 'Revisar Documento',               modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-obsoletetar-doc',     nome: 'Obsoletetar Documento',           modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-criar-modelos',       nome: 'Criar Modelos',                   modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-submeter-aprovacao',  nome: 'Submeter para Aprovação',         modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-nova-versao',         nome: 'Nova Versão',                     modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-proteger-doc',        nome: 'Proteger Documento',              modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-distribuicao',        nome: 'Distribuição',                    modulo: 'MaxDoc' },
  // Perfil — filtros de nomeação
  { id: 'atrib-maxdoc-leitor-doc',          nome: 'Leitor Documento',                modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-editor-doc',          nome: 'Editor Documento',                modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-revisor-doc',         nome: 'Revisor Documento',               modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-aprovador-doc',       nome: 'Aprovador Documento',             modulo: 'MaxDoc' },
  // Anexo
  { id: 'atrib-maxdoc-criar-anexo',         nome: 'Criar Anexo',                     modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-editar-anexo',        nome: 'Editar Anexo',                    modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-excluir-anexo',       nome: 'Excluir Anexo',                   modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-leitor-anexos',       nome: 'Leitor Anexos',                   modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-copia-ctrl-anexo',    nome: 'Cópia Controlada Anexos',         modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-ciclo-aprov-anexo',   nome: 'Ciclo de Aprovação Anexos',       modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-aprov-subst-anexo',   nome: 'Aprovador Substituto Anexo',      modulo: 'MaxDoc' },
  // Registro
  { id: 'atrib-maxdoc-criar-registro',      nome: 'Criar Registro',                  modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-excluir-registro',    nome: 'Excluir Registro',                modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-aprov-subst-reg',     nome: 'Aprovador Substituto Registro',   modulo: 'MaxDoc' },
  // Substituto documento
  { id: 'atrib-maxdoc-aprov-subst-doc',     nome: 'Aprovador Substituto Documento',  modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-revisar-subst-doc',   nome: 'Revisar como Substituto Documento', modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-ciclo-aprov-doc',     nome: 'Ciclo de Aprovação Documentos',   modulo: 'MaxDoc' },
  // Cópias / arquivos
  { id: 'atrib-maxdoc-emitir-copia-ctrl',   nome: 'Emitir Cópia Controlada',         modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-emitir-copia-nctrl',  nome: 'Emitir Cópia Não Controlada',     modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-imprimir',            nome: 'Imprimir',                        modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-download-doc',        nome: 'Download Documento',              modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-upload-doc',          nome: 'Upload Documento',                modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-anexar-arquivos',     nome: 'Anexar Arquivos',                 modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-assinatura-eletronica', nome: 'Assinatura Eletrônica',         modulo: 'MaxDoc' },
  // Legado cockpit
  { id: 'atrib-maxdoc-visualizar',          nome: 'Visualizar',                      modulo: null },
  { id: 'atrib-maxdoc-usar',                nome: 'Usar',                            modulo: null },
  { id: 'atrib-maxdoc-administrar',         nome: 'Administrar',                     modulo: null },
]

const DOCACTION_ATRIBUICOES: AtribSeed[] = [
  { id: 'atrib-docaction-admin-modulo',           nome: 'Administrador Módulo DocAction',    modulo: 'DocAction' },
  { id: 'atrib-docaction-criar-ocorrencia',       nome: 'Criar Ocorrência',                  modulo: 'DocAction' },
  { id: 'atrib-docaction-criar-ocorrencia-8d',    nome: 'Criar Ocorrência 8D',               modulo: 'DocAction' },
  { id: 'atrib-docaction-categorizar-ocorrencia', nome: 'Categorizar Ocorrência',            modulo: 'DocAction' },
  { id: 'atrib-docaction-analisar-causa',         nome: 'Analisar Causa',                    modulo: 'DocAction' },
  { id: 'atrib-docaction-aprovar-analise-causa',  nome: 'Aprovar Análise de Causa',          modulo: 'DocAction' },
  { id: 'atrib-docaction-criar-plano-acao',       nome: 'Criar Plano de Ação',               modulo: 'DocAction' },
  { id: 'atrib-docaction-verificar-eficacia',     nome: 'Verificar Eficácia',                modulo: 'DocAction' },
  { id: 'atrib-docaction-encerrar-ocorrencia',    nome: 'Encerrar Ocorrência',               modulo: 'DocAction' },
  { id: 'atrib-docaction-encaminhar-ocorrencia',  nome: 'Encaminhar Ocorrência',             modulo: 'DocAction' },
  { id: 'atrib-docaction-editar-ocorrencia',      nome: 'Editar Ocorrência',                 modulo: 'DocAction' },
  { id: 'atrib-docaction-excluir-ocorrencia',     nome: 'Excluir Ocorrência',                modulo: 'DocAction' },
  { id: 'atrib-docaction-reprogramar-prazo',      nome: 'Reprogramar Prazo/Responsável',     modulo: 'DocAction' },
  { id: 'atrib-docaction-vincular-ocorrencia',    nome: 'Vincular Ocorrência',               modulo: 'DocAction' },
  { id: 'atrib-docaction-acompanhar-ocorrencia',  nome: 'Acompanhar Ocorrência',             modulo: 'DocAction' },
  { id: 'atrib-docaction-gerenciar-config',       nome: 'Gerenciar Configurações',           modulo: 'DocAction' },
  { id: 'atrib-docaction-visualizar',             nome: 'Visualizar',                        modulo: null },
  { id: 'atrib-docaction-usar',                   nome: 'Usar',                              modulo: null },
  { id: 'atrib-docaction-administrar',            nome: 'Administrar',                       modulo: null },
]

async function resolveComponenteId(nomeAlvo: string, fallbackId: string): Promise<string> {
  const comps = await db.select().from(componentes)
  const encontrado = comps.find(c => c.nome.toLowerCase().includes(nomeAlvo.toLowerCase()))
  if (encontrado) {
    console.log(`  Componente "${nomeAlvo}" encontrado: ${encontrado.id}`)
    return encontrado.id
  }
  console.log(`  Componente "${nomeAlvo}" não encontrado — criando com ID "${fallbackId}"`)
  await db.insert(componentes).values({
    id: fallbackId,
    nome: nomeAlvo,
    descricao: `Módulo ${nomeAlvo} — DocNix`,
    metadataUrl: null,
    tiposLicenca: [],
    status: 'Ativo',
    tipoModelo: 'docnix',
    createdAt: new Date().toISOString(),
  })
  return fallbackId
}

async function seedAtribuicoes(componenteId: string, atribuicoes: AtribSeed[]) {
  const existentes = await db.select().from(componenteAtribuicoes)
    .where(eq(componenteAtribuicoes.componenteId, componenteId))

  const existentesNomes = new Set(existentes.map(a => a.nome))
  let inseridos = 0

  for (const atrib of atribuicoes) {
    if (existentesNomes.has(atrib.nome)) {
      continue
    }
    await db.insert(componenteAtribuicoes).values({
      id: atrib.id,
      componenteId,
      nome: atrib.nome,
      descricao: null,
      modulo: atrib.modulo,
      status: 'Ativo',
      createdAt: new Date().toISOString(),
    })
    inseridos++
    console.log(`    + ${atrib.nome}`)
  }

  console.log(`  Inseridas: ${inseridos} · Total catálogo: ${atribuicoes.length} · Já existiam: ${atribuicoes.length - inseridos}`)
}

async function seed() {
  console.log('=== Seed: componente_atribuicoes (catálogo DocNix) ===\n')

  console.log(`--- MaxDoc (${MAXDOC_ATRIBUICOES.length} atribuições) ---`)
  const maxdocId = await resolveComponenteId('MaxDoc', 'comp-maxdoc')
  await db.update(componentes).set({ status: 'Ativo', tipoModelo: 'docnix' }).where(eq(componentes.id, maxdocId))
  await seedAtribuicoes(maxdocId, MAXDOC_ATRIBUICOES)

  console.log(`\n--- DocAction (${DOCACTION_ATRIBUICOES.length} atribuições) ---`)
  const docactionId = await resolveComponenteId('DocAction', 'comp-docaction')
  await db.update(componentes).set({ status: 'Ativo', tipoModelo: 'docnix' }).where(eq(componentes.id, docactionId))
  await seedAtribuicoes(docactionId, DOCACTION_ATRIBUICOES)

  console.log('\nSeed concluído. Ver docs/06-catalogo-acoes.md')
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
