import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, isNull, and, inArray, or } from 'drizzle-orm'
import * as schema from '../server/schema.js'

export const config = { runtime: 'edge' }

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

const {
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
  accountEntitlements,
  componentPermissions,
  instancias,
  instanciaMembros,
  componenteAtribuicoes,
  instanciaMembroAtribuicoes,
  instanciaFases,
  faseResponsaveis,
  instanciaPerfilSlots,
} = schema

const app = new Hono().basePath('/api')

app.use('*', cors())

app.onError((err, c) => {
  console.error('[API Error]', err.message, err.stack)
  return c.json({ error: err.message }, 500)
})

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }))
app.get('/db-test', async (c) => {
  try {
    const result = await sql`SELECT 1 AS n`
    return c.json({ ok: true, result })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500)
  }
})

// ── Organizations ─────────────────────────────────────────────
app.get('/organizations', async (c) => c.json(await db.select().from(organizations)))
app.get('/organizations/:id', async (c) => {
  const [row] = await db.select().from(organizations).where(eq(organizations.id, c.req.param('id')))
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.post('/organizations', async (c) => {
  const body = await c.req.json()
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
    await db.delete(organizations).where(eq(organizations.id, org.id))
    throw err
  }
  return c.json(org, 201)
})
app.put('/organizations/:id', async (c) => {
  const [row] = await db.update(organizations).set(await c.req.json()).where(eq(organizations.id, c.req.param('id'))).returning()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.delete('/organizations/:id', async (c) => {
  const id = c.req.param('id')
  const [orgAccounts, orgContracts] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.orgId, id)),
    db.select().from(contracts).where(eq(contracts.orgId, id)),
  ])
  const activeAccounts = orgAccounts.filter((a: any) => a.status !== 'Excluído')
  const activeContracts = orgContracts.filter((ct: any) => ct.status === 'Ativo')
  if (activeAccounts.length > 0 || activeContracts.length > 0) {
    return c.json({ error: 'dependencies', activeAccounts: activeAccounts.length, activeContracts: activeContracts.length }, 422)
  }
  await db.delete(accounts).where(eq(accounts.orgId, id))
  await db.delete(contracts).where(eq(contracts.orgId, id))
  await db.delete(solutions).where(eq(solutions.orgId, id))
  await db.delete(organizations).where(eq(organizations.id, id))
  return c.json({ ok: true })
})

// ── Accounts ──────────────────────────────────────────────────
app.get('/accounts', async (c) => {
  const orgId = c.req.query('orgId')
  const includeDeleted = c.req.query('include_deleted') === 'true'
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
app.get('/accounts/:id', async (c) => {
  const [row] = await db.select().from(accounts).where(eq(accounts.id, c.req.param('id')))
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.post('/accounts', async (c) => {
  const [row] = await db.insert(accounts).values(await c.req.json()).returning()
  return c.json(row, 201)
})
app.put('/accounts/:id', async (c) => {
  const [row] = await db.update(accounts).set(await c.req.json()).where(eq(accounts.id, c.req.param('id'))).returning()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.delete('/accounts/:id', async (c) => {
  const [row] = await db
    .update(accounts)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(accounts.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})
app.patch('/accounts/:id/restaurar', async (c) => {
  const [row] = await db
    .update(accounts)
    .set({ deletedAt: null })
    .where(eq(accounts.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

// ── Solutions ─────────────────────────────────────────────────
app.get('/solutions', async (c) => {
  const orgId = c.req.query('orgId')
  const rows = orgId
    ? await db.select().from(solutions).where(eq(solutions.orgId, orgId))
    : await db.select().from(solutions)
  return c.json(rows)
})
app.get('/solutions/:id', async (c) => {
  const [row] = await db.select().from(solutions).where(eq(solutions.id, c.req.param('id')))
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.post('/solutions', async (c) => {
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
app.put('/solutions/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

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
  // novas versões 'ativo'. Versões inativas são preservadas como histórico.
  const existingPlansArr: any[] = (existing.plans as any[]) ?? []
  const incomingPlansArr: any[] = body.plans ?? []

  const existingInactive = existingPlansArr.filter((p: any) => p.statusVersao === 'inativo')
  const existingActive   = existingPlansArr.filter((p: any) => !p.statusVersao || p.statusVersao === 'ativo')

  function stripMeta({ versao: _v, statusVersao: _s, criadoEm: _c, ...rest }: any) {
    return rest
  }

  // Detecta se algum plano EXISTENTE (não novo) teve conteúdo alterado
  const plansChanged = incomingPlansArr.some((incoming: any) => {
    const active = existingActive.find((p: any) => p.name === incoming.name)
    if (!active) return false
    return JSON.stringify(stripMeta(active)) !== JSON.stringify(stripMeta(incoming))
  })

  const versionLog: string[] = [`plansChanged=${plansChanged}`]

  // Constrói array final com versionamento
  const resultPlans: any[] = [...existingInactive]

  for (const incoming of incomingPlansArr) {
    const currentActive = existingActive.find((p: any) => p.name === incoming.name)

    if (!currentActive) {
      resultPlans.push({ ...incoming, versao: 1, statusVersao: 'ativo', criadoEm: new Date().toISOString() })
    } else {
      const contentChanged = JSON.stringify(stripMeta(currentActive)) !== JSON.stringify(stripMeta(incoming))
      if (contentChanged) {
        resultPlans.push({ ...currentActive, statusVersao: 'inativo' })
        resultPlans.push({
          ...incoming,
          versao: (currentActive.versao ?? 1) + 1,
          statusVersao: 'ativo',
          criadoEm: new Date().toISOString(),
        })
        versionLog.push(`plan v${(currentActive.versao ?? 1) + 1}: ${incoming.name}`)
      } else {
        resultPlans.push(currentActive)
      }
    }
  }

  // Planos ativos removidos pelo usuário → marcar inativo (preservar histórico)
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
app.delete('/solutions/:id', async (c) => {
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
app.get('/contracts', async (c) => {
  const orgId = c.req.query('orgId')
  const rows = orgId
    ? await db.select().from(contracts).where(eq(contracts.orgId, orgId))
    : await db.select().from(contracts)
  return c.json(rows)
})
app.get('/contracts/:id', async (c) => {
  const [row] = await db.select().from(contracts).where(eq(contracts.id, c.req.param('id')))
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.post('/contracts', async (c) => {
  const [row] = await db.insert(contracts).values(await c.req.json()).returning()
  return c.json(row, 201)
})
app.put('/contracts/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  // Busca o contrato atual para snapshot antes de sobrescrever
  const [existing] = await db.select().from(contracts).where(eq(contracts.id, id))
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const [row] = await db.update(contracts).set(body).where(eq(contracts.id, id)).returning()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.delete('/contracts/:id', async (c) => {
  await db.delete(contracts).where(eq(contracts.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── Users ─────────────────────────────────────────────────────
app.get('/users', async (c) => c.json(await db.select().from(users)))
app.get('/users/cargos-distintos', async (c) => {
  const rows = await db.selectDistinct({ cargo: users.cargo }).from(users)
  const cargos = rows.map((r: any) => r.cargo).filter(Boolean).sort()
  return c.json(cargos)
})

app.get('/users/areas-distintas', async (c) => {
  const rows = await db.selectDistinct({ area: users.area }).from(users)
  const areas = rows.map((r: any) => r.area).filter(Boolean).sort()
  return c.json(areas)
})

app.get('/users/:id', async (c) => {
  const [row] = await db.select().from(users).where(eq(users.id, c.req.param('id')))
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.post('/users', async (c) => {
  const [row] = await db.insert(users).values(await c.req.json()).returning()
  return c.json(row, 201)
})
app.put('/users/:id', async (c) => {
  const [row] = await db.update(users).set(await c.req.json()).where(eq(users.id, c.req.param('id'))).returning()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.delete('/users/:id', async (c) => {
  await db.delete(users).where(eq(users.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── Tipos de Licença ──────────────────────────────────────────
app.get('/tipos-licenca', async (c) => c.json(await db.select().from(tiposLicenca)))
app.get('/tipos-licenca/:id', async (c) => {
  const [row] = await db.select().from(tiposLicenca).where(eq(tiposLicenca.id, c.req.param('id')))
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.post('/tipos-licenca', async (c) => {
  const [row] = await db.insert(tiposLicenca).values(await c.req.json()).returning()
  return c.json(row, 201)
})
app.put('/tipos-licenca/:id', async (c) => {
  const [row] = await db.update(tiposLicenca).set(await c.req.json()).where(eq(tiposLicenca.id, c.req.param('id'))).returning()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.delete('/tipos-licenca/:id', async (c) => {
  await db.delete(tiposLicenca).where(eq(tiposLicenca.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── Componentes ───────────────────────────────────────────────
app.get('/componentes', async (c) => {
  const includeInactive = c.req.query('include_inactive') === 'true'
  const rows = await db.select().from(componentes)
  const filtered = includeInactive ? rows : rows.filter((r: any) => r.status !== 'Inativo')
  return c.json(filtered)
})
app.get('/componentes/:id/linked', async (c) => {
  const id = c.req.param('id')
  const allSolutions = await db.select().from(solutions)
  const linked = allSolutions.some((sol: any) =>
    Array.isArray(sol.componenteIds) && sol.componenteIds.includes(id)
  )
  return c.json({ linked })
})

app.get('/componentes/:id', async (c) => {
  const [row] = await db.select().from(componentes).where(eq(componentes.id, c.req.param('id')))
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.post('/componentes', async (c) => {
  const [row] = await db.insert(componentes).values(await c.req.json()).returning()
  return c.json(row, 201)
})
app.put('/componentes/:id', async (c) => {
  const [row] = await db.update(componentes).set(await c.req.json()).where(eq(componentes.id, c.req.param('id'))).returning()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.delete('/componentes/:id', async (c) => {
  const id = c.req.param('id')
  const [comp] = await db.select().from(componentes).where(eq(componentes.id, id))
  if (!comp) return c.json({ error: 'Not found' }, 404)

  // Verifica se há soluções com este componente vinculado
  const allSolutions = await db.select().from(solutions)
  const linked = allSolutions.some((sol: any) =>
    Array.isArray(sol.componenteIds) && sol.componenteIds.includes(id)
  )

  if (linked) {
    const [row] = await db.update(componentes)
      .set({ status: 'Inativo' })
      .where(eq(componentes.id, id))
      .returning()
    return c.json({ ok: true, action: 'inativado', componente: row })
  }

  await db.delete(componentes).where(eq(componentes.id, id))
  return c.json({ ok: true, action: 'excluido' })
})
app.patch('/componentes/:id/reativar', async (c) => {
  const [row] = await db.update(componentes)
    .set({ status: 'Ativo' })
    .where(eq(componentes.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})
app.post('/componentes/validate-metadata', async (c) => {
  const { url } = await c.req.json() as { url: string }
  if (!url || typeof url !== 'string') return c.json({ ok: false, error: 'URL inválida' }, 400)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return c.json({ ok: false, error: `Servidor retornou status ${res.status}` })
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

// ── Users/:id/grupos ─────────────────────────────────────────
app.get('/users/:id/grupos', async (c) => {
  const userId    = c.req.param('id')
  const accountId = c.req.query('accountId')
  const links = await db.select().from(usuarioGrupos).where(eq(usuarioGrupos.userId, userId))
  const grupoIds = links.map((l: any) => l.grupoId)
  if (!grupoIds.length) return c.json([])
  const rows = await db.select().from(grupos).where(inArray(grupos.id, grupoIds))
  const filtered = accountId
    ? rows.filter((g: any) => g.accountId === accountId || g.accountId === null)
    : rows
  return c.json(filtered)
})

// ── Grupos ────────────────────────────────────────────────────
app.get('/grupos', async (c) => {
  const { orgId, accountId } = c.req.query()
  const [rows, allAccounts] = await Promise.all([
    db.select().from(grupos),
    db.select().from(accounts),
  ])
  const filtered = rows.filter((g: any) => {
    if (orgId && accountId) return g.orgId === orgId || g.accountId === accountId
    if (orgId) {
      const orgAccountIds = allAccounts.filter((a: any) => a.orgId === orgId).map((a: any) => a.id)
      return g.orgId === orgId || orgAccountIds.includes(g.accountId)
    }
    if (accountId) {
      const account = allAccounts.find((a: any) => a.id === accountId)
      const orgIdDaConta = account?.orgId
      return g.accountId === accountId || (orgIdDaConta && g.orgId === orgIdDaConta)
    }
    return true
  })
  const membros = await db.select().from(usuarioGrupos)
  const result = filtered.map((g: any) => ({
    ...g,
    qtdMembros: membros.filter((m: any) => m.grupoId === g.id).length,
  }))
  return c.json(result)
})

app.get('/grupos/:id', async (c) => {
  const [row] = await db.select().from(grupos).where(eq(grupos.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  const membros = await db.select().from(usuarioGrupos).where(eq(usuarioGrupos.grupoId, row.id))
  return c.json({ ...row, qtdMembros: membros.length })
})

app.post('/grupos', async (c) => {
  const body  = await c.req.json()
  const escopo = body.escopo ?? 'org'
  if (escopo === 'org'   && !body.orgId)     return c.json({ error: 'orgId obrigatório' }, 400)
  if (escopo === 'conta' && !body.accountId) return c.json({ error: 'accountId obrigatório' }, 400)
  const [row] = await db.insert(grupos).values({
    id:        body.id ?? crypto.randomUUID(),
    nome:      body.nome,
    descricao: body.descricao ?? null,
    papel:     body.papel ?? '',
    escopo,
    orgId:     body.orgId ?? null,
    accountId: body.accountId ?? null,
    status:    'Ativo',
    createdAt: new Date().toLocaleDateString('pt-BR'),
  }).returning()
  return c.json(row, 201)
})

app.put('/grupos/:id', async (c) => {
  const body = await c.req.json()
  const updates: Record<string, any> = {
    nome: body.nome,
    descricao: body.descricao,
    papel: body.papel,
    status: body.status,
  }
  if (body.parentId !== undefined) updates.parentId = body.parentId || null
  const [row] = await db.update(grupos)
    .set(updates)
    .where(eq(grupos.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/grupos/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(usuarioGrupos).where(eq(usuarioGrupos.grupoId, id))
  const [row] = await db.delete(grupos).where(eq(grupos.id, id)).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

app.get('/grupos/:id/membros', async (c) => {
  const grupoId = c.req.param('id')
  const links = await db.select().from(usuarioGrupos).where(eq(usuarioGrupos.grupoId, grupoId))
  if (!links.length) return c.json([])
  const userIds  = links.map((l: any) => l.userId)
  const allUsers = await db.select().from(users)
  return c.json(allUsers.filter((u: any) => userIds.includes(u.id)))
})

app.post('/grupos/:id/membros', async (c) => {
  const grupoId = c.req.param('id')
  const { userId } = await c.req.json()
  const existing = await db.select().from(usuarioGrupos)
    .where(and(eq(usuarioGrupos.grupoId, grupoId), eq(usuarioGrupos.userId, userId)))
  if (existing.length > 0) return c.json(existing[0])
  const [row] = await db.insert(usuarioGrupos).values({
    id: crypto.randomUUID(), userId, grupoId,
    assignedAt: new Date().toLocaleDateString('pt-BR'),
  }).returning()
  return c.json(row, 201)
})

app.delete('/grupos/:id/membros/:userId', async (c) => {
  await db.delete(usuarioGrupos).where(
    and(eq(usuarioGrupos.grupoId, c.req.param('id')), eq(usuarioGrupos.userId, c.req.param('userId')))
  )
  return c.json({ ok: true })
})

// ── Accounts — membros e entitlements ─────────────────────────
app.get('/accounts/:id/membros', async (c) => {
  const accountId = c.req.param('id')
  const links = await db.select().from(userAccountMemberships).where(eq(userAccountMemberships.accountId, accountId))
  if (!links.length) return c.json([])
  const userIds  = links.map((l: any) => l.userId)
  const allUsers = await db.select().from(users)
  return c.json(allUsers.filter((u: any) => userIds.includes(u.id)).map((u: any) => ({
    ...u,
    papel: links.find((l: any) => l.userId === u.id)?.papel ?? 'member',
  })))
})

app.post('/accounts/:id/membros', async (c) => {
  const accountId = c.req.param('id')
  const { userId, papel = 'member' } = await c.req.json()
  const existing = await db.select().from(userAccountMemberships)
    .where(and(eq(userAccountMemberships.accountId, accountId), eq(userAccountMemberships.userId, userId)))
  if (existing.length > 0) {
    const [row] = await db.update(userAccountMemberships).set({ papel })
      .where(eq(userAccountMemberships.id, existing[0].id)).returning()
    return c.json(row)
  }
  const [row] = await db.insert(userAccountMemberships).values({
    id: crypto.randomUUID(), userId, accountId, papel,
    assignedAt: new Date().toLocaleDateString('pt-BR'),
  }).returning()
  return c.json(row, 201)
})

app.delete('/accounts/:id/membros/:userId', async (c) => {
  await db.delete(userAccountMemberships).where(
    and(eq(userAccountMemberships.accountId, c.req.param('id')), eq(userAccountMemberships.userId, c.req.param('userId')))
  )
  return c.json({ ok: true })
})

app.get('/accounts/:id/entitlements', async (c) => {
  return c.json(await db.select().from(accountEntitlements).where(eq(accountEntitlements.accountId, c.req.param('id'))))
})

app.post('/accounts/:id/entitlements', async (c) => {
  const accountId = c.req.param('id')
  const { capability } = await c.req.json()
  if (!capability) return c.json({ error: 'capability obrigatório' }, 400)
  const [existing] = await db.select().from(accountEntitlements)
    .where(and(eq(accountEntitlements.accountId, accountId), eq(accountEntitlements.capability, capability)))
  if (existing) return c.json(existing, 200)
  const [row] = await db.insert(accountEntitlements).values({
    id: crypto.randomUUID(), accountId, capability, enabledAt: new Date().toISOString(),
  }).returning()
  return c.json(row, 201)
})

app.delete('/accounts/:id/entitlements/:capability', async (c) => {
  await db.delete(accountEntitlements).where(
    and(eq(accountEntitlements.accountId, c.req.param('id')), eq(accountEntitlements.capability, c.req.param('capability')))
  )
  return c.json({ ok: true })
})

// ── Permissions ───────────────────────────────────────────────
app.get('/permissions', async (c) => {
  const { entidade_tipo, entidade_id, componente_id, instancia_id } = c.req.query()
  const conditions: any[] = []
  if (entidade_tipo) conditions.push(eq(componentPermissions.entidadeTipo, entidade_tipo))
  if (entidade_id)   conditions.push(eq(componentPermissions.entidadeId,   entidade_id))
  if (componente_id) conditions.push(eq(componentPermissions.componenteId, componente_id))
  if (instancia_id && instancia_id !== 'null') conditions.push(eq(componentPermissions.instanciaId, instancia_id))
  if (instancia_id === 'null') conditions.push(isNull(componentPermissions.instanciaId))
  const rows = conditions.length > 0
    ? await db.select().from(componentPermissions).where(and(...conditions))
    : await db.select().from(componentPermissions)
  return c.json(rows)
})

app.post('/permissions', async (c) => {
  const { entidade_tipo, entidade_id, componente_id, acao, instancia_id } = await c.req.json()
  if (!entidade_tipo || !entidade_id || !componente_id || !acao)
    return c.json({ error: 'entidade_tipo, entidade_id, componente_id e acao são obrigatórios' }, 400)
  const conditions: any[] = [
    eq(componentPermissions.entidadeTipo, entidade_tipo),
    eq(componentPermissions.entidadeId,   entidade_id),
    eq(componentPermissions.componenteId, componente_id),
    eq(componentPermissions.acao,         acao),
    instancia_id ? eq(componentPermissions.instanciaId, instancia_id) : isNull(componentPermissions.instanciaId),
  ]
  const existing = await db.select().from(componentPermissions).where(and(...conditions))
  if (existing.length > 0) return c.json(existing[0], 200)
  const [row] = await db.insert(componentPermissions).values({
    id: crypto.randomUUID(), entidadeTipo: entidade_tipo, entidadeId: entidade_id,
    componenteId: componente_id, acao, instanciaId: instancia_id ?? null,
    createdAt: new Date().toISOString(),
  }).returning()
  return c.json(row, 201)
})

app.delete('/permissions', async (c) => {
  const { entidade_tipo, entidade_id, componente_id, acao, instancia_id } = await c.req.json()
  if (!entidade_tipo || !entidade_id || !componente_id || !acao)
    return c.json({ error: 'entidade_tipo, entidade_id, componente_id e acao são obrigatórios' }, 400)
  const conditions: any[] = [
    eq(componentPermissions.entidadeTipo, entidade_tipo),
    eq(componentPermissions.entidadeId,   entidade_id),
    eq(componentPermissions.componenteId, componente_id),
    eq(componentPermissions.acao,         acao),
    instancia_id ? eq(componentPermissions.instanciaId, instancia_id) : isNull(componentPermissions.instanciaId),
  ]
  await db.delete(componentPermissions).where(and(...conditions))
  return c.json({ ok: true })
})

// ── Instâncias ────────────────────────────────────────────────
app.get('/instancias', async (c) => {
  const { componenteId, accountId } = c.req.query()
  let rows = await db.select().from(instancias)
  if (componenteId) rows = rows.filter((r: any) => r.componenteId === componenteId)
  if (accountId)    rows = rows.filter((r: any) => r.accountId    === accountId)
  const allMembros = await db.select().from(instanciaMembros)
  return c.json(rows.map((inst: any) => ({
    ...inst,
    qtdMembros: allMembros.filter((m: any) => m.instanciaId === inst.id).length,
  })))
})

app.get('/instancias/:id', async (c) => {
  const [row] = await db.select().from(instancias).where(eq(instancias.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/instancias', async (c) => {
  const { componenteId, accountId, nome, descricao } = await c.req.json()
  if (!componenteId || !accountId || !nome) return c.json({ error: 'componenteId, accountId e nome obrigatórios' }, 400)
  const [row] = await db.insert(instancias).values({
    id: crypto.randomUUID(), componenteId, accountId, nome,
    descricao: descricao ?? null, status: 'Ativo',
    createdAt: new Date().toLocaleDateString('pt-BR'),
  }).returning()
  return c.json(row, 201)
})

app.put('/instancias/:id', async (c) => {
  const [row] = await db.update(instancias).set(await c.req.json()).where(eq(instancias.id, c.req.param('id'))).returning()
  return c.json(row)
})

app.delete('/instancias/:id', async (c) => {
  await db.delete(instancias).where(eq(instancias.id, c.req.param('id')))
  return c.json({ ok: true })
})

app.get('/instancias/:id/membros', async (c) => {
  const instanciaId = c.req.param('id')
  const membros = await db.select().from(instanciaMembros).where(eq(instanciaMembros.instanciaId, instanciaId))
  if (!membros.length) return c.json([])
  const [allUsers, allGrupos] = await Promise.all([db.select().from(users), db.select().from(grupos)])
  return c.json(membros.map((m: any) => {
    if (m.entidadeTipo === 'user') {
      const u = allUsers.find((u: any) => u.id === m.entidadeId)
      return { ...m, displayName: u?.nomeCompleto ?? m.entidadeId, email: u?.email }
    }
    const g = allGrupos.find((g: any) => g.id === m.entidadeId)
    return { ...m, displayName: g?.nome ?? m.entidadeId }
  }))
})

app.post('/instancias/:id/membros', async (c) => {
  const instanciaId = c.req.param('id')
  const { entidadeTipo, entidadeId, papel } = await c.req.json()
  if (!entidadeTipo || !entidadeId || !papel) return c.json({ error: 'entidadeTipo, entidadeId e papel obrigatórios' }, 400)
  const existing = await db.select().from(instanciaMembros).where(
    and(eq(instanciaMembros.instanciaId, instanciaId), eq(instanciaMembros.entidadeTipo, entidadeTipo), eq(instanciaMembros.entidadeId, entidadeId))
  )
  if (existing.length > 0) {
    const [row] = await db.update(instanciaMembros).set({ papel }).where(eq(instanciaMembros.id, existing[0].id)).returning()
    return c.json(row)
  }
  const [row] = await db.insert(instanciaMembros).values({
    id: crypto.randomUUID(), instanciaId, entidadeTipo, entidadeId, papel,
    assignedAt: new Date().toLocaleDateString('pt-BR'),
  }).returning()
  return c.json(row, 201)
})

app.delete('/instancias/:id/membros/:membroId', async (c) => {
  await db.delete(instanciaMembros).where(eq(instanciaMembros.id, c.req.param('membroId')))
  return c.json({ ok: true })
})

export default handle(app)
