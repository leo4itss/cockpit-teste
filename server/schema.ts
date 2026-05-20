import { pgTable, text, integer, jsonb, boolean, index } from 'drizzle-orm/pg-core'

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
  status: text('status').notNull().default('Ativo'),          // 'Ativo' | 'Inativo' (soft delete via inativação)
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
  admins: jsonb('admins').notNull().default([]),              // AdminUser[] — usuários administradores da conta
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
  historico: jsonb('historico').notNull().default([]),  // ContractHistoricoEntry[]
  dataInicio: text('data_inicio').notNull(),
  dataTermino: text('data_termino').notNull(),
  renovacao: text('renovacao').notNull(),
  status: text('status').notNull().default('Pendente'),
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

// ── Grupos ────────────────────────────────────────────────────
// Grupos de usuários com escopo org-level ou conta-level.
//
// Regras de escopo (FGA):
//   escopo='org'   → orgId preenchido, accountId null
//                    Grupo disponível para todas as contas da org.
//   escopo='conta' → accountId preenchido, orgId null
//                    Grupo restrito à conta — Account Admin pode criá-lo.
//
// Papéis por componente são armazenados em user_account_memberships
// e resolvidos pelo engine FGA em tempo de leitura.
export const grupos = pgTable('grupos', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  // 'org' → disponível em toda a organização
  // 'conta' → restrito à conta específica
  escopo: text('escopo').notNull().default('org'), // 'org' | 'conta'
  orgId: text('org_id').references(() => organizations.id),
  accountId: text('account_id').references(() => accounts.id),
  // Papel padrão do grupo — abstração sobre as tuplas FGA de permissão.
  // 'Viewer' → leitura/consulta | 'User' → uso padrão | 'Admin' → acesso completo
  // Valor vazio = sem papel definido (grupo criado antes dessa feature)
  papel: text('papel').notNull().default(''),
  status: text('status').notNull().default('Ativo'), // 'Ativo' | 'Inativo'
  createdAt: text('created_at').notNull(),
})

// ── Membros de Grupo ──────────────────────────────────────────
// Relação N:N entre usuários e grupos.
// Escreve tupla FGA: user:<userId> member group:<grupoId>
export const usuarioGrupos = pgTable('usuario_grupos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  grupoId: text('grupo_id').notNull().references(() => grupos.id),
  assignedAt: text('assigned_at').notNull(),
})

// ── Permissões Granulares por Componente ──────────────────────
// Cada linha representa uma ação concedida a um usuário ou grupo
// em um componente específico.
//
// entidade_tipo: 'user' | 'group'
// acao:
//   Assistente de IA → can_use_assistant | can_view_consulted_sources |
//                      can_upload_rag_sources | can_configure_agents |
//                      can_manage_business_scenarios | can_manage_users
//   Base de Conhecimento → pode_ler | pode_editar | pode_criar_documento |
//                          pode_enviar_para_aprovacao | pode_aprovar |
//                          pode_publicar | pode_excluir
//
// Equivale a uma tupla FGA: <entidade_tipo>:<entidade_id> <acao> componente:<componente_id>
export const componentPermissions = pgTable('component_permissions', {
  id:           text('id').primaryKey(),
  entidadeTipo: text('entidade_tipo').notNull(), // 'user' | 'group'
  entidadeId:   text('entidade_id').notNull(),
  componenteId: text('componente_id').notNull(),
  acao:         text('acao').notNull(),
  // null → permissão no componente inteiro (comportamento original)
  // preenchido → permissão restrita a uma instância específica
  instanciaId:  text('instancia_id'),
  createdAt:    text('created_at').notNull(),
}, (t) => [
  index('idx_comp_perm_lookup').on(t.entidadeTipo, t.entidadeId, t.componenteId, t.acao),
  index('idx_comp_perm_instancia').on(t.instanciaId),
])

// ── Entitlements por Conta ───────────────────────────────────
// Registra quais capabilities estão ativas para cada conta.
//
// Equivale à tupla FGA:
//   account:<accountId> enabled_for_tenant capability:<capability>
//
// Exemplo: capability='assistant.use' → conta pode usar o Assistente de IA.
// A regra de decisão é: allow = permission AND entitlement.
export const accountEntitlements = pgTable('account_entitlements', {
  id:         text('id').primaryKey(),
  accountId:  text('account_id').notNull().references(() => accounts.id),
  capability: text('capability').notNull(), // e.g. 'assistant.use'
  enabledAt:  text('enabled_at').notNull(),
}, (t) => [
  index('idx_account_entitlements').on(t.accountId, t.capability),
])

// ── Vínculos Usuário–Conta ────────────────────────────────────
// Registra que um usuário pertence a uma conta e qual é seu papel.
//
// papel='member'        → usuário comum da conta
// papel='account_admin' → administrador da conta (promovido pelo Org Admin)
//
// Escreve tupla FGA:
//   member        → user:<userId> member account:<accountId>
//   account_admin → user:<userId> account_admin account:<accountId>
//
// Nota: um usuário pode ser account_admin de várias contas.
export const userAccountMemberships = pgTable('user_account_memberships', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  accountId: text('account_id').notNull().references(() => accounts.id),
  papel: text('papel').notNull().default('member'), // 'member' | 'account_admin'
  assignedAt: text('assigned_at').notNull(),
})

// ── Instâncias de Componente ──────────────────────────────────
// Uma instância é uma cópia configurada de um componente dentro de uma conta.
// Ex: "Assistente Vanessa" = instância do componente "Assistente de IA" na conta Comgas.
//
// Tupla FGA: instance:<id> component component:<componenteId>
//            instance:<id> account  account:<accountId>
export const instancias = pgTable('instancias', {
  id:           text('id').primaryKey(),
  componenteId: text('componente_id').notNull().references(() => componentes.id),
  accountId:    text('account_id').notNull().references(() => accounts.id),
  nome:         text('nome').notNull(),
  descricao:    text('descricao'),
  status:       text('status').notNull().default('Ativo'), // 'Ativo' | 'Inativo'
  createdAt:    text('created_at').notNull(),
}, (t) => [
  index('idx_instancias_componente').on(t.componenteId, t.accountId),
])

// ── Membros de Instância ──────────────────────────────────────
// Quem pode acessar uma instância específica, e com qual papel.
//
// papel: 'viewer' → leitura, 'member' → uso padrão, 'admin' → acesso completo
//
// Tupla FGA: user:<entidadeId>  <papel> instance:<instanciaId>
//            group:<entidadeId> <papel> instance:<instanciaId>
export const instanciaMembros = pgTable('instancia_membros', {
  id:           text('id').primaryKey(),
  instanciaId:  text('instancia_id').notNull().references(() => instancias.id),
  entidadeTipo: text('entidade_tipo').notNull(), // 'user' | 'group'
  entidadeId:   text('entidade_id').notNull(),
  papel:        text('papel').notNull(),          // 'viewer' | 'member' | 'admin'
  assignedAt:   text('assigned_at').notNull(),
}, (t) => [
  index('idx_instancia_membros_lookup').on(t.instanciaId, t.entidadeTipo, t.entidadeId),
])
