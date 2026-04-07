import 'dotenv/config'
import { db } from './db'
import { organizations, accounts, solutions, contracts, users } from './schema'
import {
  organizations as mockOrgs,
  accounts as mockAccounts,
  solutions as mockSolutions,
  contracts as mockContracts,
  users as mockUsers,
} from '../src/data/mock'

async function seed() {
  console.log('Seeding database...')

  await db.delete(contracts)
  await db.delete(solutions)
  await db.delete(accounts)
  await db.delete(users)
  await db.delete(organizations)

  await db.insert(organizations).values(
    mockOrgs.map(o => ({
      id: o.id,
      name: o.name,
      logo: o.logo,
      docType: o.docType,
      docNumber: o.docNumber,
      domain: o.domain,
      businessSegment: o.businessSegment,
      activitySector: o.activitySector,
      qtdContas: o.qtdContas,
      qtdSolucoes: o.qtdSolucoes,
      qtdContratos: o.qtdContratos,
      country: o.country,
      state: o.state,
      city: o.city,
      zipCode: o.zipCode,
      address: o.address,
      complement: o.complement,
      officialSite: o.officialSite,
      razaoSocial: o.razaoSocial,
      arquitetoPAS: o.arquitetoPAS,
      status: o.status,
      createdAt: o.createdAt,
      contacts: o.contacts,
    }))
  )
  console.log('✓ organizations')

  await db.insert(accounts).values(
    mockAccounts.map(a => ({
      id: a.id,
      orgId: a.orgId,
      name: a.name,
      razaoSocial: a.razaoSocial,
      tipoDocumento: a.tipoDocumento,
      numeroDocumento: a.numeroDocumento,
      segmentoNegocio: a.segmentoNegocio,
      siteOficial: a.siteOficial,
      pais: a.pais,
      cep: a.cep,
      endereco: a.endereco,
      complemento: a.complemento,
      estado: a.estado,
      cidade: a.cidade,
      subdomain: a.subdomain,
      provisioningStatus: a.provisioningStatus,
      arquitetoPAS: a.arquitetoPAS,
      descricao: a.descricao,
      status: a.status,
      createdAt: a.createdAt,
    }))
  )
  console.log('✓ accounts')

  await db.insert(solutions).values(
    mockSolutions.map(s => ({
      id: s.id,
      orgId: s.orgId,
      name: s.name,
      plans: s.plans,
      description: s.description,
      type: s.type,
      arquitetoPAS: s.arquitetoPAS,
      status: s.status,
      createdAt: s.createdAt,
      marketplace: s.marketplace,
      link01: s.link01,
      titleLink01: s.titleLink01,
      link02: s.link02,
      titleLink02: s.titleLink02,
      marketplaceStatus: s.marketplaceStatus,
    }))
  )
  console.log('✓ solutions')

  await db.insert(contracts).values(
    mockContracts.map(c => ({
      id: c.id,
      orgId: c.orgId,
      contratante: c.contratante,
      orgContratada: c.orgContratada,
      solucoes: c.solucoes,
      plano: c.plano,
      licenciamento: c.licenciamento,
      qtdContratada: c.qtdContratada,
      dataInicio: c.dataInicio,
      dataTermino: c.dataTermino,
      renovacao: c.renovacao,
      status: c.status,
    }))
  )
  console.log('✓ contracts')

  await db.insert(users).values(
    mockUsers.map(u => ({
      id: u.id,
      nomeCompleto: u.nomeCompleto,
      usuario: u.usuario,
      email: u.email,
      pais: u.pais,
      telefone: u.telefone,
      area: u.area,
      cargo: u.cargo,
      papel: u.papel,
      etiquetas: u.etiquetas,
      formatoData: u.formatoData,
      formatoHora: u.formatoHora,
      fusoHorario: u.fusoHorario,
      status: u.status,
      ultimoAcesso: u.ultimoAcesso,
      createdAt: u.createdAt,
      avatar: u.avatar,
    }))
  )
  console.log('✓ users')

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
