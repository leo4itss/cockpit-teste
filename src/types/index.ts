export interface Contact {
  name: string
  role: string
  phone: string
  email: string
}

export interface Organization {
  id: string
  name: string
  logo?: string
  docType: string
  docNumber: string
  domain: string
  businessSegment: string
  activitySector: string
  qtdContas: number
  qtdSolucoes: number
  qtdContratos: number
  country: string
  state: string
  city: string
  zipCode: string
  address: string
  complement: string
  officialSite: string
  razaoSocial: string
  arquitetoPAS: string
  status: 'Ativo' | 'Inativo'
  createdAt: string
  contacts: Contact[]
}

export interface AdminUser {
  nome: string
  sobrenome: string
  email: string
  usuario: string
  senha: string
}

export interface Account {
  id: string
  orgId: string
  name: string
  razaoSocial?: string
  tipoDocumento?: string
  numeroDocumento?: string
  segmentoNegocio?: string
  siteOficial?: string
  pais?: string
  cep?: string
  endereco?: string
  complemento?: string
  estado?: string
  cidade?: string
  subdomain: string
  provisioningStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  arquitetoPAS: string
  descricao?: string
  logo?: string       // data URL ou URL externa
  isDefault?: boolean // true = conta padrão criada automaticamente com a org
  admins?: AdminUser[]  // usuários administradores da conta
  status: 'Criado' | 'Ativo' | 'Inativo'
  createdAt: string
  deletedAt?: string  // null/undefined = ativa; preenchido = em quarentena (soft delete)
}

// ── Tipos de Licença ──────────────────────────────────────────
// Entidade independente — cadastrada no backend, não enum fixo.
export interface TipoLicenca {
  id: string
  nome: string
  descricao?: string
  unidade: string  // ex: "usuários", "GB", "unidades", "tokens"
  createdAt: string
}

// ── Componentes ───────────────────────────────────────────────
// Módulos/serviços que compõem uma Solução.
// metadataUrl (opcional): endpoint GET que retorna os tiposLicenca disponíveis.
export interface Componente {
  id: string
  nome: string
  descricao?: string
  metadataUrl?: string
  tiposLicenca: string[]  // array de TipoLicenca.id disponíveis neste componente
  status?: 'Ativo' | 'Inativo'
  createdAt: string
}

// ── Licenciamento dentro de um Plano ──────────────────────────
// Cada entrada referencia um TipoLicenca com restrições opcionais de
// valor mínimo/máximo e configuração de preço.
export interface Licensing {
  tipoLicencaId: string          // FK → TipoLicenca.id
  tipoLicencaNome?: string       // denormalizado para exibição
  tipoLicencaUnidade?: string    // denormalizado para exibição
  valorMinimo?: string           // quantidade mínima (opcional)
  valorMaximo?: string           // quantidade máxima (opcional)
  valor?: string                 // valor livre por licença
  definirPreco: boolean
  precoAnual: string
  descontoMensal: string
  precoMes: string
}

export interface Plan {
  name: string
  description: string
  upgradeUrl?: string                   // URL para "Fazer upgrade"
  licensings: Licensing[]
  versao?: number                       // número incremental: 1, 2, 3…
  statusVersao?: 'ativo' | 'inativo'   // undefined ou 'ativo' = vigente
  criadoEm?: string                     // ISO timestamp da criação desta versão
}

// ── Valor de licença contratado ───────────────────────────────
// Representa o valor real acordado no contrato para cada tipo de licença
// de um plano. Independente do plano cadastrado — pode ser ajustado sem
// alterar o plano original.
export interface ValorLicencaContrato {
  tipoLicencaNome: string
  tipoLicencaUnidade?: string
  valor: string   // valor contratado (ex: "15", "500")
}

// ── Entrada de histórico do contrato ─────────────────────────
export interface ContractHistoricoEntry {
  timestamp: string   // ISO — data/hora do ajuste
  solucao: string     // nome da solução afetada
  plano: string       // nome do plano afetado
  descricao: string   // texto legível do que mudou (ex: "Usuário nominal: 10 → 15 usuários")
}

// ── Objeto do Contrato ────────────────────────────────────────
// Um contrato pode ter múltiplos objetos — cada um referencia uma
// combinação de solução + plano + licenciamento + organização contratada.
export interface ObjetoContrato {
  solucao: string
  orgContratada: string
  plano: string
  licenciamento: string
  qtdContratada?: number  // deprecated — preservado apenas para dados históricos
  planoVersao?: number    // versão do plano vigente no momento da assinatura
  valoresLicenca?: ValorLicencaContrato[]  // valores reais acordados neste contrato
}

export interface Solution {
  id: string
  orgId: string
  name: string
  plans: Plan[]
  componenteIds?: string[]  // IDs dos componentes utilizados por esta solução
  description: string
  type?: string
  arquitetoPAS: string
  status: 'Criado' | 'Ativo' | 'Inativo'
  createdAt: string
  marketplace?: string
  link01?: string
  titleLink01?: string
  link02?: string
  titleLink02?: string
  marketplaceStatus?: string
}

export interface Contract {
  id: string
  orgId: string
  contratante: string
  objetos: ObjetoContrato[]
  dataInicio: string
  dataTermino: string
  renovacao: string
  status: 'Ativo' | 'Inativo' | 'Pendente'
  historico?: ContractHistoricoEntry[]  // log de ajustes de licença
}

export interface User {
  id: string
  nomeCompleto: string
  usuario: string
  email: string
  senha?: string
  pais: string
  telefone: string
  area: string
  cargo: string
  papel: string
  etiquetas: string
  formatoData: string
  formatoHora: string
  fusoHorario: string
  status: 'Ativo' | 'Inativo'
  ultimoAcesso: string
  createdAt: string
  avatar?: string
}

// ── Grupos e Permissões ───────────────────────────────────────

/**
 * Grupo de usuários com escopo org-level ou conta-level.
 *
 * escopo='org'   → disponível para todas as contas da organização.
 *                  orgId preenchido, accountId null.
 * escopo='conta' → restrito a uma conta específica.
 *                  accountId preenchido, orgId null.
 *                  Account Admin pode criar e gerenciar.
 */
export interface Grupo {
  id: string
  nome: string
  descricao?: string
  escopo: 'org' | 'conta'
  orgId?: string       // preenchido quando escopo='org'
  accountId?: string   // preenchido quando escopo='conta'
  /**
   * Papel padrão do grupo — abstração sobre as tuplas FGA de permissão.
   * 'Viewer' → leitura/consulta
   * 'User'   → uso padrão do assistente
   * 'Admin'  → acesso completo
   * ''       → sem papel definido
   */
  papel?: string
  parentId?: string   // null = grupo raiz; preenchido = grupo filho
  status: 'Ativo' | 'Inativo'
  createdAt: string
  // campos enriquecidos pelo backend (opcionais)
  qtdMembros?: number
}

/**
 * Vínculo entre usuário e grupo (tabela usuario_grupos).
 * Escreve tupla FGA: user:<userId> member group:<grupoId>
 */
export interface UsuarioGrupo {
  id: string
  userId: string
  grupoId: string
  assignedAt: string
}

/**
 * Vínculo entre usuário e conta, com papel (tabela user_account_memberships).
 *
 * papel='member'        → usuário comum da conta.
 * papel='account_admin' → administrador da conta (promovido pelo Org Admin).
 *
 * Escreve tuplas FGA:
 *   member        → user:<userId> member        account:<accountId>
 *   account_admin → user:<userId> account_admin account:<accountId>
 */
export interface UserAccountMembership {
  id: string
  userId: string
  accountId: string
  papel: 'member' | 'account_admin'
  assignedAt: string
}

// ── Modelo FGA ────────────────────────────────────────────────

/**
 * Estado completo das relações FGA carregadas para o usuário atual.
 * Em produção, essas relações viriam do SDK do OpenFGA.
 * No PoC, são mockadas e carregadas no AuthContext.
 */
export interface FGARelations {
  // IDs dos usuários com papel platform_admin (acesso global)
  platformAdmins: string[]

  // Usuários com papel org_admin em organizações específicas
  orgAdmins: Array<{ userId: string; orgId: string }>

  // Usuários com papel pas_architect em organizações específicas
  pasArchitects: Array<{ userId: string; orgId: string }>

  // Usuários com papel account_admin em contas específicas
  accountAdmins: Array<{ userId: string; accountId: string }>

  // Usuários com papel member em contas específicas
  accountMembers: Array<{ userId: string; accountId: string }>

  // Membros de grupos (user → group)
  groupMembers: Array<{ userId: string; groupId: string }>

  // Membros de instâncias — relações FGA user/group → instance
  instanceMembers?: Array<{
    entityType: 'user' | 'group'
    entityId:   string
    instanceId: string
    role:       'viewer' | 'member' | 'admin'
  }>

  // Atribuições efetivas por instância
  instanciaAtribuicoes: {
    instanceId: string
    entityType: 'user' | 'group'
    entityId: string
    atribuicaoId: string
  }[]

  // Hierarquia de grupos (pai/filho)
  grupoParents: {
    grupoId: string
    parentId: string
  }[]
}

// ── Instâncias de Componente ──────────────────────────────────

/**
 * Uma instância é uma cópia configurada de um componente dentro de uma conta.
 * Ex: "Assistente Vanessa" = instância de "Assistente de IA" na conta Comgas.
 *
 * Tupla FGA: instance:<id> component component:<componenteId>
 *            instance:<id> account  account:<accountId>
 */
export interface Instancia {
  id:           string
  componenteId: string
  accountId:    string
  nome:         string
  descricao?:   string
  status:       'Ativo' | 'Inativo'
  createdAt:    string
  // enriquecido pelo backend
  qtdMembros?:  number
}

/**
 * Membro de uma instância — pode ser usuário ou grupo.
 *
 * papel: 'viewer' → leitura/consulta
 *        'member' → uso padrão
 *        'admin'  → acesso completo + gerenciar membros da instância
 *
 * Tupla FGA: user:<entidadeId>  <papel> instance:<instanciaId>
 *            group:<entidadeId> <papel> instance:<instanciaId>
 */
export interface InstanciaMembro {
  id:           string
  instanciaId:  string
  entidadeTipo: 'user' | 'group'
  entidadeId:   string
  papel:        'viewer' | 'member' | 'admin'
  assignedAt:   string
  // enriquecido pelo backend
  displayName?: string
  email?:       string
}

/**
 * Persona de teste para switcher de perfil no PoC.
 * Não existe em produção — apenas para demonstração.
 */
export interface Persona {
  userId: string
  label: string
  description: string
  color: string // classe Tailwind de gradiente, ex: 'from-orange-400 to-red-500'
}

// ── DocNix: Atribuições ────────────────────────────────────────
export interface Atribuicao {
  id: string
  componenteId: string
  nome: string
  descricao?: string
  modulo?: string   // 'MaxDoc' | 'DocAction' | undefined
  status: string
  createdAt: string
}

// ── DocNix: Fases e Fluxo ─────────────────────────────────────
export interface InstanciaFase {
  id: string
  instanciaId: string
  nome: string
  ordem: number
  descricao?: string
  createdAt: string
}

export interface FaseResponsavel {
  id: string
  faseId: string
  tipoResponsavel: 'usuario' | 'grupo' | 'cargo' | 'area'
  entidadeId: string  // userId, grupoId, ou texto do cargo/área
  createdAt: string
}

// ── DocNix: Perfil de Objeto ──────────────────────────────────
export interface InstanciaPerfilSlotNomeacao {
  id: string
  slotId: string
  entidadeTipo: 'user' | 'group'
  entidadeId: string
  displayName?: string
  createdAt: string
}

export interface InstanciaPerfilSlot {
  id: string
  instanciaId: string
  slotNome: string
  atribuicaoFiltroId?: string   // null = qualquer membro pode ocupar
  obrigatorio: boolean
  ordem: number
  createdAt: string
  nomeacoes?: InstanciaPerfilSlotNomeacao[]
}

export type ElegivelSlot = {
  id: string
  nome: string
  tipo: 'user' | 'group'
  origem: 'direto' | 'grupo'
  origemGrupoId?: string
  origemGrupoNome?: string
}

// ── DocNix: Membro com Atribuições ────────────────────────────
export interface InstanciaMembroAtribuicao {
  id: string
  membroId: string
  atribuicaoId: string
  assignedAt: string
}
