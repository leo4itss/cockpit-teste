import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../server/schema.js'

export const config = { runtime: 'edge' }

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

const { organizations, accounts, solutions, contracts, users } = schema

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

  // neon-http não suporta transactions. Usamos compensação manual:
  // cria org → tenta criar conta default → se falhar, apaga org.
  const [org] = await db.insert(organizations).values(body).returning()

  try {
    await db.insert(accounts).values({
      id: crypto.randomUUID(),
      orgId: org.id,
      name: 'Conta Padrão',
      subdomain: `${org.domain}-default`,
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
  await db.delete(organizations).where(eq(organizations.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ── Accounts ──────────────────────────────────────────────────
app.get('/accounts', async (c) => {
  const orgId = c.req.query('orgId')
  const rows = orgId
    ? await db.select().from(accounts).where(eq(accounts.orgId, orgId))
    : await db.select().from(accounts)
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
  await db.delete(accounts).where(eq(accounts.id, c.req.param('id')))
  return c.json({ ok: true })
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
  const [row] = await db.update(solutions).set(await c.req.json()).where(eq(solutions.id, c.req.param('id'))).returning()
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404)
})
app.delete('/solutions/:id', async (c) => {
  await db.delete(solutions).where(eq(solutions.id, c.req.param('id')))
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
  const [row] = await db.update(contracts).set(await c.req.json()).where(eq(contracts.id, c.req.param('id'))).returning()
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

export default handle(app)
