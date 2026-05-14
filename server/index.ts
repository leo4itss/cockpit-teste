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
} from './schema'
import { eq, and } from 'drizzle-orm'

const app = new Hono()

app.use('*', cors({ origin: 'http://localhost:5173' }))

// ── Organizations ────────────────────────────────────────────

app.get('/api/organizations', async (c) => {
  const rows = await db.select().from(organizations)
  return c.json(rows)
})

app.get('/api/organizations/:id', async (c) => {
  const [row] = await db.select().from(organizations).where(eq(organizations.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
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

app.get('/api/users/:id', async (c) => {
  const [row] = await db.select().from(users).where(eq(users.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/api/users', async (c) => {
  const body = await c.req.json()
  const [row] = await db.insert(users).values(body).returning()
  return c.json(row, 201)
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

  // Busca todos os grupos (filtro aplicado em memória para simplicidade no PoC)
  const rows = await db.select().from(grupos)

  const filtered = rows.filter((g: any) => {
    if (orgId && accountId) return g.orgId === orgId || g.accountId === accountId
    if (orgId)              return g.orgId === orgId
    if (accountId)          return g.accountId === accountId
    return true
  })

  // Enriquece com qtdMembros
  const membros = await db.select().from(usuarioGrupos)
  const result = filtered.map((g: any) => ({
    ...g,
    qtdMembros: membros.filter((m: any) => m.grupoId === g.id).length,
  }))

  return c.json(result)
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
  const id = body.id ?? crypto.randomUUID()
  const createdAt = new Date().toLocaleDateString('pt-BR')

  const [row] = await db.insert(grupos).values({
    id,
    nome: body.nome,
    descricao: body.descricao ?? null,
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
  const body = await c.req.json()
  const [row] = await db
    .update(grupos)
    .set({ nome: body.nome, descricao: body.descricao, status: body.status })
    .where(eq(grupos.id, c.req.param('id')))
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

// ── Start ─────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log('API server running on http://localhost:3001')
})
