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

export interface Licensing {
  tipoLicenca: string
  slots: string
  modelo: string
  usuarios: string
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

export interface Solution {
  id: string
  orgId: string
  name: string
  plans: Plan[]
  description: string
  type: string
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
  orgContratada: string
  solucoes: string
  plano: string
  licenciamento?: string
  qtdContratada: number
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
