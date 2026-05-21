/**
 * Seed: persona "Marcelo — Org Admin Docnix"
 *
 * Execute com: npx tsx server/seed-marcelo-docnix.ts
 *
 * O que faz (idempotente):
 *   1. Reassocia acc-comgas → org-docnix (era org '1'/Apple)
 *   2. Cria solução "Atlas" para org-docnix
 *   3. Cria contrato Atlas ↔ acc-comgas
 *   4. Adiciona grupos Analistas de Qualidade e Vendedores como members de inst-vanessa
 *      (papéis: admin = pode criar/editar/excluir conversas; member = criar/editar)
 *   5. Adiciona component_permissions de "conversas" na inst-vanessa
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('🌱 Seed Marcelo — Org Admin Docnix — iniciando...\n')

  // ── 1. Reassociar acc-comgas → org-docnix ─────────────────────────────────
  await sql`
    UPDATE accounts
    SET org_id = 'org-docnix'
    WHERE id = 'acc-comgas'
  `
  console.log('✅ acc-comgas → org-docnix')

  // ── 2. Solução Atlas para org-docnix ─────────────────────────────────────
  await sql`
    INSERT INTO solutions (
      id, org_id, name, description, type, arquiteto_pas,
      componente_ids, plans, status, created_at
    ) VALUES (
      'sol-atlas-docnix',
      'org-docnix',
      'Atlas',
      'Plataforma conversacional para automação de fluxos com IA generativa. Funcionalidades: Chat (criação e gestão de conversas com assistentes de IA), Assistente Vanessa IA.',
      'IA Conversacional',
      'Marcelo Gomes',
      '["comp-assistente-ia"]',
      '[{"id":"plan-atlas-1","nome":"Atlas Enterprise","descricao":"Plano completo com chat ilimitado e assistentes dedicados","statusVersao":"ativo","createdAt":"01/01/2026","tiposLicenca":[{"tipoId":"tl-1","quantidade":50}]}]',
      'Ativo',
      '01/01/2026'
    )
    ON CONFLICT (id) DO UPDATE SET
      name        = EXCLUDED.name,
      description = EXCLUDED.description,
      status      = EXCLUDED.status
  `
  console.log('✅ Solução Atlas (sol-atlas-docnix)')

  // ── 3. Contrato Atlas ↔ Comgas ────────────────────────────────────────────
  await sql`
    INSERT INTO contracts (
      id, org_id, contratante, objetos, historico,
      data_inicio, data_termino, renovacao, status
    ) VALUES (
      'ctr-atlas-comgas',
      'org-docnix',
      'Comgas S.A.',
      '[{"id":"obj-1","solutionId":"sol-atlas-docnix","solutionName":"Atlas","planId":"plan-atlas-1","planName":"Atlas Enterprise","accountId":"acc-comgas","accountName":"Comgas","licencas":[{"tipoId":"tl-1","tipoNome":"Usuário nominal","quantidade":50}]}]',
      '[{"data":"01/01/2026","evento":"Contrato criado","usuario":"Marcelo Gomes"}]',
      '01/01/2026',
      '31/12/2026',
      'Anual',
      'Ativo'
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status
  `
  console.log('✅ Contrato Atlas ↔ Comgas (ctr-atlas-comgas)')

  // ── 4. Instância membros: grupos → inst-vanessa ───────────────────────────
  //   grp-comgas-aq  → admin  (criar + editar + excluir conversas)
  //   grp-comgas-vend → member (criar + editar conversas)
  const membrosVanessa = [
    { id: 'im-van-aq',   instId: 'inst-vanessa', tipo: 'group', entId: 'grp-comgas-aq',   papel: 'admin'  },
    { id: 'im-van-vend', instId: 'inst-vanessa', tipo: 'group', entId: 'grp-comgas-vend', papel: 'member' },
  ]
  for (const m of membrosVanessa) {
    await sql`
      INSERT INTO instancia_membros (id, instancia_id, entidade_tipo, entidade_id, papel, assigned_at)
      VALUES (${m.id}, ${m.instId}, ${m.tipo}, ${m.entId}, ${m.papel},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO UPDATE SET papel = EXCLUDED.papel
    `
  }
  console.log('✅ 2 grupos adicionados como membros de inst-vanessa (Analistas=admin, Vendedores=member)')

  // ── 5. Permissões de "conversas" para inst-vanessa ────────────────────────
  //   Analistas de Qualidade: criar + editar + excluir conversas
  //   Vendedores: criar + editar conversas
  const permsChat = [
    { id: 'perm-aq-chat-criar',   tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-assistente-ia', acao: 'can_create_conversation' },
    { id: 'perm-aq-chat-editar',  tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-assistente-ia', acao: 'can_edit_conversation'   },
    { id: 'perm-aq-chat-excluir', tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-assistente-ia', acao: 'can_delete_conversation' },
    { id: 'perm-vd-chat-criar',   tipo: 'group', entId: 'grp-comgas-vend', compId: 'comp-assistente-ia', acao: 'can_create_conversation' },
    { id: 'perm-vd-chat-editar',  tipo: 'group', entId: 'grp-comgas-vend', compId: 'comp-assistente-ia', acao: 'can_edit_conversation'   },
  ]
  for (const p of permsChat) {
    await sql`
      INSERT INTO component_permissions (id, entidade_tipo, entidade_id, componente_id, acao, created_at)
      VALUES (${p.id}, ${p.tipo}, ${p.entId}, ${p.compId}, ${p.acao},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log('✅ 5 permissões de Chat (criar/editar/excluir conversas)')

  console.log('\n🎉 Seed Marcelo — Org Admin Docnix concluído!')
  console.log('   Org:        Docnix (org-docnix)')
  console.log('   Conta:      Comgas (acc-comgas) — agora vinculada à Docnix')
  console.log('   Solução:    Atlas (sol-atlas-docnix)')
  console.log('   Contrato:   Atlas Enterprise ↔ Comgas')
  console.log('   Instância:  inst-vanessa com grupos Analistas (admin) + Vendedores (member)')
  console.log('   Permissões: Criar/Editar/Excluir conversas (Chat)')
  console.log('\n   Próximo passo: adicionar persona em src/authz/mock.ts')
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
