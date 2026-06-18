import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, isNull, and, inArray, or } from 'drizzle-orm'
import * as schema from '../server/schema.js'
import { getElegiveisParaSlot } from '../server/docnix-elegiveis.js'

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
  componentePapeis,
  componenteAcoes,
  instanciaMembroAtribuicoes,
  instanciaFases,
  faseResponsaveis,
  instanciaPerfilSlots,
  instanciaPerfilSlotNomeacoes,
  faseAtribuicoesPermitidas,
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
  try {
    const [row] = await db.insert(users).values(await c.req.json()).returning()
    return c.json(row, 201)
  } catch (e: any) {
    const code: string       = e?.code       ?? e?.cause?.code       ?? ''
    const detail: string     = e?.detail     ?? e?.cause?.detail     ?? ''
    const constraint: string = e?.constraint ?? e?.cause?.constraint ?? ''
    const msg: string        = e?.message    ?? ''
    // Usa apenas constraint+detail para detectar a coluna violada — msg contém
    // a query SQL completa (ex: "INSERT INTO users (id, email, usuario, ...)"),
    // o que tornaria haystack.includes('email') sempre verdadeiro.
    const colHaystack = constraint + detail
    const isUnique = code === '23505' || colHaystack.includes('unique') || colHaystack.includes('duplicate') || msg.includes('unique') || msg.includes('duplicate')
    if (isUnique) {
      if (colHaystack.includes('email'))
        return c.json({ error: 'Este e-mail já está cadastrado na plataforma.' }, 409)
      if (colHaystack.includes('usuario'))
        return c.json({ error: 'Este nome de usuário já está em uso.' }, 409)
      return c.json({ error: 'E-mail ou usuário já cadastrado.' }, 409)
    }
    const reason = detail || constraint || msg || 'Erro desconhecido'
    console.error('[POST /users] DB error:', { code, detail, constraint, msg })
    return c.json({ error: `Não foi possível criar o usuário. Motivo: ${reason}` }, 500)
  }
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

app.get('/componentes/:id/config', async (c) => {
  const id = c.req.param('id')
  const [papeis, acoes] = await Promise.all([
    db.select({
      value:        componentePapeis.value,
      label:        componentePapeis.label,
      descricao:    componentePapeis.descricao,
      defaultAcoes: componentePapeis.defaultAcoes,
      cls:          componentePapeis.cls,
      ordem:        componentePapeis.ordem,
    })
      .from(componentePapeis)
      .where(and(eq(componentePapeis.componenteId, id), eq(componentePapeis.status, 'Ativo')))
      .orderBy(componentePapeis.ordem),
    db.select({
      acao:  componenteAcoes.acao,
      label: componenteAcoes.label,
      ordem: componenteAcoes.ordem,
    })
      .from(componenteAcoes)
      .where(and(eq(componenteAcoes.componenteId, id), eq(componenteAcoes.status, 'Ativo')))
      .orderBy(componenteAcoes.ordem),
  ])
  return c.json({ papeis, acoes })
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
    if (g.status === 'Inativo') return false
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
  rows = rows.filter((r: any) => r.status !== 'Inativo')
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

  // Impede criação de instância com nome duplicado para o mesmo componente e conta
  const duplicate = await db.select().from(instancias).where(
    and(eq(instancias.accountId, accountId), eq(instancias.componenteId, componenteId), eq(instancias.nome, nome))
  )
  if (duplicate.length > 0) return c.json({ error: `Já existe uma instância chamada "${nome}" para este componente nesta conta.` }, 409)

  const [row] = await db.insert(instancias).values({
    id: crypto.randomUUID(), componenteId, accountId, nome,
    descricao: descricao ?? null, status: 'Ativo',
    createdAt: new Date().toLocaleDateString('pt-BR'),
  }).returning()
  return c.json(row, 201)
})

app.put('/instancias/:id', async (c) => {
  const body = await c.req.json()
  const updates: Record<string, any> = {}
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.descricao !== undefined) updates.descricao = body.descricao
  if (body.status !== undefined) updates.status = body.status
  if (body.restringirAcesso !== undefined) updates.restringirAcesso = body.restringirAcesso
  const [row] = await db.update(instancias).set(updates).where(eq(instancias.id, c.req.param('id'))).returning()
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

app.put('/instancias/:id/membros/:membroId', async (c) => {
  const instanciaId = c.req.param('id')
  const membroId    = c.req.param('membroId')
  const { papel }   = await c.req.json()
  if (!papel) return c.json({ error: 'papel é obrigatório' }, 400)
  const [row] = await db
    .update(instanciaMembros)
    .set({ papel })
    .where(and(eq(instanciaMembros.id, membroId), eq(instanciaMembros.instanciaId, instanciaId)))
    .returning()
  if (!row) return c.json({ error: 'Membro não encontrado' }, 404)
  return c.json(row)
})

app.delete('/instancias/:id/membros/:membroId', async (c) => {
  const instanciaId = c.req.param('id')
  const membroId    = c.req.param('membroId')

  const [membro] = await db.select().from(instanciaMembros).where(eq(instanciaMembros.id, membroId))

  // Remover atribuições DocNix (FK: membro_id → instancia_membros.id)
  await db.delete(instanciaMembroAtribuicoes).where(eq(instanciaMembroAtribuicoes.membroId, membroId))

  // Remover permissões FGA do membro nesta instância
  if (membro) {
    await db.delete(componentPermissions).where(
      and(
        eq(componentPermissions.entidadeTipo, membro.entidadeTipo as 'user' | 'group'),
        eq(componentPermissions.entidadeId,   membro.entidadeId),
        eq(componentPermissions.instanciaId,  instanciaId),
      )
    )
  }

  await db.delete(instanciaMembros).where(eq(instanciaMembros.id, membroId))
  return c.json({ ok: true })
})

// ── Atribuições por Componente ────────────────────────────────
app.get('/componentes/:id/atribuicoes', async (c) => {
  const { id } = c.req.param()
  const rows = await db.select().from(componenteAtribuicoes)
    .where(eq(componenteAtribuicoes.componenteId, id))
  return c.json(rows)
})

app.post('/componentes/:id/atribuicoes', async (c) => {
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

app.put('/componentes/:id/atribuicoes/:atribuicaoId', async (c) => {
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

app.delete('/componentes/:id/atribuicoes/:atribuicaoId', async (c) => {
  const { atribuicaoId } = c.req.param()
  await db.delete(componenteAtribuicoes).where(eq(componenteAtribuicoes.id, atribuicaoId))
  return c.json({ success: true })
})

// ── Fases por Instância ───────────────────────────────────────
app.get('/instancias/:id/fases', async (c) => {
  const { id } = c.req.param()
  const rows = await db.select().from(instanciaFases)
    .where(eq(instanciaFases.instanciaId, id))
    .orderBy(instanciaFases.ordem)
  return c.json(rows)
})

app.post('/instancias/:id/fases', async (c) => {
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

app.put('/instancias/:id/fases/:faseId', async (c) => {
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

app.delete('/instancias/:id/fases/:faseId', async (c) => {
  const { faseId } = c.req.param()
  await db.delete(faseResponsaveis).where(eq(faseResponsaveis.faseId, faseId))
  await db.delete(instanciaFases).where(eq(instanciaFases.id, faseId))
  return c.json({ success: true })
})

// ── Responsáveis por Fase ─────────────────────────────────────
app.get('/instancias/:id/fases/:faseId/responsaveis', async (c) => {
  const { faseId } = c.req.param()
  const rows = await db.select().from(faseResponsaveis)
    .where(eq(faseResponsaveis.faseId, faseId))
  return c.json(rows)
})

app.post('/instancias/:id/fases/:faseId/responsaveis', async (c) => {
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

app.delete('/instancias/:id/fases/:faseId/responsaveis/:responsavelId', async (c) => {
  const { responsavelId } = c.req.param()
  await db.delete(faseResponsaveis).where(eq(faseResponsaveis.id, responsavelId))
  return c.json({ success: true })
})

// ── Atribuições Permitidas por Fase ───────────────────────────

app.get('/instancias/:id/fases/:faseId/atribuicoes-permitidas', async (c) => {
  const { faseId } = c.req.param()
  const rows = await db.select().from(faseAtribuicoesPermitidas)
    .where(eq(faseAtribuicoesPermitidas.faseId, faseId))
  return c.json(rows)
})

app.post('/instancias/:id/fases/:faseId/atribuicoes-permitidas', async (c) => {
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

app.delete('/instancias/:id/fases/:faseId/atribuicoes-permitidas/:atribuicaoId', async (c) => {
  const { faseId, atribuicaoId } = c.req.param()
  await db.delete(faseAtribuicoesPermitidas)
    .where(and(
      eq(faseAtribuicoesPermitidas.faseId, faseId),
      eq(faseAtribuicoesPermitidas.atribuicaoId, atribuicaoId),
    ))
  return c.json({ success: true })
})

// ── Slots de Perfil por Instância ─────────────────────────────
app.get('/instancias/:id/perfil-slots', async (c) => {
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

app.get('/instancias/:id/elegiveis-slot', async (c) => {
  const { id } = c.req.param()
  const atribuicaoId = c.req.query('atribuicaoId') || null
  const result = await getElegiveisParaSlot(db, id, atribuicaoId)
  return c.json(result)
})

app.post('/instancias/:id/perfil-slots', async (c) => {
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

app.put('/instancias/:id/perfil-slots/:slotId', async (c) => {
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

app.delete('/instancias/:id/perfil-slots/:slotId', async (c) => {
  const { slotId } = c.req.param()
  await db.delete(instanciaPerfilSlotNomeacoes).where(eq(instanciaPerfilSlotNomeacoes.slotId, slotId))
  await db.delete(instanciaPerfilSlots).where(eq(instanciaPerfilSlots.id, slotId))
  return c.json({ success: true })
})

app.post('/instancias/:id/perfil-slots/:slotId/nomeacoes', async (c) => {
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
    return c.json({ error: 'Entidade não elegível para este slot' }, 403)
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

app.delete('/instancias/:id/perfil-slots/:slotId/nomeacoes/:nomeacaoId', async (c) => {
  const { nomeacaoId } = c.req.param()
  await db.delete(instanciaPerfilSlotNomeacoes).where(eq(instanciaPerfilSlotNomeacoes.id, nomeacaoId))
  return c.json({ success: true })
})

// ── Atribuições em Membros de Instância ───────────────────────
app.get('/instancias/:id/membros/:membroId/atribuicoes', async (c) => {
  const { membroId } = c.req.param()
  const rows = await db.select().from(instanciaMembroAtribuicoes)
    .where(eq(instanciaMembroAtribuicoes.membroId, membroId))
  return c.json(rows)
})

app.post('/instancias/:id/membros/:membroId/atribuicoes', async (c) => {
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

app.delete('/instancias/:id/membros/:membroId/atribuicoes/:atribuicaoId', async (c) => {
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
app.get('/instancias/:id/permissoes-efetivas', async (c) => {
  const { id: instanceId } = c.req.param()
  const userId = c.req.query('userId')
  if (!userId) return c.json({ error: 'userId é obrigatório' }, 400)

  const userGruposRows = await db.select().from(usuarioGrupos)
    .where(eq(usuarioGrupos.userId, userId))
  const gruposDiretos = userGruposRows.map((g: any) => g.grupoId)

  // Expande grupoIds com ancestrais via parentId (traversal em memória)
  const todosGrupos = gruposDiretos.length > 0
    ? await db.select({ id: grupos.id, parentId: grupos.parentId, nome: grupos.nome }).from(grupos)
    : []
  const grupoById = new Map(todosGrupos.map((g: any) => [g.id, g]))

  function expandirComAncestors(ids: string[]): string[] {
    const resultado = new Set(ids)
    for (const id of ids) {
      let cursor = grupoById.get(id)?.parentId
      const visitados = new Set<string>()
      while (cursor && !visitados.has(cursor)) {
        resultado.add(cursor)
        visitados.add(cursor)
        cursor = grupoById.get(cursor)?.parentId ?? null
      }
    }
    return [...resultado]
  }

  const grupoIds = expandirComAncestors(gruposDiretos)

  const directPerms = await db.select().from(componentPermissions)
    .where(and(
      eq(componentPermissions.instanciaId, instanceId),
      eq(componentPermissions.entidadeId, userId),
    ))

  const groupPerms = grupoIds.length > 0
    ? await db.select().from(componentPermissions)
        .where(and(
          eq(componentPermissions.instanciaId, instanceId),
          inArray(componentPermissions.entidadeId, grupoIds),
        ))
    : []

  const grupoNomeMap: Record<string, string> = Object.fromEntries(
    todosGrupos.map((g: any) => [g.id, g.nome])
  )

  const fontes: { atribuicaoId: string; fonte: string; entidadeId: string; displayName?: string }[] = [
    ...directPerms.map((p: any) => ({ atribuicaoId: p.acao, fonte: 'direto', entidadeId: userId })),
    ...groupPerms.map((p: any) => ({ atribuicaoId: p.acao, fonte: 'grupo', entidadeId: p.entidadeId, displayName: grupoNomeMap[p.entidadeId] })),
  ]

  const atribuicoes = [...new Set(fontes.map((f) => f.atribuicaoId))]
  return c.json({ atribuicoes, fontes })
})

export default handle(app)
