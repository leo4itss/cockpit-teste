import { db } from './db'
import { instanciaMembros, instancias, componenteAtribuicoes, instanciaMembroAtribuicoes } from './schema'
import { eq } from 'drizzle-orm'

const PAPEL_MAP: Record<string, string> = {
  viewer: 'Visualizar',
  member: 'Usar',
  admin:  'Administrar',
}

async function migrar() {
  console.log('Iniciando migração de papéis → atribuições...')

  const membros = await db.select().from(instanciaMembros)
  let migrated = 0

  for (const membro of membros) {
    const papelNome = PAPEL_MAP[membro.papel] ?? membro.papel

    // Buscar a instância para obter o componenteId
    const [instancia] = await db.select().from(instancias).where(eq(instancias.id, membro.instanciaId))
    if (!instancia) {
      console.warn(`  Instância ${membro.instanciaId} não encontrada para membro ${membro.id}`)
      continue
    }

    // Buscar as atribuições do componente correspondente
    const atribuicoes = await db.select().from(componenteAtribuicoes)
      .where(eq(componenteAtribuicoes.componenteId, instancia.componenteId))

    const atrib = atribuicoes.find(a => a.nome === papelNome)
    if (!atrib) {
      console.warn(`  Atribuição "${papelNome}" não encontrada para componente ${instancia.componenteId}`)
      continue
    }

    // Verificar se já existe o vínculo
    const existentes = await db.select().from(instanciaMembroAtribuicoes)
      .where(eq(instanciaMembroAtribuicoes.membroId, membro.id))

    const jaVinculado = existentes.some(e => e.atribuicaoId === atrib.id)
    if (jaVinculado) continue

    await db.insert(instanciaMembroAtribuicoes).values({
      id: `mig-${membro.id}-${atrib.id}`,
      membroId: membro.id,
      atribuicaoId: atrib.id,
      assignedAt: new Date().toISOString(),
    })
    migrated++
  }

  console.log(`Migração concluída. ${migrated} vínculos criados.`)
}

migrar().catch(console.error)
