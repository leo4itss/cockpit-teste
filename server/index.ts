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
  componenteObjetos,
  grupoPermissoes,
} from './schema'
import { eq, inArray } from 'drizzle-orm'

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

// ── Grupos ────────────────────────────────────────────────────

app.get('/api/grupos', async (c) => {
  const rows = await db.select().from(grupos)
  // Enriquecer com contagem de membros
  const enriched = await Promise.all(rows.map(async (g) => {
    const membros = await db.select().from(usuarioGrupos).where(eq(usuarioGrupos.grupoId, g.id))
    return { ...g, qtdMembros: membros.length }
  }))
  return c.json(enriched)
})

app.get('/api/grupos/:id', async (c) => {
  const [row] = await db.select().from(grupos).where(eq(grupos.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/api/grupos', async (c) => {
  const body = await c.req.json()
  const { membroIds, ...grupoData } = body
  const [grupo] = await db.insert(grupos).values(grupoData).returning()
  // Vincular membros iniciais, se informados
  if (Array.isArray(membroIds) && membroIds.length > 0) {
    await db.insert(usuarioGrupos).values(
      membroIds.map((userId: string) => ({
        id: crypto.randomUUID(),
        userId,
        grupoId: grupo.id,
        assignedAt: new Date().toISOString(),
      }))
    )
  }
  return c.json(grupo, 201)
})

app.put('/api/grupos/:id', async (c) => {
  const body = await c.req.json()
  const [row] = await db.update(grupos).set(body).where(eq(grupos.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/api/grupos/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(grupoPermissoes).where(eq(grupoPermissoes.grupoId, id))
  await db.delete(usuarioGrupos).where(eq(usuarioGrupos.grupoId, id))
  await db.delete(grupos).where(eq(grupos.id, id))
  return c.json({ ok: true })
})

// ── Membros de um grupo ───────────────────────────────────────

app.get('/api/grupos/:id/membros', async (c) => {
  const grupoId = c.req.param('id')
  const relacoes = await db.select().from(usuarioGrupos).where(eq(usuarioGrupos.grupoId, grupoId))
  if (relacoes.length === 0) return c.json([])
  const userIds = relacoes.map(r => r.userId)
  const membros = await db.select().from(users).where(inArray(users.id, userIds))
  return c.json(membros)
})

app.post('/api/grupos/:id/membros', async (c) => {
  const grupoId = c.req.param('id')
  const { userId } = await c.req.json()
  const [row] = await db.insert(usuarioGrupos).values({
    id: crypto.randomUUID(),
    userId,
    grupoId,
    assignedAt: new Date().toISOString(),
  }).returning()
  return c.json(row, 201)
})

app.delete('/api/grupos/:grupoId/membros/:userId', async (c) => {
  const { grupoId, userId } = c.req.param()
  const { and } = await import('drizzle-orm')
  await db.delete(usuarioGrupos).where(
    and(eq(usuarioGrupos.grupoId, grupoId), eq(usuarioGrupos.userId, userId))
  )
  return c.json({ ok: true })
})

// ── Grupos de um usuário ──────────────────────────────────────

app.get('/api/users/:id/grupos', async (c) => {
  const userId = c.req.param('id')
  const relacoes = await db.select().from(usuarioGrupos).where(eq(usuarioGrupos.userId, userId))
  if (relacoes.length === 0) return c.json([])
  const grupoIds = relacoes.map(r => r.grupoId)
  const gruposDoUser = await db.select().from(grupos).where(inArray(grupos.id, grupoIds))
  return c.json(gruposDoUser)
})

// ── Permissões de um grupo (sobre objetos de componentes) ─────

app.get('/api/grupos/:id/permissoes', async (c) => {
  const grupoId = c.req.param('id')
  const perms = await db.select().from(grupoPermissoes).where(eq(grupoPermissoes.grupoId, grupoId))
  // Enriquecer com dados do objeto
  const enriched = await Promise.all(perms.map(async (p) => {
    const [obj] = await db.select().from(componenteObjetos).where(eq(componenteObjetos.id, p.componenteObjetoId))
    return { ...p, objeto: obj ?? null }
  }))
  return c.json(enriched)
})

app.post('/api/grupos/:id/permissoes', async (c) => {
  const grupoId = c.req.param('id')
  const { componenteObjetoId, permissoesAtivas } = await c.req.json()
  // Upsert: se já existe vínculo para este objeto, atualiza; senão, cria
  const [existing] = await db.select().from(grupoPermissoes).where(
    eq(grupoPermissoes.grupoId, grupoId)
  ).then(rows => rows.filter(r => r.componenteObjetoId === componenteObjetoId))
  if (existing) {
    const [updated] = await db.update(grupoPermissoes)
      .set({ permissoesAtivas })
      .where(eq(grupoPermissoes.id, existing.id))
      .returning()
    return c.json(updated)
  }
  const [row] = await db.insert(grupoPermissoes).values({
    id: crypto.randomUUID(),
    grupoId,
    componenteObjetoId,
    permissoesAtivas,
    createdAt: new Date().toISOString(),
  }).returning()
  return c.json(row, 201)
})

app.delete('/api/grupos/:grupoId/permissoes/:permissaoId', async (c) => {
  await db.delete(grupoPermissoes).where(eq(grupoPermissoes.id, c.req.param('permissaoId')))
  return c.json({ ok: true })
})

// ── Objetos de componentes (importados via metadata) ──────────

app.get('/api/componente-objetos', async (c) => {
  const componenteId = c.req.query('componenteId')
  const rows = componenteId
    ? await db.select().from(componenteObjetos).where(eq(componenteObjetos.componenteId, componenteId))
    : await db.select().from(componenteObjetos)
  return c.json(rows)
})

// Importa objetos do endpoint de metadata do componente e persiste em componente_objetos.
// Contrato esperado: { componentId, name, version, objetos: [{ id, nome, descricao?, permissoes: [{ id, nome }] }] }
app.post('/api/componentes/:id/importar-objetos', async (c) => {
  const componenteId = c.req.param('id')
  const [comp] = await db.select().from(componentes).where(eq(componentes.id, componenteId))
  if (!comp) return c.json({ error: 'Componente não encontrado' }, 404)
  if (!comp.metadataUrl) return c.json({ error: 'Componente não tem metadataUrl configurada' }, 400)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(comp.metadataUrl, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return c.json({ error: `Metadata retornou status ${res.status}` }, 502)

    const data = await res.json() as { objetos?: Array<{ id: string; nome: string; descricao?: string; permissoes: Array<{ id: string; nome: string }> }> }
    if (!Array.isArray(data.objetos) || data.objetos.length === 0) {
      return c.json({ error: 'Metadata não contém "objetos" como array não-vazio' }, 422)
    }

    const agora = new Date().toISOString()
    // Remove objetos anteriores deste componente e reimporta
    await db.delete(componenteObjetos).where(eq(componenteObjetos.componenteId, componenteId))
    const inserted = await db.insert(componenteObjetos).values(
      data.objetos.map(obj => ({
        id: crypto.randomUUID(),
        componenteId,
        objetoId: obj.id,
        nome: obj.nome,
        descricao: obj.descricao ?? null,
        permissoesDisponiveis: obj.permissoes,
        importadoEm: agora,
      }))
    ).returning()
    return c.json({ ok: true, importados: inserted.length })
  } catch (err: unknown) {
    const msg = err instanceof Error && err.name === 'AbortError' ? 'Timeout na requisição de metadata' : 'Falha ao acessar metadata'
    return c.json({ error: msg }, 502)
  }
})

// ── Start ─────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log('API server running on http://localhost:3001')
})
