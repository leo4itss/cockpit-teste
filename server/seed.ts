import 'dotenv/config'
import { db } from './db'
import {
  organizations, accounts, solutions, contracts, users, tiposLicenca, componentes,
  grupos, usuarioGrupos, componentPermissions, componenteAtribuicoes,
  instancias, instanciaMembros, instanciaMembroAtribuicoes,
  instanciaFases, faseResponsaveis, faseAtribuicoesPermitidas,
  instanciaPerfilSlots, instanciaPerfilSlotNomeacoes,
} from './schema'
import {
  organizations as mockOrgs,
  accounts as mockAccounts,
  solutions as mockSolutions,
  contracts as mockContracts,
  users as mockUsers,
  tiposLicenca as mockTiposLicenca,
  componentes as mockComponentes,
  grupos as mockGrupos,
  grupoMembrosMap,
  instancias as mockInstancias,
  instanciaMembros as mockInstanciaMembros,
} from '../src/data/mock'

async function seed() {
  console.log('Seeding database...\n')

  // ── Limpar na ordem correta (FK) ─────────────────────────────
  await db.delete(instanciaMembroAtribuicoes)
  await db.delete(componentPermissions)
  await db.delete(componenteAtribuicoes)
  await db.delete(instanciaPerfilSlotNomeacoes)
  await db.delete(faseAtribuicoesPermitidas)
  await db.delete(faseResponsaveis)
  await db.delete(instanciaFases)
  await db.delete(instanciaPerfilSlots)
  await db.delete(instanciaMembros)
  await db.delete(instancias)
  await db.delete(usuarioGrupos)
  await db.delete(grupos)
  await db.delete(contracts)
  await db.delete(solutions)
  await db.delete(accounts)
  await db.delete(users)
  await db.delete(organizations)
  await db.delete(componentes)
  await db.delete(tiposLicenca)
  console.log('✓ tabelas limpas')

  // ── Organizações ─────────────────────────────────────────────
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
  console.log(`✓ organizations (${mockOrgs.length})`)

  // ── Contas ────────────────────────────────────────────────────
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
      isDefault: a.isDefault ?? false,
      status: a.status,
      createdAt: a.createdAt,
    }))
  )
  console.log(`✓ accounts (${mockAccounts.length})`)

  // ── Soluções ─────────────────────────────────────────────────
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
  console.log(`✓ solutions (${mockSolutions.length})`)

  // ── Contratos ─────────────────────────────────────────────────
  await db.insert(contracts).values(
    mockContracts.map(c => ({
      id: c.id,
      orgId: c.orgId,
      contratante: c.contratante,
      objetos: c.objetos,
      dataInicio: c.dataInicio,
      dataTermino: c.dataTermino,
      renovacao: c.renovacao,
      status: c.status,
    }))
  )
  console.log(`✓ contracts (${mockContracts.length})`)

  // ── Usuários ──────────────────────────────────────────────────
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
  console.log(`✓ users (${mockUsers.length})`)

  // ── Tipos de Licença ──────────────────────────────────────────
  await db.insert(tiposLicenca).values(
    mockTiposLicenca.map(t => ({
      id: t.id,
      nome: t.nome,
      descricao: t.descricao,
      unidade: t.unidade,
      createdAt: t.createdAt,
    }))
  )
  console.log(`✓ tiposLicenca (${mockTiposLicenca.length})`)

  // ── Componentes (com tipoModelo) ──────────────────────────────
  await db.insert(componentes).values(
    mockComponentes.map(c => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      metadataUrl: c.metadataUrl,
      tiposLicenca: c.tiposLicenca,
      tipoModelo: c.tipoModelo ?? 'fga',
      status: c.status ?? 'Ativo',
      createdAt: c.createdAt,
    }))
  )
  console.log(`✓ componentes (${mockComponentes.length})`)

  // ── Grupos ────────────────────────────────────────────────────
  if (mockGrupos.length > 0) {
    await db.insert(grupos).values(
      mockGrupos.map(g => ({
        id: g.id,
        nome: g.nome,
        descricao: g.descricao,
        escopo: g.escopo,
        orgId: g.orgId,
        accountId: g.accountId,
        papel: g.papel ?? '',
        parentId: g.parentId,
        status: g.status,
        createdAt: g.createdAt,
      }))
    )
    console.log(`✓ grupos (${mockGrupos.length})`)

    // Membros dos grupos (de grupoMembrosMap)
    const membroRows: { id: string; usuarioId: string; grupoId: string }[] = []
    for (const [grupoId, userIds] of Object.entries(grupoMembrosMap)) {
      for (const userId of userIds) {
        membroRows.push({ id: `ugm-${grupoId}-${userId}`, usuarioId: userId, grupoId })
      }
    }
    if (membroRows.length > 0) {
      await db.insert(usuarioGrupos).values(membroRows)
      console.log(`✓ usuarioGrupos (${membroRows.length} vínculos)`)
    }
  }

  // ── Instâncias ────────────────────────────────────────────────
  if (mockInstancias.length > 0) {
    await db.insert(instancias).values(
      mockInstancias.map(i => ({
        id: i.id,
        componenteId: i.componenteId,
        accountId: i.accountId,
        nome: i.nome,
        descricao: i.descricao,
        status: i.status,
        createdAt: i.createdAt,
      }))
    )
    console.log(`✓ instancias (${mockInstancias.length})`)

    // Membros das instâncias
    if (mockInstanciaMembros.length > 0) {
      await db.insert(instanciaMembros).values(
        mockInstanciaMembros.map(m => ({
          id: m.id,
          instanciaId: m.instanciaId,
          entidadeTipo: m.entidadeTipo,
          entidadeId: m.entidadeId,
          papel: m.papel,
          assignedAt: m.assignedAt,
        }))
      )
      console.log(`✓ instanciaMembros (${mockInstanciaMembros.length})`)
    }
  }

  console.log('\n🎉 Seed completo!')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
