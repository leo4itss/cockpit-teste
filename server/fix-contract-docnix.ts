/**
 * Corrige o formato dos objetos do contrato ctr-atlas-comgas
 * para o padrão ObjetoContrato esperado pela UI.
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const objetoCorreto = JSON.stringify([{
    solucao:       'Atlas',
    orgContratada: 'Docnix',
    plano:         'Atlas Enterprise',
    licenciamento: '50 Usuários nominais',
    planoVersao:   1,
    valoresLicenca: [
      { tipoLicencaNome: 'Usuário nominal', tipoLicencaUnidade: 'usuários', valor: '50' }
    ]
  }])

  await sql`
    UPDATE contracts
    SET
      contratante = 'Comgas',
      objetos     = ${objetoCorreto}::jsonb,
      historico   = '[]'::jsonb
    WHERE id = 'ctr-atlas-comgas'
  `
  console.log('✅ Contrato ctr-atlas-comgas atualizado com formato correto')

  // Verifica
  const [row] = await sql`SELECT objetos FROM contracts WHERE id = 'ctr-atlas-comgas'`
  console.log('   objetos:', JSON.stringify(row.objetos))
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
