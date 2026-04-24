import { pgTable, text, integer, jsonb, boolean } from 'drizzle-orm/pg-core'

// ── Tipos de Licença ─────────────────────────────────────────
// Entidades independentes que descrevem dimensões de licenciamento
// (ex: "Usuário nominal", "Tamanho de banco de dados").
// Não usar enums fixos no código — cadastrar aqui e referênciar pelo id.
export const tiposLicenca = pgTable('tipos_licenca', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  unidade: text('unidade').notNull().default(''), // ex: "usuários", "GB", "unidades", "tokens"
  createdAt: text('created_at').notNull(),
})

// ── Componentes ───────────────────────────────────────────────
// Módulos/serviços que compõem uma Solução. Cada componente expõe
// opcionalmente uma URL de metadata (GET) cujo retorno esperado é:
// {
//   "componentId": string,
//   "name": string,
//   "version": string,
//   "tiposLicenca": [{ "id": string, "nome": string, "unidade": string }]
// }
// O sistema valida a presença de "tiposLicenca" como array não-vazio.
export const componentes = pgTable('componentes', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  metadataUrl: text('metadata_url'),
  tiposLicenca: jsonb('tipos_licenca').notNull().default([]), // string[] — ids de tiposLicenca disponíveis
  createdAt: text('created_at').notNull(),
})

// ── Organizations ─────────────────────────────────────────────
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  logo: text('logo'),
  docType: text('doc_type').notNull(),
  docNumber: text('doc_number').notNull(),
  domain: text('domain').notNull(),
  businessSegment: text('business_segment').notNull(),
  activitySector: text('activity_sector').notNull(),
  qtdContas: integer('qtd_contas').notNull().default(0),
  qtdSolucoes: integer('qtd_solucoes').notNull().default(0),
  qtdContratos: integer('qtd_contratos').notNull().default(0),
  country: text('country').notNull().default('Brasil'),
  state: text('state').notNull().default(''),
  city: text('city').notNull().default(''),
  zipCode: text('zip_code').notNull().default(''),
  address: text('address').notNull().default(''),
  complement: text('complement').notNull().default(''),
  officialSite: text('official_site').notNull().default(''),
  razaoSocial: text('razao_social').notNull(),
  arquitetoPAS: text('arquiteto_pas').notNull(),
  status: text('status').notNull().default('Ativo'),
  createdAt: text('created_at').notNull(),
  contacts: jsonb('contacts').notNull().default([]),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  razaoSocial: text('razao_social'),
  tipoDocumento: text('tipo_documento'),
  numeroDocumento: text('numero_documento'),
  segmentoNegocio: text('segmento_negocio'),
  siteOficial: text('site_oficial'),
  pais: text('pais'),
  cep: text('cep'),
  endereco: text('endereco'),
  complemento: text('complemento'),
  estado: text('estado'),
  cidade: text('cidade'),
  subdomain: text('subdomain').notNull(),
  provisioningStatus: text('provisioning_status').notNull().default('PENDING'),
  arquitetoPAS: text('arquiteto_pas').notNull(),
  descricao: text('descricao'),
  logo: text('logo'),                                    // data URL ou URL externa
  isDefault: boolean('is_default').notNull().default(false), // conta padrão da org
  status: text('status').notNull().default('Criado'),
  createdAt: text('created_at').notNull(),
  deletedAt: text('deleted_at'),  // null = ativa; preenchido = em quarentena (soft delete)
})

export const solutions = pgTable('solutions', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  plans: jsonb('plans').notNull().default([]),
  componenteIds: jsonb('componente_ids').notNull().default([]), // string[] — ids de componentes usados
  description: text('description').notNull().default(''),
  type: text('type').notNull().default(''),
  arquitetoPAS: text('arquiteto_pas').notNull(),
  status: text('status').notNull().default('Criado'),
  createdAt: text('created_at').notNull(),
  marketplace: text('marketplace'),
  link01: text('link01'),
  titleLink01: text('title_link01'),
  link02: text('link02'),
  titleLink02: text('title_link02'),
  marketplaceStatus: text('marketplace_status'),
})

export const contracts = pgTable('contracts', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id),
  contratante: text('contratante').notNull(),
  objetos: jsonb('objetos').notNull().default([]),  // ObjetoContrato[]
  dataInicio: text('data_inicio').notNull(),
  dataTermino: text('data_termino').notNull(),
  renovacao: text('renovacao').notNull(),
  status: text('status').notNull().default('Pendente'),
})

// ── Grupos ────────────────────────────────────────────────────
// Substituem o conceito de "papel" fixo (Administrador/Gerente/Usuário).
// Cada grupo agrega membros e um conjunto de permissões sobre objetos de componentes.
export const grupos = pgTable('grupos', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  status: text('status').notNull().default('Ativo'), // 'Ativo' | 'Inativo'
  createdAt: text('created_at').notNull(),
})

// Membros de um grupo (relação N:N entre users e grupos)
export const usuarioGrupos = pgTable('usuario_grupos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  grupoId: text('grupo_id').notNull().references(() => grupos.id),
  assignedAt: text('assigned_at').notNull(),
})

// Objetos importados do metadata do componente.
// Contrato esperado do endpoint de metadata:
// {
//   "componentId": string,
//   "name": string,
//   "version": string,
//   "objetos": [{ "id": string, "nome": string, "descricao": string?,
//                 "permissoes": [{ "id": string, "nome": string }] }]
// }
// Componentes simples expõem um único objeto "root" com permissões genéricas.
export const componenteObjetos = pgTable('componente_objetos', {
  id: text('id').primaryKey(),
  componenteId: text('componente_id').notNull().references(() => componentes.id),
  objetoId: text('objeto_id').notNull(),   // id vindo do metadata do componente
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  permissoesDisponiveis: jsonb('permissoes_disponiveis').notNull().default([]), // [{ id, nome }]
  importadoEm: text('importado_em').notNull(),
})

// Permissões atribuídas a um grupo sobre um objeto de componente
export const grupoPermissoes = pgTable('grupo_permissoes', {
  id: text('id').primaryKey(),
  grupoId: text('grupo_id').notNull().references(() => grupos.id),
  componenteObjetoId: text('componente_objeto_id').notNull().references(() => componenteObjetos.id),
  permissoesAtivas: jsonb('permissoes_ativas').notNull().default([]), // string[] de IDs de permissão
  createdAt: text('created_at').notNull(),
})

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  nomeCompleto: text('nome_completo').notNull(),
  usuario: text('usuario').notNull().unique(),
  email: text('email').notNull().unique(),
  pais: text('pais').notNull().default('Brasil'),
  telefone: text('telefone').notNull().default(''),
  area: text('area').notNull().default(''),
  cargo: text('cargo').notNull().default(''),
  papel: text('papel').notNull().default(''),
  etiquetas: text('etiquetas').notNull().default(''),
  formatoData: text('formato_data').notNull().default('DD/MM/YYYY'),
  formatoHora: text('formato_hora').notNull().default('24h'),
  fusoHorario: text('fuso_horario').notNull().default('America/Sao_Paulo'),
  status: text('status').notNull().default('Ativo'),
  ultimoAcesso: text('ultimo_acesso').notNull().default(''),
  createdAt: text('created_at').notNull(),
  avatar: text('avatar'),
})
