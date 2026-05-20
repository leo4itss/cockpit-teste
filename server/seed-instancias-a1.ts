/**
 * Seed rápido: instâncias de teste para a conta a1 (Apple).
 *
 * Cenário: Account Admin (Ana/Carla) vê instâncias na aba Instâncias da AcessosPage.
 * Roda: npx tsx server/seed-instancias-a1.ts
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('Populando instâncias para conta a1 (Apple)...')

  // ── Instâncias ─────────────────────────────────────────────────
  const instancias = [
    // Assistente de IA
    { id: 'inst-a1-atendimento', compId: 'comp-assistente-ia',     nome: 'Assistente Atendimento', desc: 'IA para suporte ao cliente.'              },
    { id: 'inst-a1-vendas-ia',   compId: 'comp-assistente-ia',     nome: 'Assistente Comercial',   desc: 'IA de apoio à equipe de vendas.'          },
    // Base de Conhecimento
    { id: 'inst-a1-kb-rh',       compId: 'comp-base-conhecimento', nome: 'Base RH',                desc: 'Políticas internas e procedimentos de RH.' },
    { id: 'inst-a1-kb-produto',  compId: 'comp-base-conhecimento', nome: 'Base de Produto',        desc: 'Documentação técnica e release notes.'     },
    // Analytics
    { id: 'inst-a1-dash-exec',   compId: 'comp-analytics',         nome: 'Dashboard Executivo',    desc: 'KPIs estratégicos para a diretoria.'       },
  ]

  for (const inst of instancias) {
    await sql`
      INSERT INTO instancias (id, componente_id, account_id, nome, descricao, status, created_at)
      VALUES (${inst.id}, ${inst.compId}, 'a1', ${inst.nome}, ${inst.desc},
              'Ativo', to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO UPDATE SET
        nome      = EXCLUDED.nome,
        descricao = EXCLUDED.descricao
    `
  }
  console.log(`✅ ${instancias.length} instâncias criadas para a1`)

  // ── Membros de instância ────────────────────────────────────────
  // Usa os usuários existentes no banco (ids do seed principal)
  const membros = [
    // inst-a1-atendimento: Fernando viewer, Neide member
    { id: 'im-a1-atend-fernando', instId: 'inst-a1-atendimento', tipo: 'user',  entId: 'u-fernando', papel: 'viewer' },
    { id: 'im-a1-atend-neide',    instId: 'inst-a1-atendimento', tipo: 'user',  entId: 'u-neide',    papel: 'member' },
    // inst-a1-vendas-ia: grupo Vendedores member, Marcelo admin
    { id: 'im-a1-vend-grp',       instId: 'inst-a1-vendas-ia',   tipo: 'group', entId: 'g-vendedores', papel: 'member' },
    { id: 'im-a1-vend-marcelo',   instId: 'inst-a1-vendas-ia',   tipo: 'user',  entId: 'u-marcelo',  papel: 'admin'  },
    // inst-a1-kb-rh: grupo Analistas viewer, Neide member
    { id: 'im-a1-rh-aq',          instId: 'inst-a1-kb-rh',       tipo: 'group', entId: 'g-analistas',  papel: 'viewer' },
    { id: 'im-a1-rh-neide',       instId: 'inst-a1-kb-rh',       tipo: 'user',  entId: 'u-neide',    papel: 'member' },
    // inst-a1-kb-produto: grupo Fornecedores viewer, Fernando viewer
    { id: 'im-a1-prod-forn',      instId: 'inst-a1-kb-produto',  tipo: 'group', entId: 'g-fornecedores', papel: 'viewer' },
    { id: 'im-a1-prod-fernando',  instId: 'inst-a1-kb-produto',  tipo: 'user',  entId: 'u-fernando', papel: 'viewer' },
    // inst-a1-dash-exec: Marcelo member, grupo Analistas viewer
    { id: 'im-a1-exec-marcelo',   instId: 'inst-a1-dash-exec',   tipo: 'user',  entId: 'u-marcelo',  papel: 'member' },
    { id: 'im-a1-exec-aq',        instId: 'inst-a1-dash-exec',   tipo: 'group', entId: 'g-analistas',  papel: 'viewer' },
  ]

  for (const m of membros) {
    await sql`
      INSERT INTO instancia_membros (id, instancia_id, entidade_tipo, entidade_id, papel, assigned_at)
      VALUES (${m.id}, ${m.instId}, ${m.tipo}, ${m.entId}, ${m.papel},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log(`✅ ${membros.length} membros atribuídos`)

  console.log('\n🎉 Seed a1 concluído!')
  console.log('   Conta:      Apple (a1)')
  console.log('   Instâncias: Assistente Atendimento · Assistente Comercial · Base RH · Base de Produto · Dashboard Executivo')
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
