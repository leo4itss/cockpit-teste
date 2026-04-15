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
  status: 'Criado' | 'Ativo' | 'Inativo'
  createdAt: string
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
  definirPreco: boolean
  precoAnual: string
  descontoMensal: string
  precoMes: string
}

export interface Plan {
  name: string
  description: string
  licensings: Licensing[]
}

// ── Objeto do Contrato ────────────────────────────────────────
// Um contrato pode ter múltiplos objetos — cada um referencia uma
// combinação de solução + plano + licenciamento + organização contratada.
export interface ObjetoContrato {
  solucao: string
  orgContratada: string
  plano: string
  licenciamento: string
  qtdContratada: number
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
