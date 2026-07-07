/**
 * Seed aditivo: gera uma massa sintética de usuários vinculados a uma conta,
 * para testar paginação (50/página) e atribuição em massa na aba Usuários
 * de Acessos. Não apaga nada — só insere (idempotente via ON CONFLICT).
 *
 * Execute com: npx tsx server/seed-massa-usuarios.ts [accountId] [quantidade]
 * Padrão: accountId='a1' (Apple), quantidade=150
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const ACCOUNT_ID = process.argv[2] ?? 'a1'
const QTD        = parseInt(process.argv[3] ?? '150', 10)

const PREFIXO_ID = 'massa'

const PRIMEIROS_NOMES = [
  'Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Hugo',
  'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olivia', 'Pedro',
  'Quésia', 'Rafael', 'Sabrina', 'Thiago', 'Ursula', 'Victor', 'Wesley', 'Yasmin',
  'Zeca', 'Amanda', 'Bernardo', 'Camila', 'Diego', 'Elisa', 'Fernando', 'Giovanna',
  'Henrique', 'Iris', 'Jonas', 'Kelly', 'Leonardo', 'Melissa', 'Natan', 'Otavio',
]
const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Moreira',
]
const AREAS = ['Engenharia', 'Produto', 'Design', 'Vendas', 'Suporte', 'Marketing', 'RH', 'Financeiro']
const CARGOS: Record<string, string[]> = {
  Engenharia: ['Desenvolvedor', 'Tech Lead', 'QA Engineer'],
  Produto:    ['Product Manager', 'Product Owner', 'Analista de Produto'],
  Design:     ['UX Designer', 'UI Designer', 'Design Lead'],
  Vendas:     ['Executivo de Contas', 'SDR', 'Gerente Comercial'],
  Suporte:    ['Analista de Suporte', 'Especialista Técnico'],
  Marketing:  ['Analista de Marketing', 'Growth Manager'],
  RH:         ['Analista de RH', 'Business Partner'],
  Financeiro: ['Analista Financeiro', 'Controller'],
}

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

async function main() {
  console.log(`🌱 Gerando ${QTD} usuários sintéticos para a conta ${ACCOUNT_ID}...\n`)

  const [acc] = await sql`SELECT id, name FROM accounts WHERE id = ${ACCOUNT_ID}`
  if (!acc) {
    console.error(`❌ Conta ${ACCOUNT_ID} não encontrada.`)
    process.exit(1)
  }

  let inseridos = 0
  for (let i = 1; i <= QTD; i++) {
    const primeiro = PRIMEIROS_NOMES[i % PRIMEIROS_NOMES.length]
    const sobrenome = SOBRENOMES[Math.floor(i / PRIMEIROS_NOMES.length) % SOBRENOMES.length]
    const nomeCompleto = `${primeiro} ${sobrenome} ${i}` // sufixo garante nome exibível único
    const usuario = `${normalizar(primeiro)}.${normalizar(sobrenome)}${i}`
    const email = `${usuario}@massa-teste.com.br`
    const area = AREAS[i % AREAS.length]
    const cargo = CARGOS[area][i % CARGOS[area].length]
    const status = i % 10 === 0 ? 'Inativo' : 'Ativo' // ~10% inativos, para testar o filtro de status
    const userId = `${PREFIXO_ID}-${String(i).padStart(4, '0')}`

    await sql`
      INSERT INTO users (id, nome_completo, usuario, email, pais, telefone,
                         area, cargo, papel, etiquetas, formato_data, formato_hora,
                         fuso_horario, status, ultimo_acesso, created_at)
      VALUES (
        ${userId}, ${nomeCompleto}, ${usuario}, ${email},
        'Brasil', '', ${area}, ${cargo}, '', '',
        'DD/MM/YYYY', '24h', 'America/Sao_Paulo', ${status}, '',
        to_char(current_date, 'DD/MM/YYYY')
      )
      ON CONFLICT (id) DO NOTHING
    `

    await sql`
      INSERT INTO user_account_memberships (id, user_id, account_id, papel, assigned_at)
      VALUES (${userId + '-' + ACCOUNT_ID}, ${userId}, ${ACCOUNT_ID}, 'member',
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
    inseridos++
    if (inseridos % 25 === 0) console.log(`  ...${inseridos}/${QTD}`)
  }

  console.log(`\n✅ ${inseridos} usuários sintéticos inseridos/garantidos na conta "${acc.name}" (${ACCOUNT_ID})`)
  console.log(`   IDs: ${PREFIXO_ID}-0001 .. ${PREFIXO_ID}-${String(QTD).padStart(4, '0')}`)
  console.log(`   Para remover depois: npx tsx server/seed-massa-usuarios.ts --limpar ${ACCOUNT_ID}`)
}

async function limpar(accountId: string) {
  console.log(`🧹 Removendo usuários sintéticos (prefixo "${PREFIXO_ID}-") da conta ${accountId}...`)
  const ids = await sql`SELECT id FROM users WHERE id LIKE ${PREFIXO_ID + '-%'}`
  const idList = ids.map((r: any) => r.id)
  if (idList.length === 0) {
    console.log('Nada para remover.')
    return
  }
  await sql`DELETE FROM usuario_grupos WHERE user_id LIKE ${PREFIXO_ID + '-%'}`
  await sql`DELETE FROM user_account_memberships WHERE user_id LIKE ${PREFIXO_ID + '-%'}`
  await sql`DELETE FROM component_permissions WHERE entidade_id LIKE ${PREFIXO_ID + '-%'}`
  await sql`DELETE FROM instancia_membros WHERE entidade_id LIKE ${PREFIXO_ID + '-%'}`
  await sql`DELETE FROM users WHERE id LIKE ${PREFIXO_ID + '-%'}`
  console.log(`✅ ${idList.length} usuários sintéticos removidos.`)
}

if (process.argv[2] === '--limpar') {
  limpar(process.argv[3] ?? 'a1').catch(err => { console.error('❌', err.message); process.exit(1) })
} else {
  main().catch(err => { console.error('❌ Erro no seed:', err.message); process.exit(1) })
}
