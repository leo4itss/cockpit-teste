/**
 * Seed de dados de teste para validação do modelo FGA.
 * Execute com: npx tsx server/seed-test-data.ts
 *
 * Idempotente — usa INSERT ... ON CONFLICT DO NOTHING ou UPDATE.
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('🌱 Iniciando seed de dados de teste...\n')

  // ── 1. Persona Account Admin (Carla) ─────────────────────────────────────
  // id='4' deve coincidir com mockFGARelations para que o AtribuirPapelSheet
  // encontre os papéis corretos ao selecionar o usuário.
  await sql`
    INSERT INTO users (id, nome_completo, usuario, email, pais, telefone,
                       area, cargo, papel, etiquetas, formato_data, formato_hora,
                       fuso_horario, status, ultimo_acesso, created_at)
    VALUES (
      '4', 'Carla Santos', 'carlasantos', 'carla.santos@grupoitss.com.br',
      'Brasil', '(13) 9 8800-4400', 'Operações', 'Account Admin',
      'Account Admin', '', 'DD/MM/YYYY', '24h',
      'America/Sao_Paulo', 'Ativo', '13/05/2026', '01/03/2026'
    )
    ON CONFLICT (id) DO NOTHING
  `
  console.log('✅ Usuário Carla Santos (id=4) inserida')

  // ── 2. Garantir conta a1 (Apple) existe ──────────────────────────────────
  await sql`
    INSERT INTO accounts (id, org_id, name, subdomain, provisioning_status,
                          arquiteto_pas, is_default, status, created_at)
    VALUES ('a1', '1', 'Apple', 'appletecgo', 'COMPLETED',
            'Marcelo Gomes', true, 'Ativo', '23/03/2026')
    ON CONFLICT (id) DO NOTHING
  `
  console.log('✅ Conta a1 (Apple) garantida')

  // ── 3. Grupos org-level realistas ─────────────────────────────────────────
  const gruposOrg = [
    { id: 'grp-viewers',     nome: 'Equipe Viewer',         descricao: 'Acesso somente leitura a todos os componentes', orgId: '1' },
    { id: 'grp-eng',         nome: 'Engenharia de IA',       descricao: 'Equipe de desenvolvimento dos assistentes PAS', orgId: '1' },
    { id: 'grp-produto',     nome: 'Produto & Design',       descricao: 'Responsáveis por roadmap e UX das soluções',    orgId: '1' },
    { id: 'grp-suporte',     nome: 'Suporte Técnico',        descricao: 'Atende chamados e gerencia SLAs dos clientes',  orgId: '1' },
    { id: 'grp-dados',       nome: 'Dados & Analytics',      descricao: 'Cuida das bases de conhecimento e pipelines',   orgId: '1' },
  ]

  for (const g of gruposOrg) {
    await sql`
      INSERT INTO grupos (id, nome, descricao, escopo, org_id, account_id, status, created_at)
      VALUES (${g.id}, ${g.nome}, ${g.descricao}, 'org', ${g.orgId}, null, 'Ativo',
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO UPDATE SET
        nome     = EXCLUDED.nome,
        descricao = EXCLUDED.descricao,
        escopo   = 'org',
        org_id   = EXCLUDED.org_id
    `
  }
  console.log(`✅ ${gruposOrg.length} grupos org-level inseridos/atualizados`)

  // ── 4. Grupo conta-level (Santacruz / a2) ────────────────────────────────
  await sql`
    INSERT INTO grupos (id, nome, descricao, escopo, org_id, account_id, status, created_at)
    VALUES (
      'grp-a2-ops',
      'Equipe Ops Santacruz',
      'Grupo operacional restrito à conta Santacruz — gerenciado pela Account Admin',
      'conta', null, 'a2', 'Ativo',
      to_char(current_date, 'DD/MM/YYYY')
    )
    ON CONFLICT (id) DO UPDATE SET
      nome       = EXCLUDED.nome,
      descricao  = EXCLUDED.descricao,
      escopo     = 'conta',
      account_id = 'a2'
  `
  console.log('✅ Grupo grp-a2-ops (conta Santacruz) inserido/atualizado')

  // Mais grupos conta-level para outras contas
  const gruposConta = [
    { id: 'grp-a1-admin',  nome: 'Admins Apple',       accountId: 'a1', desc: 'Administradores da conta Apple' },
    { id: 'grp-a1-users',  nome: 'Usuários Apple',     accountId: 'a1', desc: 'Usuários finais da conta Apple' },
    { id: 'grp-a2-leitura',nome: 'Leitores Santacruz', accountId: 'a2', desc: 'Acesso apenas leitura em Santacruz' },
  ]

  for (const g of gruposConta) {
    await sql`
      INSERT INTO grupos (id, nome, descricao, escopo, org_id, account_id, status, created_at)
      VALUES (${g.id}, ${g.nome}, ${g.desc}, 'conta', null, ${g.accountId}, 'Ativo',
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO UPDATE SET
        nome       = EXCLUDED.nome,
        escopo     = 'conta',
        account_id = EXCLUDED.account_id
    `
  }
  console.log(`✅ ${gruposConta.length} grupos conta-level inseridos/atualizados`)

  // ── 5. Componentes enriquecidos ───────────────────────────────────────────
  // Garante que comp-1 (PAS Core) existe e tem metadataUrl de demonstração
  await sql`
    INSERT INTO componentes (id, nome, descricao, metadata_url, tipos_licenca, created_at)
    VALUES (
      'comp-1', 'PAS Core', 'Motor principal dos assistentes de IA',
      'https://api.grupoitss.com.br/pas-core/metadata',
      '["tl-1","tl-2","tl-4","tl-6"]', '01/01/2026'
    )
    ON CONFLICT (id) DO UPDATE SET
      descricao    = EXCLUDED.descricao,
      metadata_url = EXCLUDED.metadata_url
  `

  await sql`
    INSERT INTO componentes (id, nome, descricao, metadata_url, tipos_licenca, created_at)
    VALUES (
      'comp-2', 'Knowledge Base', 'Base de conhecimento vetorial com RAG',
      null,
      '["tl-3","tl-5"]', '01/01/2026'
    )
    ON CONFLICT (id) DO UPDATE SET
      descricao = EXCLUDED.descricao
  `

  // Componentes extras para teste
  const compsExtras = [
    {
      id: 'comp-3', nome: 'PAS Analytics',
      descricao: 'Dashboard de métricas e uso dos assistentes',
      metadataUrl: null,
      tipos: '["tl-1","tl-2"]',
    },
    {
      id: 'comp-4', nome: 'Assistente de Atendimento',
      descricao: 'Assistente de IA especializado em suporte ao cliente',
      metadataUrl: 'https://api.grupoitss.com.br/atendimento/metadata',
      tipos: '["tl-1","tl-4","tl-6"]',
    },
    {
      id: 'comp-5', nome: 'Base Jurídica',
      descricao: 'Base de conhecimento vetorial com foco em legislação e contratos',
      metadataUrl: null,
      tipos: '["tl-3","tl-5"]',
    },
    {
      id: 'comp-6', nome: 'Assistente Financeiro',
      descricao: 'Assistente de IA para análise e consulta de dados financeiros',
      metadataUrl: null,
      tipos: '["tl-1","tl-2","tl-6"]',
    },
  ]

  for (const c of compsExtras) {
    await sql`
      INSERT INTO componentes (id, nome, descricao, metadata_url, tipos_licenca, created_at)
      VALUES (
        ${c.id}, ${c.nome}, ${c.descricao}, ${c.metadataUrl},
        ${c.tipos}, to_char(current_date, 'DD/MM/YYYY')
      )
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log(`✅ ${compsExtras.length + 2} componentes garantidos no banco`)

  // ── 6. Membros nos grupos (via usuario_grupos) ────────────────────────────
  // Adiciona os usuários fixos (1, 2, 3, 4) como membros dos grupos mock
  const memberships = [
    { grupoId: 'grp-viewers',  userId: '2' },  // Ana no grp-viewers
    { grupoId: 'grp-a2-ops',   userId: '4' },  // Carla no grp-a2-ops
    { grupoId: 'grp-eng',      userId: '3' },  // Marcelo na Engenharia
    { grupoId: 'grp-produto',  userId: '2' },  // Ana no Produto
    { grupoId: 'grp-a1-admin', userId: '2' },  // Ana em Admin Apple
    { grupoId: 'grp-a1-users', userId: '3' },  // Marcelo em Users Apple
    { grupoId: 'grp-a2-leitura', userId: '4' },// Carla em Leitores Santacruz
  ]

  for (const m of memberships) {
    const id = `${m.grupoId}-${m.userId}`
    await sql`
      INSERT INTO usuario_grupos (id, user_id, grupo_id, assigned_at)
      VALUES (${id}, ${m.userId}, ${m.grupoId}, to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log(`✅ ${memberships.length} memberships de grupos inseridos`)

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed concluído!')
  console.log('   Usuarios fixos: 1=Leonardo, 2=Ana, 3=Marcelo, 4=Carla (Account Admin)')
  console.log('   Grupos org:     grp-viewers, grp-eng, grp-produto, grp-suporte, grp-dados')
  console.log('   Grupos conta:   grp-a2-ops, grp-a1-admin, grp-a1-users, grp-a2-leitura')
  console.log('   Componentes:    comp-1..comp-6 (PAS Core, KB, Analytics, Atendimento, Jurídica, Financeiro)')
}

main().catch(err => {
  console.error('❌ Erro no seed:', err.message)
  process.exit(1)
})
