/**
 * Corrige os entidadeId dos instancia_membros que usavam IDs temporários
 * (u-fernando, u-neide) para os IDs reais na tabela users.
 */
import 'dotenv/config'
import { db } from './db'
import { instanciaMembros } from './schema'
import { eq } from 'drizzle-orm'

const MAPA: Record<string, string> = {
  'u-fernando': 'usr-fernando',
  'u-neide':    'usr-neide',
}

async function run() {
  for (const [idAntigo, idNovo] of Object.entries(MAPA)) {
    const result = await db
      .update(instanciaMembros)
      .set({ entidadeId: idNovo })
      .where(eq(instanciaMembros.entidadeId, idAntigo))
    console.log(`${idAntigo} → ${idNovo}`)
  }
  console.log('✅ IDs corrigidos.')
}

run().catch(console.error)
