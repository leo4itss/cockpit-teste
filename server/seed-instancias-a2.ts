import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const instancias = [
    { id: 'inst-a2-atend',    compId: 'comp-assistente-ia',     nome: 'Assistente Farmacêutico', desc: 'IA para atendimento na área farmacêutica.' },
    { id: 'inst-a2-suporte',  compId: 'comp-assistente-ia',     nome: 'Assistente Suporte',      desc: 'IA para suporte interno da Santacruz.'     },
    { id: 'inst-a2-kb-reg',   compId: 'comp-base-conhecimento', nome: 'Base Regulatório',        desc: 'Documentos regulatórios e compliance.'     },
    { id: 'inst-a2-kb-ops',   compId: 'comp-base-conhecimento', nome: 'Base Operações',          desc: 'Processos e manuais operacionais.'          },
    { id: 'inst-a2-dash-com', compId: 'comp-analytics',         nome: 'Dashboard Comercial',     desc: 'Métricas de vendas e distribuição.'        },
  ]

  for (const i of instancias) {
    await sql`
      INSERT INTO instancias (id, componente_id, account_id, nome, descricao, status, created_at)
      VALUES (${i.id}, ${i.compId}, 'a2', ${i.nome}, ${i.desc}, 'Ativo', to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao
    `
  }
  console.log('✅ 5 instâncias — Santacruz (a2)')

  const membros = [
    { id: 'im-a2-at-fernando', instId: 'inst-a2-atend',    tipo: 'user',  entId: 'u-fernando',     papel: 'member' },
    { id: 'im-a2-at-neide',    instId: 'inst-a2-atend',    tipo: 'user',  entId: 'u-neide',        papel: 'viewer' },
    { id: 'im-a2-sup-marcelo', instId: 'inst-a2-suporte',  tipo: 'user',  entId: 'u-marcelo',      papel: 'admin'  },
    { id: 'im-a2-sup-grp',     instId: 'inst-a2-suporte',  tipo: 'group', entId: 'g-analistas',    papel: 'viewer' },
    { id: 'im-a2-reg-forn',    instId: 'inst-a2-kb-reg',   tipo: 'group', entId: 'g-fornecedores', papel: 'viewer' },
    { id: 'im-a2-reg-neide',   instId: 'inst-a2-kb-reg',   tipo: 'user',  entId: 'u-neide',        papel: 'member' },
    { id: 'im-a2-ops-vend',    instId: 'inst-a2-kb-ops',   tipo: 'group', entId: 'g-vendedores',   papel: 'member' },
    { id: 'im-a2-ops-fern',    instId: 'inst-a2-kb-ops',   tipo: 'user',  entId: 'u-fernando',     papel: 'viewer' },
    { id: 'im-a2-dash-marc',   instId: 'inst-a2-dash-com', tipo: 'user',  entId: 'u-marcelo',      papel: 'member' },
    { id: 'im-a2-dash-aq',     instId: 'inst-a2-dash-com', tipo: 'group', entId: 'g-analistas',    papel: 'viewer' },
  ]

  for (const m of membros) {
    await sql`
      INSERT INTO instancia_membros (id, instancia_id, entidade_tipo, entidade_id, papel, assigned_at)
      VALUES (${m.id}, ${m.instId}, ${m.tipo}, ${m.entId}, ${m.papel}, to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log('✅ 10 membros atribuídos')
  console.log('🎉 Santacruz (a2) pronta para testar com Carla!')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
