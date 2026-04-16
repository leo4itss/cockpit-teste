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
} from './schema'
import { eq } from 'drizzle-orm'

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
  await db.delete(organizations).where(eq(organizations.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── Accounts ─────────────────────────────────────────────────

app.get('/api/accounts', async (c) => {
  const orgId = c.req.query('orgId')
  const rows = orgId
    ? await db.select().from(accounts).where(eq(accounts.orgId, orgId))
    : await db.select().from(accounts)
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
  await db.delete(accounts).where(eq(accounts.id, c.req.param('id')))
  return c.json({ ok: true })
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
  const [row] = await db.insert(solutions).values(body).returning()
  return c.json(row, 201)
})

app.put('/api/solutions/:id', async (c) => {
  const body = await c.req.json()
  const [row] = await db.update(solutions).set(body).where(eq(solutions.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/solutions/:id', async (c) => {
  await db.delete(solutions).where(eq(solutions.id, c.req.param('id')))
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
  const body = await c.req.json()
  const [row] = await db.update(contracts).set(body).where(eq(contracts.id, c.req.param('id'))).returning()
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
  const rows = await db.select().from(componentes)
  return c.json(rows)
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
  await db.delete(componentes).where(eq(componentes.id, c.req.param('id')))
  return c.json({ ok: true })
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

// ── Start ─────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log('API server running on http://localhost:3001')
})
