import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { db } from './db'
import {
  organizations,
  accounts,
  solutions,
  contracts,
  users,
  tiposLicenca,
  componentes,
  grupos,
  usuarioGrupos,
  userAccountMemberships,
  componentPermissions,
  accountEntitlements,
  instancias,
  instanciaMembros,
  componenteAtribuicoes,
  instanciaMembroAtribuicoes,
  instanciaFases,
  faseResponsaveis,
  instanciaPerfilSlots,
  instanciaPerfilSlotNomeacoes,
  faseAtribuicoesPermitidas,
} from './schema'
import { eq, and, or, inArray, isNull } from 'drizzle-orm'
import { getElegiveisParaSlot } from './docnix-elegiveis'

const app = new Hono()

app.use('*', cors({ origin: 'http://localhost:5173' }))

// ── Organizations ────────────────────────────────────────────

app.get('/api/organizations', async (c) => {
  const rows = await db.select().from(organizations)
  return c.json(rows)
})

app.get('/api/organizations/:id', async (c) => {
  try {
    const [row] = await db.select().from(organizations).where(eq(organizations.id, c.req.param('id')))
    if (!row) return c.json({ error: 'Not found' }, 404)
    return c.json(row)
  } catch (err: any) {
    console.error('[GET /api/organizations/:id] ERROR:', err.message, err.stack)
    return c.json({ error: err.message }, 500)
  }
})

app.post('/api/organizations', async (c) => {
  const body = await c.req.json()

  // neon-http não suporta transactions nativas.
  // Usamos compensação manual: cria org → tenta criar conta default →
  // se falhar, apaga a org (rollback por compensação).
  const [org] = await db.insert(organizations).values(body).returning()

  try {
    await db.insert(accounts).values({
      id: crypto.randomUUID(),
      orgId: org.id,
      name: org.name,
      subdomain: org.domain,
      arquitetoPAS: org.arquitetoPAS,
      provisioningStatus: 'PENDING',
      isDefault: true,
      status: 'Criado',
      createdAt: new Date().toLocaleDateString('pt-BR'),
    })
  } catch (err) {
    // Compensação: remove a org para não deixar registro órfão
    await db.delete(organizations).where(eq(organizations.id, org.id))
    throw err
  }

  return c.json(org, 201)
})

app.put('/api/organizations/:id', async (c) => {
  const body = await c.req.json()
  const [row] = await db.update(organizations).set(body).where(eq(organizations.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/organizations/:id', async (c) => {
  const id = c.req.param('id')

  // Verificar dependências bloqueantes
  const [orgAccounts, orgContracts] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.orgId, id)),
    db.select().from(contracts).where(eq(contracts.orgId, id)),
  ])
  const activeAccounts = orgAccounts.filter((a: any) => a.status !== 'Excluído')
  const activeContracts = orgContracts.filter((ct: any) => ct.status === 'Ativo')

  if (activeAccounts.length > 0 || activeContracts.length > 0) {
    return c.json({
      error: 'dependencies',
      activeAccounts: activeAccounts.length,
      activeContracts: activeContracts.length,
    }, 422)
  }

  // Cascata: excluir contas (já inativas/excluídas) e contratos
  await db.delete(accounts).where(eq(accounts.orgId, id))
  await db.delete(contracts).where(eq(contracts.orgId, id))
  await db.delete(solutions).where(eq(solutions.orgId, id))
  await db.delete(organizations).where(eq(organizations.id, id))
  return c.json({ ok: true })
})

// ── Accounts ─────────────────────────────────────────────────

app.get('/api/accounts', async (c) => {
  const orgId = c.req.query('orgId')
  const includeDeleted = c.req.query('include_deleted') === 'true'

  // Por padrão exclui contas em quarentena (deletedAt preenchido)
  // Passa include_deleted=true para incluir contas em quarentena
  const { isNull, isNotNull, and } = await import('drizzle-orm')

  let rows
  if (orgId) {
    rows = includeDeleted
      ? await db.select().from(accounts).where(eq(accounts.orgId, orgId))
      : await db.select().from(accounts).where(and(eq(accounts.orgId, orgId), isNull(accounts.deletedAt)))
  } else {
    rows = includeDeleted
      ? await db.select().from(accounts)
      : await db.select().from(accounts).where(isNull(accounts.deletedAt))
  }
  return c.json(rows)
})

app.get('/api/accounts/:id', async (c) => {
  const [row] = await db.select().from(accounts).where(eq(accounts.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/api/accounts', async (c) => {
  const body = await c.req.json()
  const [row] = await db.insert(accounts).values(body).returning()
  return c.json(row, 201)
})

app.put('/api/accounts/:id', async (c) => {
  const body = await c.req.json()
  const [row] = await db.update(accounts).set(body).where(eq(accounts.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/accounts/:id', async (c) => {
  // Soft delete: marca deletedAt, não remove fisicamente
  const [row] = await db
    .update(accounts)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(accounts.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

// Restaura conta em quarentena (cancela exclusão)
app.patch('/api/accounts/:id/restaurar', async (c) => {
  const [row] = await db
    .update(accounts)
    .set({ deletedAt: null })
    .where(eq(accounts.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

// ── Solutions ─────────────────────────────────────────────────

app.get('/api/solutions', async (c) => {
  const orgId = c.req.query('orgId')
  const rows = orgId
    ? await db.select().from(solutions).where(eq(solutions.orgId, orgId))
    : await db.select().from(solutions)
  return c.json(rows)
})

app.get('/api/solutions/:id', async (c) => {
  const [row] = await db.select().from(solutions).where(eq(solutions.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/api/solutions', async (c) => {
  const body = await c.req.json()
  // Garante que todo plano criado já nasce com v1 registrada no histórico
  const now = new Date().toISOString()
  if (Array.isArray(body.plans)) {
    body.plans = body.plans.map((p: any) => ({
      ...p,
      versao: p.versao ?? 1,
      statusVersao: p.statusVersao ?? 'ativo',
      criadoEm: p.criadoEm ?? now,
    }))
  }
  const [row] = await db.insert(solutions).values(body).returning()
  return c.json(row, 201)
})

app.put('/api/solutions/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  // Busca a solução existente
  const [existing] = await db.select().from(solutions).where(eq(solutions.id, id))
  if (!existing) return c.json({ error: 'Not found' }, 404)

  // ── Componentes: ao menos 1 vinculado ────────────────────
  const incomingComponenteIds: string[] = body.componenteIds ?? []
  if (incomingComponenteIds.length === 0) {
    return c.json({
      error: 'A solução deve ter ao menos um componente vinculado.',
    }, 422)
  }

  // ── Versionamento de planos ───────────────────────────────
  // O frontend envia apenas os planos ATIVOS (o que o usuário vê/edita).
  // O backend faz o merge: marca versões alteradas como 'inativo' e cria
  // novas versões 'ativo'. Versões inativas anteriores são preservadas
  // como histórico.
  const existingPlansArr: any[] = (existing.plans as any[]) ?? []
  const incomingPlansArr: any[] = body.plans ?? []

  // Separa histórico (inativo) dos planos vigentes (ativos)
  const existingInactive = existingPlansArr.filter((p: any) => p.statusVersao === 'inativo')
  const existingActive   = existingPlansArr.filter((p: any) => !p.statusVersao || p.statusVersao === 'ativo')

  // Remove campos de meta-versão para comparar apenas conteúdo
  function stripMeta({ versao: _v, statusVersao: _s, criadoEm: _c, ...rest }: any) {
    return rest
  }

  // Detecta se algum plano EXISTENTE (não novo) teve seu conteúdo alterado
  const plansChanged = incomingPlansArr.some(incoming => {
    const active = existingActive.find((p: any) => p.name === incoming.name)
    if (!active) return false // plano novo → não é "mudança de versão"
    return JSON.stringify(stripMeta(active)) !== JSON.stringify(stripMeta(incoming))
  })

  const versionLog: string[] = [`plansChanged=${plansChanged}`]

  // Constrói array final com versionamento
  const resultPlans: any[] = [...existingInactive] // preserva histórico sempre

  for (const incoming of incomingPlansArr) {
    const currentActive = existingActive.find((p: any) => p.name === incoming.name)

    if (!currentActive) {
      // Plano novo: versão 1
      resultPlans.push({
        ...incoming,
        versao: 1,
        statusVersao: 'ativo',
        criadoEm: new Date().toISOString(),
      })
    } else {
      const contentChanged = JSON.stringify(stripMeta(currentActive)) !== JSON.stringify(stripMeta(incoming))
      if (contentChanged) {
        // Marca versão atual como inativa e cria nova versão
        resultPlans.push({ ...currentActive, statusVersao: 'inativo' })
        resultPlans.push({
          ...incoming,
          versao: (currentActive.versao ?? 1) + 1,
          statusVersao: 'ativo',
          criadoEm: new Date().toISOString(),
        })
        versionLog.push(`plan v${(currentActive.versao ?? 1) + 1}: ${incoming.name}`)
      } else {
        // Sem mudança: mantém exatamente como estava (com meta-campos)
        resultPlans.push(currentActive)
      }
    }
  }

  // Planos ativos que o usuário removeu → marcar como inativo (não excluir)
  for (const active of existingActive) {
    if (!incomingPlansArr.find((p: any) => p.name === active.name)) {
      resultPlans.push({ ...active, statusVersao: 'inativo' })
      versionLog.push(`plan removed → inativo: ${active.name}`)
    }
  }

  body.plans = resultPlans

  if (plansChanged) {
    console.log('[plan-versioning]', versionLog.join(' | '))
  }

  const [row] = await db.update(solutions).set(body).where(eq(solutions.id, id)).returning()
  return c.json({ ...row, _v: versionLog })
})

app.delete('/api/solutions/:id', async (c) => {
  const id = c.req.param('id')
  const [sol] = await db.select().from(solutions).where(eq(solutions.id, id))
  if (!sol) return c.json({ error: 'Not found' }, 404)

  // Verifica se há contratos vinculados pelo nome da solução
  const allContracts = await db.select().from(contracts)
  const linked = allContracts.some((ct: any) =>
    (ct.objetos as Array<{ solucao: string }>).some(obj => obj.solucao === sol.name)
  )
  if (linked) {
    return c.json({
      error: 'linked_to_contracts',
      message: 'Esta solução está vinculada a contratos e não pode ser excluída. Inative-a para desativá-la.',
    }, 422)
  }

  await db.delete(solutions).where(eq(solutions.id, id))
  return c.json({ ok: true })
})

// ── Contracts ─────────────────────────────────────────────────

app.get('/api/contracts', async (c) => {
  const orgId = c.req.query('orgId')
  const rows = orgId
    ? await db.select().from(contracts).where(eq(contracts.orgId, orgId))
    : await db.select().from(contracts)
  return c.json(rows)
})

app.get('/api/contracts/:id', async (c) => {
  const [row] = await db.select().from(contracts).where(eq(contracts.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/api/contracts', async (c) => {
  const body = await c.req.json()
  const [row] = await db.insert(contracts).values(body).returning()
  return c.json(row, 201)
})

app.put('/api/contracts/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const [existing] = await db.select().from(contracts).where(eq(contracts.id, id))
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const [row] = await db.update(contracts).set(body).where(eq(contracts.id, id)).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/contracts/:id', async (c) => {
  await db.delete(contracts).where(eq(contracts.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── Users ─────────────────────────────────────────────────────

app.get('/api/users', async (c) => {
  const rows = await db.select().from(users)
  return c.json(rows)
})

app.get('/api/users/cargos-distintos', async (c) => {
  const rows = await db.selectDistinct({ cargo: users.cargo }).from(users)
  const cargos = rows.map((r: any) => r.cargo).filter(Boolean).sort()
  return c.json(cargos)
})

app.get('/api/users/areas-distintas', async (c) => {
  const rows = await db.selectDistinct({ area: users.area }).from(users)
  const areas = rows.map((r: any) => r.area).filter(Boolean).sort()
  return c.json(areas)
})

app.get('/api/users/:id', async (c) => {
  const [row] = await db.select().from(users).where(eq(users.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/api/users', async (c) => {
  try {
    const body = await c.req.json()
    const [row] = await db.insert(users).values(body).returning()
    return c.json(row, 201)
  } catch (e: any) {
    const msg: string = e?.message ?? ''
    if (msg.includes('unique') || msg.includes('duplicate')) {
      if (msg.includes('"email"') || msg.includes('email'))
        return c.json({ error: 'Este e-mail já está cadastrado na plataforma.' }, 409)
      if (msg.includes('"usuario"') || msg.includes('usuario'))
        return c.json({ error: 'Este nome de usuário já está em uso.' }, 409)
      return c.json({ error: 'E-mail ou usuário já cadastrado.' }, 409)
    }
    throw e
  }
})

app.put('/api/users/:id', async (c) => {
  const body = await c.req.json()
  const [row] = await db.update(users).set(body).where(eq(users.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/users/:id', async (c) => {
  await db.delete(users).where(eq(users.id, c.req.param('id')))
  return c.json({ ok: true })
})

/**
 * GET /api/users/:id/grupos?accountId=
 * Retorna os grupos dos quais o usuário é membro.
 * Se accountId fornecido, filtra grupos com escopo 'conta' daquela conta
 * ou grupos com escopo 'org' (herdados). Na prática retorna todos os grupos
 * do usuário — o front filtra conforme necessário.
 */
app.get('/api/users/:id/grupos', async (c) => {
  const userId    = c.req.param('id')
  const accountId = c.req.query('accountId')

  // 1. Busca todas as associações do usuário a grupos
  const memberships = await db
    .select({ grupoId: usuarioGrupos.grupoId })
    .from(usuarioGrupos)
    .where(eq(usuarioGrupos.userId, userId))

  const grupoIds = memberships.map(m => m.grupoId)
  if (grupoIds.length === 0) return c.json([])

  // 2. Busca os grupos correspondentes, opcionalmente filtrado por conta.
  // Inclui: grupos da conta específica OU grupos org-scoped (accountId null) que
  // afetam qualquer conta da organização.
  const rows = await db
    .select()
    .from(grupos)
    .where(
      accountId
        ? and(
            inArray(grupos.id, grupoIds),
            or(
              eq(grupos.accountId, accountId), // grupos da conta
              isNull(grupos.accountId),         // grupos org-scoped
            ),
          )
        : inArray(grupos.id, grupoIds)
    )

  return c.json(rows)
})

// ── Tipos de Licença ─────────────────────────────────────────

app.get('/api/tipos-licenca', async (c) => {
  const rows = await db.select().from(tiposLicenca)
  return c.json(rows)
})

app.get('/api/tipos-licenca/:id', async (c) => {
  const [row] = await db.select().from(tiposLicenca).where(eq(tiposLicenca.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/api/tipos-licenca', async (c) => {
  const body = await c.req.json()
  const [row] = await db.insert(tiposLicenca).values(body).returning()
  return c.json(row, 201)
})

app.put('/api/tipos-licenca/:id', async (c) => {
  const body = await c.req.json()
  const [row] = await db.update(tiposLicenca).set(body).where(eq(tiposLicenca.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/tipos-licenca/:id', async (c) => {
  await db.delete(tiposLicenca).where(eq(tiposLicenca.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── Componentes ───────────────────────────────────────────────

app.get('/api/componentes', async (c) => {
  const includeInactive = c.req.query('include_inactive') === 'true'
  const rows = await db.select().from(componentes)
  // Por padrão filtra inativos; passa include_inactive=true para incluir
  const filtered = includeInactive ? rows : rows.filter((r: any) => r.status !== 'Inativo')
  return c.json(filtered)
})

app.get('/api/componentes/:id/linked', async (c) => {
  const id = c.req.param('id')
  const allSolutions = await db.select().from(solutions)
  const linked = allSolutions.some((sol: any) =>
    Array.isArray(sol.componenteIds) && sol.componenteIds.includes(id)
  )
  return c.json({ linked })
})

app.get('/api/componentes/:id', async (c) => {
  const [row] = await db.select().from(componentes).where(eq(componentes.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/api/componentes', async (c) => {
  const body = await c.req.json()
  const [row] = await db.insert(componentes).values(body).returning()
  return c.json(row, 201)
})

app.put('/api/componentes/:id', async (c) => {
  const body = await c.req.json()
  const [row] = await db.update(componentes).set(body).where(eq(componentes.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/componentes/:id', async (c) => {
  const id = c.req.param('id')
  const [comp] = await db.select().from(componentes).where(eq(componentes.id, id))
  if (!comp) return c.json({ error: 'Not found' }, 404)

  // Verifica se há soluções com este componente vinculado
  const allSolutions = await db.select().from(solutions)
  const linked = allSolutions.some((sol: any) =>
    Array.isArray(sol.componenteIds) && sol.componenteIds.includes(id)
  )

  if (linked) {
    // Soft delete: inativa o componente, preserva dados
    const [row] = await db.update(componentes)
      .set({ status: 'Inativo' })
      .where(eq(componentes.id, id))
      .returning()
    return c.json({ ok: true, action: 'inativado', componente: row })
  }

  // Sem vínculo: exclusão física
  await db.delete(componentes).where(eq(componentes.id, id))
  return c.json({ ok: true, action: 'excluido' })
})

app.patch('/api/componentes/:id/reativar', async (c) => {
  const [row] = await db.update(componentes)
    .set({ status: 'Ativo' })
    .where(eq(componentes.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

/**
 * Valida a URL de metadata de um componente.
 * Faz um GET na URL informada e verifica se o retorno contém
 * "tiposLicenca" como array não-vazio.
 *
 * Formato esperado do endpoint de metadata:
 * {
 *   "componentId": string,
 *   "name": string,
 *   "version": string,
 *   "tiposLicenca": [{ "id": string, "nome": string, "unidade": string }]
 * }
 */
app.post('/api/componentes/validate-metadata', async (c) => {
  const { url } = await c.req.json() as { url: string }
  if (!url || typeof url !== 'string') {
    return c.json({ ok: false, error: 'URL inválida' }, 400)
  }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) {
      return c.json({ ok: false, error: `Servidor retornou status ${res.status}` })
    }
    const data = await res.json() as Record<string, unknown>
    if (!Array.isArray(data.tiposLicenca) || data.tiposLicenca.length === 0) {
      return c.json({ ok: false, error: 'Resposta não contém "tiposLicenca" como array não-vazio' })
    }
    return c.json({ ok: true, data })
  } catch (err: unknown) {
    const msg = err instanceof Error && err.name === 'AbortError'
      ? 'Timeout — URL demorou mais de 3 segundos para responder'
      : 'URL inacessível'
    return c.json({ ok: false, error: msg })
  }
})

// ── Grupos ────────────────────────────────────────────────────
//
// Regras de escopo:
//   escopo='org'   → filtrado por orgId
//   escopo='conta' → filtrado por accountId
//
// Tuplas FGA escritas em cada mutação (comentadas no PoC;
// em produção seriam chamadas ao SDK do OpenFGA).

/**
 * GET /api/grupos
 * Query params opcionais: orgId, accountId
 * Retorna grupos enriquecidos com qtdMembros.
 */
app.get('/api/grupos', async (c) => {
  const { orgId, accountId } = c.req.query()
  try {
    // Busca todos os grupos e todas as contas (filtro em memória — PoC)
    const [rows, allAccounts] = await Promise.all([
      db.select().from(grupos),
      db.select().from(accounts),
    ])

    const filtered = rows.filter((g: any) => {
      if (orgId && accountId) return g.orgId === orgId || g.accountId === accountId
      if (orgId) {
        // Inclui grupos escopo=org E grupos escopo=conta de contas pertencentes à org
        const orgAccountIds = allAccounts
          .filter((a: any) => a.orgId === orgId)
          .map((a: any) => a.id)
        return g.orgId === orgId || orgAccountIds.includes(g.accountId)
      }
      if (accountId) {
        // Inclui grupos da conta E grupos org-scoped da org à qual a conta pertence
        const account = allAccounts.find((a: any) => a.id === accountId)
        const orgIdDaConta = account?.orgId
        return g.accountId === accountId || (orgIdDaConta && g.orgId === orgIdDaConta)
      }
      return true
    })

    // Enriquece com qtdMembros
    const membros = await db.select().from(usuarioGrupos)
    const result = filtered.map((g: any) => ({
      ...g,
      qtdMembros: membros.filter((m: any) => m.grupoId === g.id).length,
    }))

    return c.json(result)
  } catch (err: any) {
    console.error('[GET /api/grupos] ERROR:', err.message)
    return c.json({ error: err.message }, 500)
  }
})

/**
 * GET /api/grupos/:id
 */
app.get('/api/grupos/:id', async (c) => {
  const [row] = await db.select().from(grupos).where(eq(grupos.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)

  const membros = await db.select().from(usuarioGrupos).where(eq(usuarioGrupos.grupoId, row.id))
  return c.json({ ...row, qtdMembros: membros.length })
})

/**
 * POST /api/grupos
 * Body: { id?, nome, descricao?, escopo, orgId?, accountId? }
 *
 * Escreve tupla FGA (PoC: comentado):
 *   group:<id> org organization:<orgId>          (escopo=org)
 *   group:<id> account account:<accountId>        (escopo=conta)
 */
app.post('/api/grupos', async (c) => {
  const body = await c.req.json()

  // Validação: grupo org-scoped exige orgId; grupo conta-scoped exige accountId
  const escopo = body.escopo ?? 'org'
  if (escopo === 'org'   && !body.orgId)     return c.json({ error: 'orgId é obrigatório para grupos de escopo org' }, 400)
  if (escopo === 'conta' && !body.accountId) return c.json({ error: 'accountId é obrigatório para grupos de escopo conta' }, 400)

  const id = body.id ?? crypto.randomUUID()
  const createdAt = new Date().toLocaleDateString('pt-BR')

  const [row] = await db.insert(grupos).values({
    id,
    nome: body.nome,
    descricao: body.descricao ?? null,
    papel: body.papel ?? '',
    escopo: body.escopo ?? 'org',
    orgId: body.orgId ?? null,
    accountId: body.accountId ?? null,
    status: 'Ativo',
    createdAt,
  }).returning()

  // TODO (produção): await fga.write({ user: `group:${id}`, relation: 'org', object: `organization:${orgId}` })

  return c.json(row, 201)
})

/**
 * PUT /api/grupos/:id
 * Body: campos parciais de grupo (nome, descricao, status)
 */
app.put('/api/grupos/:id', async (c) => {
  const grupoId = c.req.param('id')
  const body = await c.req.json()
  const updates: Record<string, any> = {
    nome: body.nome,
    descricao: body.descricao,
    papel: body.papel,
    status: body.status,
  }
  if (body.parentId !== undefined) {
    const novoParent: string | null = body.parentId || null

    // Validação anti-ciclo: não pode apontar para si mesmo ou para descendente.
    if (novoParent === grupoId) {
      return c.json({ error: 'Um grupo não pode ser pai de si mesmo.' }, 400)
    }
    if (novoParent) {
      // Caminha pela cadeia ancestral a partir do novoParent.
      // Se encontrarmos o próprio grupoId, é ciclo.
      const todos = await db.select({ id: grupos.id, parentId: grupos.parentId }).from(grupos)
      const byId = new Map(todos.map(g => [g.id, g.parentId]))
      const visitados = new Set<string>()
      let cursor: string | null | undefined = novoParent
      while (cursor) {
        if (cursor === grupoId) {
          return c.json({ error: 'Mudança criaria um ciclo na hierarquia de grupos.' }, 400)
        }
        if (visitados.has(cursor)) break // proteção contra dados já corrompidos
        visitados.add(cursor)
        cursor = byId.get(cursor) ?? null
      }
    }

    updates.parentId = novoParent
  }
  const [row] = await db
    .update(grupos)
    .set(updates)
    .where(eq(grupos.id, grupoId))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

/**
 * DELETE /api/grupos/:id
 * Remove grupo e todos os seus vínculos de membros.
 *
 * Escreve tupla FGA (PoC: comentado):
 *   DELETE group:<id> member user:*
 */
app.delete('/api/grupos/:id', async (c) => {
  const id = c.req.param('id')

  // Remove vínculos de membros primeiro (FK)
  await db.delete(usuarioGrupos).where(eq(usuarioGrupos.grupoId, id))

  const [row] = await db.delete(grupos).where(eq(grupos.id, id)).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)

  // TODO (produção): await fga.deleteRelationshipTuples([{ user: `group:${id}`, ... }])

  return c.json({ ok: true })
})

// ── Membros de Grupo ──────────────────────────────────────────

/**
 * GET /api/grupos/:id/membros
 * Retorna lista de usuários que são membros do grupo (com dados do user).
 */
app.get('/api/grupos/:id/membros', async (c) => {
  const grupoId = c.req.param('id')
  const links = await db.select().from(usuarioGrupos).where(eq(usuarioGrupos.grupoId, grupoId))
  if (links.length === 0) return c.json([])

  const userIds = links.map((l: any) => l.userId)
  const allUsers = await db.select().from(users)
  const membros = allUsers.filter((u: any) => userIds.includes(u.id))
  return c.json(membros)
})

/**
 * POST /api/grupos/:id/membros
 * Body: { userId }
 *
 * Escreve tupla FGA (PoC: comentado):
 *   user:<userId> member group:<grupoId>
 */
app.post('/api/grupos/:id/membros', async (c) => {
  const grupoId = c.req.param('id')
  const { userId } = await c.req.json()

  // Idempotente: ignora se já for membro
  const existing = await db
    .select()
    .from(usuarioGrupos)
    .where(and(eq(usuarioGrupos.grupoId, grupoId), eq(usuarioGrupos.userId, userId)))

  if (existing.length > 0) return c.json(existing[0])

  const [row] = await db.insert(usuarioGrupos).values({
    id: crypto.randomUUID(),
    userId,
    grupoId,
    assignedAt: new Date().toLocaleDateString('pt-BR'),
  }).returning()

  // TODO (produção): await fga.write({ user: `user:${userId}`, relation: 'member', object: `group:${grupoId}` })

  return c.json(row, 201)
})

/**
 * DELETE /api/grupos/:id/membros/:userId
 *
 * Escreve tupla FGA (PoC: comentado):
 *   DELETE user:<userId> member group:<grupoId>
 */
app.delete('/api/grupos/:id/membros/:userId', async (c) => {
  const grupoId = c.req.param('id')
  const userId  = c.req.param('userId')

  await db
    .delete(usuarioGrupos)
    .where(and(eq(usuarioGrupos.grupoId, grupoId), eq(usuarioGrupos.userId, userId)))

  // TODO (produção): await fga.deleteTuples([{ user: `user:${userId}`, relation: 'member', object: `group:${grupoId}` }])

  return c.json({ ok: true })
})

// ── Vínculos Usuário–Conta ────────────────────────────────────

/**
 * GET /api/accounts/:id/membros
 * Lista usuários vinculados à conta com seu papel (member | account_admin).
 */
app.get('/api/accounts/:id/membros', async (c) => {
  const accountId = c.req.param('id')
  const links = await db
    .select()
    .from(userAccountMemberships)
    .where(eq(userAccountMemberships.accountId, accountId))

  if (links.length === 0) return c.json([])

  const userIds  = links.map((l: any) => l.userId)
  const allUsers = await db.select().from(users)
  const membros  = allUsers
    .filter((u: any) => userIds.includes(u.id))
    .map((u: any) => ({
      ...u,
      papel: links.find((l: any) => l.userId === u.id)?.papel ?? 'member',
    }))

  return c.json(membros)
})

/**
 * POST /api/accounts/:id/membros
 * Body: { userId, papel: 'member' | 'account_admin' }
 *
 * Escreve tupla FGA:
 *   user:<userId> <papel> account:<accountId>
 */
app.post('/api/accounts/:id/membros', async (c) => {
  const accountId = c.req.param('id')
  const { userId, papel = 'member' } = await c.req.json()

  // Upsert: atualiza papel se já existir vínculo
  const existing = await db
    .select()
    .from(userAccountMemberships)
    .where(and(
      eq(userAccountMemberships.accountId, accountId),
      eq(userAccountMemberships.userId, userId),
    ))

  if (existing.length > 0) {
    const [row] = await db
      .update(userAccountMemberships)
      .set({ papel })
      .where(eq(userAccountMemberships.id, existing[0].id))
      .returning()
    return c.json(row)
  }

  const [row] = await db.insert(userAccountMemberships).values({
    id: crypto.randomUUID(),
    userId,
    accountId,
    papel,
    assignedAt: new Date().toLocaleDateString('pt-BR'),
  }).returning()

  // TODO (produção): await fga.write({ user: `user:${userId}`, relation: papel, object: `account:${accountId}` })

  return c.json(row, 201)
})

/**
 * DELETE /api/accounts/:id/membros/:userId
 * Remove vínculo do usuário com a conta (não exclui o usuário da org).
 */
app.delete('/api/accounts/:id/membros/:userId', async (c) => {
  const accountId = c.req.param('id')
  const userId    = c.req.param('userId')

  await db
    .delete(userAccountMemberships)
    .where(and(
      eq(userAccountMemberships.accountId, accountId),
      eq(userAccountMemberships.userId, userId),
    ))

  return c.json({ ok: true })
})

// ── Permissões Granulares ────────────────────────────────────

/**
 * GET /api/permissions
 * Query: entidade_tipo, entidade_id, componente_id (todos opcionais — combináveis)
 * Retorna lista de registros de component_permissions que satisfazem os filtros.
 */
app.get('/api/permissions', async (c) => {
  const entidadeTipo = c.req.query('entidade_tipo')
  const entidadeId   = c.req.query('entidade_id')
  const componenteId = c.req.query('componente_id')
  const instanciaId  = c.req.query('instancia_id') // undefined = sem filtro; 'null' = só sem instância

  const conditions = []
  if (entidadeTipo) conditions.push(eq(componentPermissions.entidadeTipo, entidadeTipo))
  if (entidadeId)   conditions.push(eq(componentPermissions.entidadeId,   entidadeId))
  if (componenteId) conditions.push(eq(componentPermissions.componenteId, componenteId))
  if (instanciaId && instanciaId !== 'null') conditions.push(eq(componentPermissions.instanciaId, instanciaId))
  if (instanciaId === 'null') conditions.push(isNull(componentPermissions.instanciaId))

  const rows = conditions.length > 0
    ? await db.select().from(componentPermissions).where(and(...conditions))
    : await db.select().from(componentPermissions)

  return c.json(rows)
})

/**
 * POST /api/permissions
 * Body: { entidade_tipo, entidade_id, componente_id, acao }
 * Cria a permissão se ainda não existir (idempotente).
 */
app.post('/api/permissions', async (c) => {
  const body = await c.req.json()
  const { entidade_tipo, entidade_id, componente_id, acao, instancia_id } = body

  if (!entidade_tipo || !entidade_id || !componente_id || !acao) {
    return c.json({ error: 'entidade_tipo, entidade_id, componente_id e acao são obrigatórios' }, 400)
  }

  // Idempotente — considera instancia_id na chave de unicidade
  const conditions = [
    eq(componentPermissions.entidadeTipo, entidade_tipo),
    eq(componentPermissions.entidadeId,   entidade_id),
    eq(componentPermissions.componenteId, componente_id),
    eq(componentPermissions.acao,         acao),
    instancia_id
      ? eq(componentPermissions.instanciaId, instancia_id)
      : eq(componentPermissions.instanciaId, null as any),
  ]
  const existing = await db.select().from(componentPermissions).where(and(...conditions))
  if (existing.length > 0) return c.json(existing[0], 200)

  const [row] = await db.insert(componentPermissions).values({
    id:           crypto.randomUUID(),
    entidadeTipo: entidade_tipo,
    entidadeId:   entidade_id,
    componenteId: componente_id,
    acao,
    instanciaId:  instancia_id ?? null,
    createdAt:    new Date().toISOString(),
  }).returning()

  return c.json(row, 201)
})

/**
 * DELETE /api/permissions
 * Body: { entidade_tipo, entidade_id, componente_id, acao }
 * Remove a permissão correspondente.
 */
app.delete('/api/permissions', async (c) => {
  const body = await c.req.json()
  const { entidade_tipo, entidade_id, componente_id, acao, instancia_id } = body

  if (!entidade_tipo || !entidade_id || !componente_id || !acao) {
    return c.json({ error: 'entidade_tipo, entidade_id, componente_id e acao são obrigatórios' }, 400)
  }

  const conditions = [
    eq(componentPermissions.entidadeTipo, entidade_tipo),
    eq(componentPermissions.entidadeId,   entidade_id),
    eq(componentPermissions.componenteId, componente_id),
    eq(componentPermissions.acao,         acao),
    instancia_id
      ? eq(componentPermissions.instanciaId, instancia_id)
      : eq(componentPermissions.instanciaId, null as any),
  ]
  await db.delete(componentPermissions).where(and(...conditions))

  return c.json({ ok: true })
})

// ── Entitlements ─────────────────────────────────────────────
//
// Equivale à tupla FGA: account:<id> enabled_for_tenant capability:<cap>
// Regra de decisão: allow = permission AND entitlement

/**
 * GET /api/accounts/:id/entitlements
 * Retorna as capabilities ativas para a conta.
 */
app.get('/api/accounts/:id/entitlements', async (c) => {
  const accountId = c.req.param('id')
  const rows = await db
    .select()
    .from(accountEntitlements)
    .where(eq(accountEntitlements.accountId, accountId))
  return c.json(rows)
})

/**
 * POST /api/accounts/:id/entitlements
 * Body: { capability: string }
 * Ativa uma capability para a conta. Idempotente — ignora se já existir.
 */
app.post('/api/accounts/:id/entitlements', async (c) => {
  const accountId = c.req.param('id')
  const { capability } = await c.req.json()

  if (!capability) return c.json({ error: 'capability é obrigatório' }, 400)

  // Verifica se já existe (idempotente)
  const [existing] = await db
    .select()
    .from(accountEntitlements)
    .where(
      and(
        eq(accountEntitlements.accountId, accountId),
        eq(accountEntitlements.capability, capability),
      )
    )
  if (existing) return c.json(existing, 200)

  const [row] = await db
    .insert(accountEntitlements)
    .values({
      id:         crypto.randomUUID(),
      accountId,
      capability,
      enabledAt:  new Date().toISOString(),
    })
    .returning()

  return c.json(row, 201)
})

/**
 * DELETE /api/accounts/:id/entitlements/:capability
 * Desativa uma capability para a conta.
 */
app.delete('/api/accounts/:id/entitlements/:capability', async (c) => {
  const accountId  = c.req.param('id')
  const capability = c.req.param('capability')

  await db
    .delete(accountEntitlements)
    .where(
      and(
        eq(accountEntitlements.accountId, accountId),
        eq(accountEntitlements.capability, capability),
      )
    )

  return c.json({ ok: true })
})

// ── Instâncias de Componente ──────────────────────────────────

/**
 * GET /api/instancias
 * Query params: componenteId, accountId (opcionais, combináveis)
 * Retorna instâncias + qtdMembros enriquecido.
 */
app.get('/api/instancias', async (c) => {
  const { componenteId, accountId } = c.req.query()
  let rows = await db.select().from(instancias)
  if (componenteId) rows = rows.filter((r: any) => r.componenteId === componenteId)
  if (accountId)    rows = rows.filter((r: any) => r.accountId    === accountId)

  const allMembros = await db.select().from(instanciaMembros)
  const result = rows.map((inst: any) => ({
    ...inst,
    qtdMembros: allMembros.filter((m: any) => m.instanciaId === inst.id).length,
  }))
  return c.json(result)
})

/**
 * GET /api/instancias/:id
 */
app.get('/api/instancias/:id', async (c) => {
  const id = c.req.param('id')
  const rows = await db.select().from(instancias).where(eq(instancias.id, id))
  if (!rows.length) return c.json({ error: 'Instância não encontrada' }, 404)
  return c.json(rows[0])
})

/**
 * POST /api/instancias
 * Body: { componenteId, accountId, nome, descricao? }
 */
app.post('/api/instancias', async (c) => {
  const body = await c.req.json()
  const { componenteId, accountId, nome, descricao } = body
  if (!componenteId || !accountId || !nome) {
    return c.json({ error: 'componenteId, accountId e nome são obrigatórios' }, 400)
  }
  const [row] = await db.insert(instancias).values({
    id:           crypto.randomUUID(),
    componenteId,
    accountId,
    nome,
    descricao:    descricao ?? null,
    status:       'Ativo',
    createdAt:    new Date().toLocaleDateString('pt-BR'),
  }).returning()
  return c.json(row, 201)
})

/**
 * PUT /api/instancias/:id
 * Body: { nome?, descricao?, status?, restringirAcesso? }
 */
app.put('/api/instancias/:id', async (c) => {
  const id   = c.req.param('id')
  const body = await c.req.json()
  const updates: Record<string, any> = {}
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.descricao !== undefined) updates.descricao = body.descricao
  if (body.status !== undefined) updates.status = body.status
  if (body.restringirAcesso !== undefined) updates.restringirAcesso = body.restringirAcesso
  const [row] = await db
    .update(instancias)
    .set(updates)
    .where(eq(instancias.id, id))
    .returning()
  return c.json(row)
})

/**
 * DELETE /api/instancias/:id
 * Exclui instância — membros são removidos por CASCADE no DB.
 */
app.delete('/api/instancias/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(instancias).where(eq(instancias.id, id))
  return c.json({ ok: true })
})

// ── Membros de Instância ──────────────────────────────────────

/**
 * GET /api/instancias/:id/membros
 * Retorna membros enriquecidos com displayName e email.
 */
app.get('/api/instancias/:id/membros', async (c) => {
  const instanciaId = c.req.param('id')
  const membros = await db
    .select()
    .from(instanciaMembros)
    .where(eq(instanciaMembros.instanciaId, instanciaId))

  if (!membros.length) return c.json([])

  const allUsers  = await db.select().from(users)
  const allGrupos = await db.select().from(grupos)

  const enriched = membros.map((m: any) => {
    if (m.entidadeTipo === 'user') {
      const u = allUsers.find((u: any) => u.id === m.entidadeId)
      return { ...m, displayName: u?.nomeCompleto ?? m.entidadeId, email: u?.email }
    } else {
      const g = allGrupos.find((g: any) => g.id === m.entidadeId)
      return { ...m, displayName: g?.nome ?? m.entidadeId }
    }
  })
  return c.json(enriched)
})

/**
 * POST /api/instancias/:id/membros
 * Body: { entidadeTipo: 'user'|'group', entidadeId, papel: 'viewer'|'member'|'admin' }
 * Upsert: atualiza papel se o membro já existir.
 */
app.post('/api/instancias/:id/membros', async (c) => {
  const instanciaId  = c.req.param('id')
  const body         = await c.req.json()
  const { entidadeTipo, entidadeId, papel } = body

  if (!entidadeTipo || !entidadeId || !papel) {
    return c.json({ error: 'entidadeTipo, entidadeId e papel são obrigatórios' }, 400)
  }

  // Verifica se já é membro
  const existing = await db.select().from(instanciaMembros).where(
    and(
      eq(instanciaMembros.instanciaId,  instanciaId),
      eq(instanciaMembros.entidadeTipo, entidadeTipo),
      eq(instanciaMembros.entidadeId,   entidadeId),
    )
  )

  if (existing.length > 0) {
    const [row] = await db
      .update(instanciaMembros)
      .set({ papel })
      .where(eq(instanciaMembros.id, existing[0].id))
      .returning()
    return c.json(row)
  }

  const [row] = await db.insert(instanciaMembros).values({
    id:           crypto.randomUUID(),
    instanciaId,
    entidadeTipo,
    entidadeId,
    papel,
    assignedAt:   new Date().toLocaleDateString('pt-BR'),
  }).returning()

  // TODO (produção): await fga.write({ user: `${entidadeTipo}:${entidadeId}`, relation: papel, object: `instance:${instanciaId}` })

  return c.json(row, 201)
})

/**
 * PUT /api/instancias/:id/membros/:membroId
 * Body: { papel: string }
 * Atualiza o papel de um membro existente.
 */
app.put('/api/instancias/:id/membros/:membroId', async (c) => {
  const instanciaId = c.req.param('id')
  const membroId    = c.req.param('membroId')
  const body        = await c.req.json()
  const { papel }   = body
  if (!papel) return c.json({ error: 'papel é obrigatório' }, 400)
  const [row] = await db
    .update(instanciaMembros)
    .set({ papel })
    .where(and(eq(instanciaMembros.id, membroId), eq(instanciaMembros.instanciaId, instanciaId)))
    .returning()
  if (!row) return c.json({ error: 'Membro não encontrado' }, 404)
  return c.json(row)
})

/**
 * DELETE /api/instancias/:id/membros/:membroId
 * membroId = id da linha em instancia_membros (não o entidadeId).
 */
app.delete('/api/instancias/:id/membros/:membroId', async (c) => {
  const membroId = c.req.param('membroId')
  await db.delete(instanciaMembros).where(eq(instanciaMembros.id, membroId))
  return c.json({ ok: true })
})

// ── Atribuições por Componente ────────────────────────────────

app.get('/api/componentes/:id/atribuicoes', async (c) => {
  const { id } = c.req.param()
  const rows = await db.select().from(componenteAtribuicoes)
    .where(eq(componenteAtribuicoes.componenteId, id))
  return c.json(rows)
})

app.post('/api/componentes/:id/atribuicoes', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const nova = {
    id: crypto.randomUUID(),
    componenteId: id,
    nome: body.nome,
    descricao: body.descricao ?? null,
    modulo: body.modulo ?? null,
    status: 'Ativo',
    createdAt: new Date().toISOString(),
  }
  await db.insert(componenteAtribuicoes).values(nova)
  return c.json(nova, 201)
})

app.put('/api/componentes/:id/atribuicoes/:atribuicaoId', async (c) => {
  const { atribuicaoId } = c.req.param()
  const body = await c.req.json()
  const updates: Record<string, any> = {}
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.descricao !== undefined) updates.descricao = body.descricao
  if (body.modulo !== undefined) updates.modulo = body.modulo
  if (body.status !== undefined) updates.status = body.status
  await db.update(componenteAtribuicoes).set(updates).where(eq(componenteAtribuicoes.id, atribuicaoId))
  const [updated] = await db.select().from(componenteAtribuicoes).where(eq(componenteAtribuicoes.id, atribuicaoId))
  return c.json(updated)
})

app.delete('/api/componentes/:id/atribuicoes/:atribuicaoId', async (c) => {
  const { atribuicaoId } = c.req.param()
  await db.delete(componenteAtribuicoes).where(eq(componenteAtribuicoes.id, atribuicaoId))
  return c.json({ success: true })
})

// ── Fases por Instância ───────────────────────────────────────

app.get('/api/instancias/:id/fases', async (c) => {
  const { id } = c.req.param()
  const rows = await db.select().from(instanciaFases)
    .where(eq(instanciaFases.instanciaId, id))
    .orderBy(instanciaFases.ordem)
  return c.json(rows)
})

app.post('/api/instancias/:id/fases', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const nova = {
    id: crypto.randomUUID(),
    instanciaId: id,
    nome: body.nome,
    ordem: body.ordem ?? 0,
    descricao: body.descricao ?? null,
    createdAt: new Date().toISOString(),
  }
  await db.insert(instanciaFases).values(nova)
  return c.json(nova, 201)
})

app.put('/api/instancias/:id/fases/:faseId', async (c) => {
  const { faseId } = c.req.param()
  const body = await c.req.json()
  const updates: Record<string, any> = {}
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.ordem !== undefined) updates.ordem = body.ordem
  if (body.descricao !== undefined) updates.descricao = body.descricao
  if (body.modoAprovacao !== undefined) updates.modoAprovacao = body.modoAprovacao
  if (body.regraAprovacao !== undefined) updates.regraAprovacao = body.regraAprovacao
  await db.update(instanciaFases).set(updates).where(eq(instanciaFases.id, faseId))
  const [updated] = await db.select().from(instanciaFases).where(eq(instanciaFases.id, faseId))
  return c.json(updated)
})

app.delete('/api/instancias/:id/fases/:faseId', async (c) => {
  const { faseId } = c.req.param()
  await db.delete(faseResponsaveis).where(eq(faseResponsaveis.faseId, faseId))
  await db.delete(instanciaFases).where(eq(instanciaFases.id, faseId))
  return c.json({ success: true })
})

// ── Responsáveis por Fase ─────────────────────────────────────

app.get('/api/instancias/:id/fases/:faseId/responsaveis', async (c) => {
  const { faseId } = c.req.param()
  const rows = await db.select().from(faseResponsaveis)
    .where(eq(faseResponsaveis.faseId, faseId))
  return c.json(rows)
})

app.post('/api/instancias/:id/fases/:faseId/responsaveis', async (c) => {
  const { faseId } = c.req.param()
  const body = await c.req.json()
  const novo = {
    id: crypto.randomUUID(),
    faseId,
    tipoResponsavel: body.tipoResponsavel,
    entidadeId: body.entidadeId,
    createdAt: new Date().toISOString(),
  }
  await db.insert(faseResponsaveis).values(novo)
  return c.json(novo, 201)
})

app.delete('/api/instancias/:id/fases/:faseId/responsaveis/:responsavelId', async (c) => {
  const { responsavelId } = c.req.param()
  await db.delete(faseResponsaveis).where(eq(faseResponsaveis.id, responsavelId))
  return c.json({ success: true })
})

// ── Atribuições Permitidas por Fase ───────────────────────────

app.get('/api/instancias/:id/fases/:faseId/atribuicoes-permitidas', async (c) => {
  const { faseId } = c.req.param()
  const rows = await db.select().from(faseAtribuicoesPermitidas)
    .where(eq(faseAtribuicoesPermitidas.faseId, faseId))
  return c.json(rows)
})

app.post('/api/instancias/:id/fases/:faseId/atribuicoes-permitidas', async (c) => {
  const { faseId } = c.req.param()
  const body = await c.req.json()
  const novo = {
    id: crypto.randomUUID(),
    faseId,
    atribuicaoId: body.atribuicaoId,
    createdAt: new Date().toISOString(),
  }
  await db.insert(faseAtribuicoesPermitidas).values(novo)
  return c.json(novo, 201)
})

app.delete('/api/instancias/:id/fases/:faseId/atribuicoes-permitidas/:atribuicaoId', async (c) => {
  const { faseId, atribuicaoId } = c.req.param()
  await db.delete(faseAtribuicoesPermitidas)
    .where(and(
      eq(faseAtribuicoesPermitidas.faseId, faseId),
      eq(faseAtribuicoesPermitidas.atribuicaoId, atribuicaoId),
    ))
  return c.json({ success: true })
})

// ── Slots de Perfil por Instância ─────────────────────────────

app.get('/api/instancias/:id/perfil-slots', async (c) => {
  const { id } = c.req.param()
  const rows = await db.select().from(instanciaPerfilSlots)
    .where(eq(instanciaPerfilSlots.instanciaId, id))
    .orderBy(instanciaPerfilSlots.ordem)

  if (rows.length === 0) return c.json([])

  const slotIds = rows.map(r => r.id)
  const nomeacoes = await db.select().from(instanciaPerfilSlotNomeacoes)
    .where(inArray(instanciaPerfilSlotNomeacoes.slotId, slotIds))

  const userIds = nomeacoes.filter(n => n.entidadeTipo === 'user').map(n => n.entidadeId)
  const grupoIds = nomeacoes.filter(n => n.entidadeTipo === 'group').map(n => n.entidadeId)
  const [userRows, grupoRows] = await Promise.all([
    userIds.length ? db.select().from(users).where(inArray(users.id, userIds)) : Promise.resolve([]),
    grupoIds.length ? db.select().from(grupos).where(inArray(grupos.id, grupoIds)) : Promise.resolve([]),
  ])
  const userNames = new Map(userRows.map(u => [u.id, u.nomeCompleto]))
  const grupoNames = new Map(grupoRows.map(g => [g.id, g.nome]))

  const nomeacoesBySlot = new Map<string, typeof nomeacoes>()
  for (const n of nomeacoes) {
    if (!nomeacoesBySlot.has(n.slotId)) nomeacoesBySlot.set(n.slotId, [])
    nomeacoesBySlot.get(n.slotId)!.push(n)
  }

  const enriched = rows.map(slot => ({
    ...slot,
    nomeacoes: (nomeacoesBySlot.get(slot.id) ?? []).map(n => ({
      ...n,
      displayName: n.entidadeTipo === 'user'
        ? userNames.get(n.entidadeId) ?? n.entidadeId
        : grupoNames.get(n.entidadeId) ?? n.entidadeId,
    })),
  }))
  return c.json(enriched)
})

/** Elegíveis para nomear em slot (filtro por atribuição — DocNix) */
app.get('/api/instancias/:id/elegiveis-slot', async (c) => {
  const { id } = c.req.param()
  const atribuicaoId = c.req.query('atribuicaoId') || null
  const result = await getElegiveisParaSlot(db, id, atribuicaoId)
  return c.json(result)
})

app.post('/api/instancias/:id/perfil-slots', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const novo = {
    id: crypto.randomUUID(),
    instanciaId: id,
    slotNome: body.slotNome,
    atribuicaoFiltroId: body.atribuicaoFiltroId ?? null,
    obrigatorio: body.obrigatorio ?? false,
    ordem: body.ordem ?? 0,
    createdAt: new Date().toISOString(),
  }
  await db.insert(instanciaPerfilSlots).values(novo)
  return c.json(novo, 201)
})

app.put('/api/instancias/:id/perfil-slots/:slotId', async (c) => {
  const { slotId } = c.req.param()
  const body = await c.req.json()
  const updates: Record<string, any> = {}
  if (body.slotNome !== undefined) updates.slotNome = body.slotNome
  if (body.atribuicaoFiltroId !== undefined) updates.atribuicaoFiltroId = body.atribuicaoFiltroId || null
  if (body.obrigatorio !== undefined) updates.obrigatorio = body.obrigatorio
  if (body.ordem !== undefined) updates.ordem = body.ordem
  await db.update(instanciaPerfilSlots).set(updates).where(eq(instanciaPerfilSlots.id, slotId))
  const [updated] = await db.select().from(instanciaPerfilSlots).where(eq(instanciaPerfilSlots.id, slotId))
  return c.json(updated)
})

app.delete('/api/instancias/:id/perfil-slots/:slotId', async (c) => {
  const { slotId } = c.req.param()
  await db.delete(instanciaPerfilSlotNomeacoes).where(eq(instanciaPerfilSlotNomeacoes.slotId, slotId))
  await db.delete(instanciaPerfilSlots).where(eq(instanciaPerfilSlots.id, slotId))
  return c.json({ success: true })
})

app.post('/api/instancias/:id/perfil-slots/:slotId/nomeacoes', async (c) => {
  const { slotId } = c.req.param()
  const body = await c.req.json()
  const { entidadeTipo, entidadeId } = body
  if (!entidadeTipo || !entidadeId) {
    return c.json({ error: 'entidadeTipo e entidadeId são obrigatórios' }, 400)
  }

  const [slot] = await db.select().from(instanciaPerfilSlots).where(eq(instanciaPerfilSlots.id, slotId))
  if (!slot) return c.json({ error: 'Slot não encontrado' }, 404)

  const elegiveis = await getElegiveisParaSlot(db, slot.instanciaId, slot.atribuicaoFiltroId ?? null)
  const pool = entidadeTipo === 'user' ? elegiveis.usuarios : elegiveis.grupos
  if (!pool.some(e => e.id === entidadeId)) {
    return c.json({
      error: 'Entidade não elegível para este slot (sem a atribuição exigida na instância)',
    }, 403)
  }

  const existentes = await db.select().from(instanciaPerfilSlotNomeacoes)
    .where(eq(instanciaPerfilSlotNomeacoes.slotId, slotId))
  if (existentes.some(n => n.entidadeTipo === entidadeTipo && n.entidadeId === entidadeId)) {
    return c.json({ error: 'Já nomeado neste slot' }, 409)
  }

  const novo = {
    id: crypto.randomUUID(),
    slotId,
    entidadeTipo,
    entidadeId,
    createdAt: new Date().toISOString(),
  }
  await db.insert(instanciaPerfilSlotNomeacoes).values(novo)
  return c.json(novo, 201)
})

app.delete('/api/instancias/:id/perfil-slots/:slotId/nomeacoes/:nomeacaoId', async (c) => {
  const { nomeacaoId } = c.req.param()
  await db.delete(instanciaPerfilSlotNomeacoes).where(eq(instanciaPerfilSlotNomeacoes.id, nomeacaoId))
  return c.json({ success: true })
})

// ── Atribuições em Membros de Instância ───────────────────────

app.get('/api/instancias/:id/membros/:membroId/atribuicoes', async (c) => {
  const { membroId } = c.req.param()
  const rows = await db.select().from(instanciaMembroAtribuicoes)
    .where(eq(instanciaMembroAtribuicoes.membroId, membroId))
  return c.json(rows)
})

app.post('/api/instancias/:id/membros/:membroId/atribuicoes', async (c) => {
  const { membroId } = c.req.param()
  const body = await c.req.json()
  const novo = {
    id: crypto.randomUUID(),
    membroId,
    atribuicaoId: body.atribuicaoId,
    assignedAt: new Date().toISOString(),
  }
  await db.insert(instanciaMembroAtribuicoes).values(novo)
  return c.json(novo, 201)
})

app.delete('/api/instancias/:id/membros/:membroId/atribuicoes/:atribuicaoId', async (c) => {
  const { membroId, atribuicaoId } = c.req.param()
  await db.delete(instanciaMembroAtribuicoes)
    .where(
      and(
        eq(instanciaMembroAtribuicoes.membroId, membroId),
        eq(instanciaMembroAtribuicoes.atribuicaoId, atribuicaoId)
      )
    )
  return c.json({ success: true })
})

// ── Permissões Efetivas ───────────────────────────────────────

app.get('/api/instancias/:id/permissoes-efetivas', async (c) => {
  const { id: instanceId } = c.req.param()
  const userId = c.req.query('userId')
  if (!userId) return c.json({ error: 'userId é obrigatório' }, 400)

  // Buscar membros da instância para este usuário (direto)
  const membros = await db.select().from(instanciaMembros)
    .where(
      and(
        eq(instanciaMembros.instanciaId, instanceId),
        eq(instanciaMembros.entidadeTipo, 'user'),
        eq(instanciaMembros.entidadeId, userId)
      )
    )

  // Buscar grupos do usuário
  const userGrupos = await db.select().from(usuarioGrupos)
    .where(eq(usuarioGrupos.userId, userId))
  const grupoIds = userGrupos.map((g: any) => g.grupoId)

  // Buscar membros do tipo grupo para esta instância
  const membrosGrupo = grupoIds.length > 0
    ? await db.select().from(instanciaMembros)
        .where(
          and(
            eq(instanciaMembros.instanciaId, instanceId),
            eq(instanciaMembros.entidadeTipo, 'group')
          )
        )
    : []

  const membroGrupoFiltrado = membrosGrupo.filter((m: any) => grupoIds.includes(m.entidadeId))

  // Coletar todos os membroIds relevantes
  const membroIds = [
    ...membros.map((m: any) => ({ id: m.id, fonte: 'direto' as const, entidadeId: userId })),
    ...membroGrupoFiltrado.map((m: any) => ({ id: m.id, fonte: 'grupo' as const, entidadeId: m.entidadeId })),
  ]

  // Buscar atribuições de cada membro
  const fontes: { atribuicaoId: string; fonte: string; entidadeId: string }[] = []

  for (const membro of membroIds) {
    const atribs = await db.select().from(instanciaMembroAtribuicoes)
      .where(eq(instanciaMembroAtribuicoes.membroId, membro.id))
    for (const a of atribs) {
      fontes.push({ atribuicaoId: a.atribuicaoId, fonte: membro.fonte, entidadeId: membro.entidadeId })
    }
  }

  const atribuicoes = [...new Set(fontes.map((f) => f.atribuicaoId))]
  return c.json({ atribuicoes, fontes })
})

// ── Start ─────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log('API server running on http://localhost:3001')

  // ── Warm-up do Neon ──────────────────────────────────────────
  // O Neon (free tier) hiberna após inatividade. Este ping garante que
  // o banco já está acordado quando o primeiro usuário abre a aplicação,
  // eliminando o delay de cold start (~5-10s) na primeira requisição.
  db.select().from(organizations).limit(1)
    .then(() => console.log('✅ Neon DB aquecido e pronto'))
    .catch(() => {
      // Falha silenciosa — o banco tentará reconectar na próxima query
      console.warn('⚠️  Neon DB warm-up falhou — banco ainda acordando...')
      // Tenta de novo após 5s
      setTimeout(() => {
        db.select().from(organizations).limit(1)
          .then(() => console.log('✅ Neon DB aquecido (2ª tentativa)'))
          .catch(() => console.warn('⚠️  Neon DB ainda não disponível'))
      }, 5000)
    })
})
