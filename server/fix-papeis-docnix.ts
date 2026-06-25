/**
 * fix-papeis-docnix.ts
 *
 * Corrige papéis genéricos ('member', 'admin', 'viewer') em instâncias DocNix
 * (MaxDoc e DocAction) que foram inseridos pelo seed.ts antigo (modelo genérico).
 *
 * Mapeamento:
 *   DocAction  — 'member' → 'analista'  | 'admin' → 'admin-docaction' | 'viewer' → 'colaborador'
 *   MaxDoc     — 'member' → 'editor'    | 'admin' → 'admin-maxdoc'    | 'viewer' → 'leitor'
 *
 * Uso: npx tsx server/fix-papeis-docnix.ts
 */

import { db } from './db'
import { instancias, instanciaMembros, componentes } from './schema'
import { eq, and, inArray } from 'drizzle-orm'

const DOCACTION_MAP: Record<string, string> = {
  member:  'analista',
  admin:   'admin-docaction',
  viewer:  'colaborador',
}

const MAXDOC_MAP: Record<string, string> = {
  member: 'editor',
  admin:  'admin-maxdoc',
  viewer: 'leitor',
}

async function fix() {
  console.log('=== fix-papeis-docnix ===\n')

  // 1. Descobre os IDs de componente para DocAction e MaxDoc
  const comps = await db.select({ id: componentes.id, nome: componentes.nome }).from(componentes)
  const docactionIds = comps.filter(c => c.nome.toLowerCase().includes('docaction')).map(c => c.id)
  const maxdocIds    = comps.filter(c => c.nome.toLowerCase().includes('maxdoc')).map(c => c.id)

  if (!docactionIds.length && !maxdocIds.length) {
    console.log('Nenhum componente DocAction ou MaxDoc encontrado.')
    return
  }

  console.log(`DocAction IDs: ${docactionIds.join(', ')}`)
  console.log(`MaxDoc IDs:    ${maxdocIds.join(', ')}\n`)

  // 2. Busca instâncias de cada tipo
  const instList = await db.select({ id: instancias.id, componenteId: instancias.componenteId, nome: instancias.nome }).from(instancias)

  const docactionInstIds = instList.filter(i => docactionIds.includes(i.componenteId)).map(i => i.id)
  const maxdocInstIds    = instList.filter(i => maxdocIds.includes(i.componenteId)).map(i => i.id)

  console.log(`Instâncias DocAction: ${docactionInstIds.join(', ')}`)
  console.log(`Instâncias MaxDoc:    ${maxdocInstIds.join(', ')}\n`)

  let totalFixed = 0

  // 3. Corrige membros de instâncias DocAction
  for (const [oldPapel, novoPapel] of Object.entries(DOCACTION_MAP)) {
    if (!docactionInstIds.length) break
    const rows = await db
      .select()
      .from(instanciaMembros)
      .where(and(
        inArray(instanciaMembros.instanciaId, docactionInstIds),
        eq(instanciaMembros.papel, oldPapel),
      ))

    for (const row of rows) {
      await db.update(instanciaMembros).set({ papel: novoPapel }).where(eq(instanciaMembros.id, row.id))
      console.log(`[DocAction] ${row.entidadeId} (${row.instanciaId}): ${oldPapel} → ${novoPapel}`)
      totalFixed++
    }
  }

  // 4. Corrige membros de instâncias MaxDoc
  for (const [oldPapel, novoPapel] of Object.entries(MAXDOC_MAP)) {
    if (!maxdocInstIds.length) break
    const rows = await db
      .select()
      .from(instanciaMembros)
      .where(and(
        inArray(instanciaMembros.instanciaId, maxdocInstIds),
        eq(instanciaMembros.papel, oldPapel),
      ))

    for (const row of rows) {
      await db.update(instanciaMembros).set({ papel: novoPapel }).where(eq(instanciaMembros.id, row.id))
      console.log(`[MaxDoc]    ${row.entidadeId} (${row.instanciaId}): ${oldPapel} → ${novoPapel}`)
      totalFixed++
    }
  }

  console.log(`\n✅ ${totalFixed} registro(s) corrigido(s).`)
}

fix().catch(console.error)
