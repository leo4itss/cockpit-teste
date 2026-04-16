/**
 * reset-db.ts — apaga todas as tabelas e recria o schema via drizzle
 * Uso: npx tsx server/reset-db.ts
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('🗑️  Dropando tabelas existentes...')

  await sql`DROP TABLE IF EXISTS contracts CASCADE`
  await sql`DROP TABLE IF EXISTS solutions CASCADE`
  await sql`DROP TABLE IF EXISTS accounts CASCADE`
  await sql`DROP TABLE IF EXISTS organizations CASCADE`
  await sql`DROP TABLE IF EXISTS users CASCADE`
  await sql`DROP TABLE IF EXISTS tipos_licenca CASCADE`
  await sql`DROP TABLE IF EXISTS componentes CASCADE`

  console.log('✅ Tabelas removidas. Agora rode: npm run db:push')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
