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
  contractVersions,
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
  const [row] = await db.insert(solutions).values(body).returning()
  return c.json(row, 201)
})

app.put('/api/solutions/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  // Busca a solução existente
  const [existing] = await db.select().from(solutions).where(eq(solutions.id, id))
  if (!existing) return c.json({ error: 'Not found' }, 404)

  // ── ENTREGA 1: componentes são imutáveis ──────────────────────
  const sortedExisting = [...((existing.componenteIds as string[]) ?? [])].sort().join(',')
  const sortedIncoming = [...((body.componenteIds as string[]) ?? [])].sort().join(',')
  if (sortedExisting !== sortedIncoming) {
    return c.json({
      error: 'Os componentes de uma solução não podem ser alterados após a criação. Para uma composição diferente, crie uma nova solução.',
    }, 422)
  }

  // ── ENTREGA 2: versionar contratos afetados por mudança de planos ─
  const existingPlans = JSON.stringify(existing.plans ?? [])
  const incomingPlans = JSON.stringify(body.plans ?? [])
  if (existingPlans !== incomingPlans) {
    // Busca todos os contratos que referenciam esta solução pelo nome
    const solucaoNome = existing.name
    const allContracts = await db.select().from(contracts)
    const afetados = allContracts.filter((ct: any) => {
      const objetos = ct.objetos as Array<{ solucao: string }>
      return objetos.some((obj) => obj.solucao === solucaoNome)
    })

    if (afetados.length > 0) {
      const now = new Date().toISOString()
      for (const ct of afetados) {
        // Descobre o próximo número de versão
        const existingVersions = await db
          .select()
          .from(contractVersions)
          .where(eq(contractVersions.contratoId, ct.id))
        const nextVersao = existingVersions.length + 1

        await db.insert(contractVersions).values({
          id: crypto.randomUUID(),
          contratoId: ct.id,
          versao: nextVersao,
          snapshotPlano: ct.objetos,
          alteradoPor: 'sistema',
          alteradoEm: now,
          motivo: `Planos da solução "${solucaoNome}" foram atualizados.`,
        })
      }
    }
  }

  const [row] = await db.update(solutions).set(body).where(eq(solutions.id, id)).returning()
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

// Histórico de versões de um contrato
app.get('/api/contracts/:id/versoes', async (c) => {
  const rows = await db
    .select()
    .from(contractVersions)
    .where(eq(contractVersions.contratoId, c.req.param('id')))
  // Ordena por versão decrescente (mais recente primeiro)
  rows.sort((a: any, b: any) => b.versao - a.versao)
  return c.json(rows)
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
