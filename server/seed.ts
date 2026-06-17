import 'dotenv/config'
import { db } from './db'
import {
  organizations, accounts, solutions, contracts, users, tiposLicenca, componentes,
  grupos, usuarioGrupos, componentPermissions, componenteAtribuicoes, componentePapeis, componenteAcoes,
  userAccountMemberships, accountEntitlements,
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
  componenteAtribuicoesMock,
  grupos as mockGrupos,
  grupoMembrosMap,
  accountMembrosIds,
  accountEntitlements as mockAccountEntitlements,
  instancias as mockInstancias,
  instanciaMembros as mockInstanciaMembros,
} from '../src/data/mock'

async function seed() {
  console.log('Seeding database...\n')

  // ── Limpar na ordem correta (FK) ─────────────────────────────
  await db.delete(instanciaMembroAtribuicoes)
  await db.delete(componentPermissions)
  await db.delete(componenteAtribuicoes)
  await db.delete(componenteAcoes)
  await db.delete(componentePapeis)
  await db.delete(userAccountMemberships)
  await db.delete(accountEntitlements)
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

  // ── Papéis por Componente (produtos reais) ────────────────────
  const papeisSeed: {
    id: string; componenteId: string; value: string; label: string
    descricao: string; defaultAcoes: string[]; cls: string; ordem: number; createdAt: string
  }[] = [
    // ── MaxDoc ──────────────────────────────────────────────────
    { id: 'papel-maxdoc-leitor',    componenteId: 'comp-maxdoc', value: 'leitor',      label: 'Leitor',
      descricao: 'Leitura e download de documentos',
      defaultAcoes: ['Visualizar','Ler Todos','Leitor Documento','Leitor Anexos','Baixar Documento','Imprimir'],
      cls: 'bg-gray-100 text-gray-600 border-gray-200',    ordem: 1, createdAt: '01/01/2026' },
    { id: 'papel-maxdoc-editor',    componenteId: 'comp-maxdoc', value: 'editor',      label: 'Editor',
      descricao: 'Cria e edita documentos e anexos',
      defaultAcoes: ['Visualizar','Criar Documento','Editar','Nova Versão','Mover','Cancelar Edição','Baixar Documento','Imprimir','Visualizar Histórico de Versões'],
      cls: 'bg-blue-50 text-blue-700 border-blue-200',     ordem: 2, createdAt: '01/01/2026' },
    { id: 'papel-maxdoc-revisor',   componenteId: 'comp-maxdoc', value: 'revisor',     label: 'Revisor',
      descricao: 'Revisa e submete documentos para aprovação',
      defaultAcoes: ['Visualizar','Revisar Documento','Submeter para Aprovação','Solicitar Revisão'],
      cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', ordem: 3, createdAt: '01/01/2026' },
    { id: 'papel-maxdoc-aprovador', componenteId: 'comp-maxdoc', value: 'aprovador',   label: 'Aprovador',
      descricao: 'Aprova, obsoleta e emite cópias controladas',
      defaultAcoes: ['Visualizar','Ler Todos','Leitor Documento','Leitor Anexos','Baixar Documento','Imprimir','Assinatura Eletrônica','Revisar Documento','Aprovar Documento','Rejeitar Documento','Aprovador Documento','Aprovador Substituto Documento','Obsoletetar Documento','Emitir Cópia Controlada','Emitir Cópia Não Controlada','Cópia Controlada Anexos','Ciclo de Aprovação Documentos'],
      cls: 'bg-orange-50 text-orange-700 border-orange-200', ordem: 4, createdAt: '01/01/2026' },
    { id: 'papel-maxdoc-admin',     componenteId: 'comp-maxdoc', value: 'admin-maxdoc', label: 'Administrador',
      descricao: 'Acesso completo ao MaxDoc',
      defaultAcoes: [], // [] = todas as ações do catálogo
      cls: 'bg-red-50 text-red-700 border-red-200',        ordem: 5, createdAt: '01/01/2026' },

    // ── DocAction ────────────────────────────────────────────────
    { id: 'papel-da-colaborador',   componenteId: 'comp-docaction', value: 'colaborador',        label: 'Colaborador',
      descricao: 'Cria e acompanha ocorrências',
      defaultAcoes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência'],
      cls: 'bg-green-50 text-green-700 border-green-200',  ordem: 1, createdAt: '01/01/2026' },
    { id: 'papel-da-analista',      componenteId: 'comp-docaction', value: 'analista',           label: 'Analista',
      descricao: 'Categoriza, analisa e cria planos de ação',
      defaultAcoes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência','Categorizar Ocorrência','Analisar Causa','Criar Plano de Ação','Verificar Eficácia','Encaminhar Ocorrência'],
      cls: 'bg-blue-50 text-blue-700 border-blue-200',     ordem: 2, createdAt: '01/01/2026' },
    { id: 'papel-da-aprovador',     componenteId: 'comp-docaction', value: 'aprovador-docaction', label: 'Aprovador',
      descricao: 'Aprova análises e encerra ocorrências',
      defaultAcoes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência','Categorizar Ocorrência','Analisar Causa','Criar Plano de Ação','Verificar Eficácia','Encaminhar Ocorrência','Aprovar Análise de Causa','Encerrar Ocorrência','Reprogramar Prazo/Responsável'],
      cls: 'bg-orange-50 text-orange-700 border-orange-200', ordem: 3, createdAt: '01/01/2026' },
    { id: 'papel-da-admin',         componenteId: 'comp-docaction', value: 'admin-docaction',    label: 'Administrador',
      descricao: 'Acesso completo ao DocAction',
      defaultAcoes: [],
      cls: 'bg-red-50 text-red-700 border-red-200',        ordem: 4, createdAt: '01/01/2026' },

    // ── Assistente IA ────────────────────────────────────────────
    { id: 'papel-ass-viewer',  componenteId: 'comp-assistente-ia', value: 'viewer',  label: 'Visualizador',
      descricao: 'Acesso somente leitura às conversas',
      defaultAcoes: ['can_use_assistant'],
      cls: 'bg-gray-100 text-gray-600 border-gray-200',    ordem: 1, createdAt: '01/01/2026' },
    { id: 'papel-ass-member',  componenteId: 'comp-assistente-ia', value: 'member',  label: 'Membro',
      descricao: 'Usa o assistente e compartilha resultados',
      defaultAcoes: ['can_use_assistant','can_share_conversation_results','can_view_consulted_sources','can_upload_rag_sources'],
      cls: 'bg-blue-50 text-blue-700 border-blue-200',     ordem: 2, createdAt: '01/01/2026' },
    { id: 'papel-ass-admin',   componenteId: 'comp-assistente-ia', value: 'admin',   label: 'Administrador',
      descricao: 'Acesso completo — configura e gerencia',
      defaultAcoes: ['can_use_assistant','can_share_conversation_results','can_view_consulted_sources','can_upload_rag_sources','can_create_assistant','can_configure_agents','can_manage_business_scenarios','can_manage_users'],
      cls: 'bg-red-50 text-red-700 border-red-200',        ordem: 3, createdAt: '01/01/2026' },
  ]
  await db.insert(componentePapeis).values(papeisSeed)
  console.log(`✓ componentePapeis (${papeisSeed.length})`)

  // ── Atribuições de Componentes DocNix ─────────────────────────
  if (componenteAtribuicoesMock.length > 0) {
    await db.insert(componenteAtribuicoes).values(
      componenteAtribuicoesMock.map(a => ({
        id:           a.id,
        componenteId: a.componenteId,
        nome:         a.nome,
        descricao:    a.descricao ?? null,
        modulo:       a.modulo ?? null,
        status:       a.status,
        createdAt:    a.createdAt,
      }))
    )
    console.log(`✓ componenteAtribuicoes (${componenteAtribuicoesMock.length})`)
  }

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
        membroRows.push({ id: `ugm-${grupoId}-${userId}`, userId, grupoId, assignedAt: '01/01/2026' })
      }
    }
    if (membroRows.length > 0) {
      await db.insert(usuarioGrupos).values(membroRows)
      console.log(`✓ usuarioGrupos (${membroRows.length} vínculos)`)
    }
  }

  // ── Membros de Conta (user_account_memberships) ───────────────
  // account_admins: primeiro userId com ID numérico curto (ex: '2', '4')
  const accountAdminIds = new Set(['1', '2', '3', '4', '5', '6'])
  const membershipRows: { id: string; userId: string; accountId: string; papel: string; assignedAt: string }[] = []
  for (const [accountId, userIds] of Object.entries(accountMembrosIds)) {
    for (const userId of userIds) {
      const papel = accountAdminIds.has(userId) ? 'account_admin' : 'member'
      membershipRows.push({
        id: `uam-${accountId}-${userId}`,
        userId,
        accountId,
        papel,
        assignedAt: '01/01/2026',
      })
    }
  }
  if (membershipRows.length > 0) {
    await db.insert(userAccountMemberships).values(membershipRows)
    console.log(`✓ userAccountMemberships (${membershipRows.length} vínculos)`)
  }

  // ── Entitlements (capabilities por conta) ────────────────────
  const entitlementRows: { id: string; accountId: string; capability: string; enabledAt: string }[] = []
  for (const [accountId, capabilities] of Object.entries(mockAccountEntitlements)) {
    for (const cap of capabilities) {
      const slug = cap.replace(/\./g, '-')
      entitlementRows.push({
        id: `ent-${accountId}-${slug}`,
        accountId,
        capability: cap,
        enabledAt: '01/01/2026',
      })
    }
  }
  if (entitlementRows.length > 0) {
    await db.insert(accountEntitlements).values(entitlementRows)
    console.log(`✓ accountEntitlements (${entitlementRows.length})`)
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
