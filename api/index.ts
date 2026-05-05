import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, isNull, and } from 'drizzle-orm'
import * as schema from '../server/schema.js'

export const config = { runtime: 'edge' }

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

const {
  organizations,
  accounts,
  solutions,
  contracts,
  contractVersions,
  users,
  tiposLicenca,
  componentes,
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
  const [row] = await db.insert(solutions).values(await c.req.json()).returning()
  return c.json(row, 201)
})
app.put('/solutions/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const [existing] = await db.select().from(solutions).where(eq(solutions.id, id))
  if (!existing) return c.json({ error: 'Not found' }, 404)

  // Componentes são imutáveis após a criação
  const sortedExisting = [...((existing.componenteIds as string[]) ?? [])].sort().join(',')
  const sortedIncoming = [...((body.componenteIds as string[]) ?? [])].sort().join(',')
  if (sortedExisting !== sortedIncoming) {
    return c.json({
      error: 'Os componentes de uma solução não podem ser alterados após a criação. Para uma composição diferente, crie uma nova solução.',
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

  // ── Snapshot de contratos afetados (E3 — contrato estático) ──
  // Quando um plano muda de versão, registra um snapshot dos valores
  // ATUAIS do contrato como histórico — mas NÃO altera o contrato.
  // Contratos são imutáveis após a assinatura.
  if (plansChanged) {
    const solucaoNome = existing.name
    const toArr = (raw: any): any[] => {
      if (Array.isArray(raw)) return raw
      if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
      return []
    }

    let afetados: any[] = []
    try {
      const all = await db.select().from(contracts)
      afetados = all.filter((ct: any) => toArr(ct.objetos).some((o: any) => o.solucao === solucaoNome))
      versionLog.push(`contracts afetados=${afetados.length}`)
    } catch (e: any) {
      versionLog.push(`ERR fetch contracts: ${e.message}`)
    }

    for (const ct of afetados) {
      try {
        const vers = await db.select().from(contractVersions).where(eq(contractVersions.contratoId, ct.id))
        const oldObjetos = Array.isArray(ct.objetos) ? ct.objetos : JSON.parse(ct.objetos as string)
        await db.insert(contractVersions).values({
          id: crypto.randomUUID(),
          contratoId: ct.id,
          versao: vers.length + 1,
          snapshotPlano: oldObjetos,   // valores originais do contrato (estáticos)
          alteradoPor: 'sistema',
          alteradoEm: new Date().toISOString(),
          motivo: `Nova versão criada para planos da solução "${solucaoNome}". Contrato preservado com valores originais da assinatura.`,
        })
        versionLog.push(`snapshot ok [${ct.id}]`)
      } catch (e: any) {
        versionLog.push(`ERR snapshot [${ct.id}]: ${e.message}`)
      }
      // ✅ NÃO atualiza contracts.objetos — valores são estáticos desde a assinatura
    }

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
// IMPORTANTE: rota específica /versoes deve vir ANTES de /:id
app.get('/contracts/:id/versoes', async (c) => {
  const rows = await db.select().from(contractVersions).where(eq(contractVersions.contratoId, c.req.param('id')))
  rows.sort((a: any, b: any) => b.versao - a.versao)
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

  // Versiona se os objetos mudaram
  const existingObjetos = JSON.stringify(existing.objetos ?? [])
  const incomingObjetos = JSON.stringify(body.objetos ?? [])
  if (existingObjetos !== incomingObjetos) {
    try {
      const existingVersions = await db.select().from(contractVersions).where(eq(contractVersions.contratoId, id))
      await db.insert(contractVersions).values({
        id: crypto.randomUUID(),
        contratoId: id,
        versao: existingVersions.length + 1,
        snapshotPlano: existing.objetos,
        alteradoPor: 'sistema',
        alteradoEm: new Date().toISOString(),
        motivo: 'Contrato editado manualmente.',
      })
    } catch (err) {
      console.error('[contract versioning error]', err)
    }
  }

  const [row] = await db.update(contracts).set(body).where(eq(contracts.id, id)).returning()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.delete('/contracts/:id', async (c) => {
  await db.delete(contracts).where(eq(contracts.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── Users ─────────────────────────────────────────────────────
app.get('/users', async (c) => c.json(await db.select().from(users)))
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
app.get('/componentes', async (c) => c.json(await db.select().from(componentes)))
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
  await db.delete(componentes).where(eq(componentes.id, c.req.param('id')))
  return c.json({ ok: true })
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

export default handle(app)
