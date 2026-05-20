/**
 * Seed do cenário de demonstração: Organização Docnix / Conta Comgas.
 *
 * Execute com: npx tsx server/seed-docnix.ts
 *
 * Cria (idempotente):
 *   • Org Docnix
 *   • Conta Comgas
 *   • 3 componentes: Assistente de IA, Base de Conhecimento, Analytics
 *   • 4 usuários: Fernando, Marcelo, Neide, Leo
 *   • 3 grupos (escopo conta): Analistas de Qualidade, Vendedores, Fornecedores
 *   • Memberships dos usuários nos grupos
 *   • Entitlements (todas as 3 capabilities ativas)
 *   • Permissões por grupo conforme modelo FGA (DSL Assistente IA + BdC)
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('🌱 Seed Docnix/Comgas — iniciando...\n')

  // ── 1. Organização Docnix ──────────────────────────────────────────────────
  await sql`
    INSERT INTO organizations (
      id, name, razao_social, doc_type, doc_number, domain,
      business_segment, activity_sector, arquiteto_pas,
      qtd_contas, qtd_solucoes, qtd_contratos,
      country, state, city, zip_code, address, complement, official_site,
      status, created_at, contacts
    ) VALUES (
      'org-docnix', 'Docnix', 'Docnix Soluções Digitais Ltda',
      'CNPJ', '12.345.678/0001-90', 'docnix.com.br',
      'tecnologia', 'Tecnologia da Informação', 'Marcelo Gomes',
      1, 1, 1,
      'Brasil', 'SP', 'São Paulo', '01310-100',
      'Av. Paulista, 1000', 'Conjunto 42', 'https://docnix.com.br',
      'Ativo', '01/01/2026', '[]'
    )
    ON CONFLICT (id) DO UPDATE SET
      name   = EXCLUDED.name,
      status = EXCLUDED.status
  `
  console.log('✅ Org Docnix (org-docnix)')

  // ── 2. Conta Comgas ────────────────────────────────────────────────────────
  await sql`
    INSERT INTO accounts (
      id, org_id, name, subdomain, provisioning_status,
      arquiteto_pas, is_default, status, created_at, admins
    ) VALUES (
      'acc-comgas', 'org-docnix', 'Comgas', 'comgas', 'COMPLETED',
      'Marcelo Gomes', true, 'Ativo', '01/01/2026', '[]'
    )
    ON CONFLICT (id) DO UPDATE SET
      name   = EXCLUDED.name,
      status = EXCLUDED.status
  `
  console.log('✅ Conta Comgas (acc-comgas)')

  // ── 3. Componentes (plataforma) ────────────────────────────────────────────
  // Três componentes alinhados com as capabilities da tela de Capacidades.
  const componentes = [
    {
      id:    'comp-assistente-ia',
      nome:  'Assistente de IA',
      desc:  'Permite que usuários da conta utilizem o assistente de IA (chat, RAG, agentes). Obrigatório para qualquer ação no assistente.',
      tipos: '["tl-1","tl-2","tl-4","tl-6"]',
    },
    {
      id:    'comp-base-conhecimento',
      nome:  'Base de Conhecimento',
      desc:  'Permite acesso à base de conhecimento corporativa para leitura e edição de documentos.',
      tipos: '["tl-3","tl-5"]',
    },
    {
      id:    'comp-analytics',
      nome:  'Analytics',
      desc:  'Permite acesso aos dashboards e relatórios analíticos da conta.',
      tipos: '["tl-1","tl-2"]',
    },
  ]

  for (const c of componentes) {
    await sql`
      INSERT INTO componentes (id, nome, descricao, metadata_url, tipos_licenca, created_at)
      VALUES (${c.id}, ${c.nome}, ${c.desc}, null, ${c.tipos},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO UPDATE SET
        nome      = EXCLUDED.nome,
        descricao = EXCLUDED.descricao
    `
  }
  console.log('✅ 3 componentes (Assistente de IA, Base de Conhecimento, Analytics)')

  // ── 4. Usuários da Comgas ──────────────────────────────────────────────────
  const usuarios = [
    { id: 'usr-fernando', nome: 'Fernando Costa',    usuario: 'fernandocosta',   email: 'fernando.costa@comgas.com.br',    cargo: 'Analista de Qualidade' },
    { id: 'usr-marcelo-c', nome: 'Marcelo Ribeiro',  usuario: 'marceloribeiro',  email: 'marcelo.ribeiro@comgas.com.br',   cargo: 'Executivo de Vendas' },
    { id: 'usr-neide',    nome: 'Neide Oliveira',    usuario: 'neideoliveira',   email: 'neide.oliveira@comgas.com.br',    cargo: 'Analista de Qualidade' },
    { id: 'usr-leo',      nome: 'Leo Ferreira',      usuario: 'leoferreira',     email: 'leo.ferreira@comgas.com.br',      cargo: 'Representante de Fornecedores' },
  ]

  for (const u of usuarios) {
    await sql`
      INSERT INTO users (
        id, nome_completo, usuario, email, pais, telefone,
        area, cargo, papel, etiquetas,
        formato_data, formato_hora, fuso_horario,
        status, ultimo_acesso, created_at
      ) VALUES (
        ${u.id}, ${u.nome}, ${u.usuario}, ${u.email},
        'Brasil', '', 'Comgas', ${u.cargo}, 'User', '',
        'DD/MM/YYYY', '24h', 'America/Sao_Paulo',
        'Ativo', to_char(current_date, 'DD/MM/YYYY'),
        to_char(current_date, 'DD/MM/YYYY')
      )
      ON CONFLICT (id) DO UPDATE SET
        nome_completo = EXCLUDED.nome_completo,
        email         = EXCLUDED.email
    `
  }
  console.log('✅ 4 usuários (Fernando, Marcelo, Neide, Leo)')

  // ── 5. Memberships usuário–conta (user_account_memberships) ───────────────
  const accountMemberships = [
    { id: 'uam-fernando-comgas',  userId: 'usr-fernando',  accountId: 'acc-comgas', papel: 'member' },
    { id: 'uam-marcelo-comgas',   userId: 'usr-marcelo-c', accountId: 'acc-comgas', papel: 'member' },
    { id: 'uam-neide-comgas',     userId: 'usr-neide',     accountId: 'acc-comgas', papel: 'member' },
    { id: 'uam-leo-comgas',       userId: 'usr-leo',       accountId: 'acc-comgas', papel: 'member' },
  ]
  for (const m of accountMemberships) {
    await sql`
      INSERT INTO user_account_memberships (id, user_id, account_id, papel, assigned_at)
      VALUES (${m.id}, ${m.userId}, ${m.accountId}, ${m.papel},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log('✅ 4 memberships usuário–conta')

  // ── 6. Grupos (escopo conta — Comgas) ─────────────────────────────────────
  const grupos = [
    {
      id:    'grp-comgas-aq',
      nome:  'Analistas de Qualidade',
      desc:  'Equipe responsável pela análise e controle de qualidade. Acesso ao assistente de IA e à base de conhecimento.',
      papel: 'User',
    },
    {
      id:    'grp-comgas-vend',
      nome:  'Vendedores',
      desc:  'Equipe comercial. Utiliza o assistente de IA para apoio às vendas e acompanha métricas no Analytics.',
      papel: 'User',
    },
    {
      id:    'grp-comgas-forn',
      nome:  'Fornecedores',
      desc:  'Parceiros e fornecedores externos. Acesso restrito à leitura da base de conhecimento.',
      papel: 'Viewer',
    },
  ]

  for (const g of grupos) {
    await sql`
      INSERT INTO grupos (id, nome, descricao, escopo, org_id, account_id, papel, status, created_at)
      VALUES (${g.id}, ${g.nome}, ${g.desc}, 'conta', null, 'acc-comgas', ${g.papel},
              'Ativo', to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO UPDATE SET
        nome       = EXCLUDED.nome,
        descricao  = EXCLUDED.descricao,
        papel      = EXCLUDED.papel
    `
  }
  console.log('✅ 3 grupos (Analistas de Qualidade, Vendedores, Fornecedores)')

  // ── 7. Memberships usuário–grupo (usuario_grupos) ─────────────────────────
  //
  //  Fernando  → Analistas de Qualidade
  //  Marcelo   → Vendedores + Analistas de Qualidade
  //  Neide     → Analistas de Qualidade + Fornecedores
  //  Leo       → Vendedores + Fornecedores
  //
  const grupoMemberships = [
    { id: 'ugm-fernando-aq',   userId: 'usr-fernando',  grupoId: 'grp-comgas-aq'   },
    { id: 'ugm-marcelo-vend',  userId: 'usr-marcelo-c', grupoId: 'grp-comgas-vend' },
    { id: 'ugm-marcelo-aq',    userId: 'usr-marcelo-c', grupoId: 'grp-comgas-aq'   },
    { id: 'ugm-neide-aq',      userId: 'usr-neide',     grupoId: 'grp-comgas-aq'   },
    { id: 'ugm-neide-forn',    userId: 'usr-neide',     grupoId: 'grp-comgas-forn' },
    { id: 'ugm-leo-vend',      userId: 'usr-leo',       grupoId: 'grp-comgas-vend' },
    { id: 'ugm-leo-forn',      userId: 'usr-leo',       grupoId: 'grp-comgas-forn' },
  ]

  for (const m of grupoMemberships) {
    await sql`
      INSERT INTO usuario_grupos (id, user_id, grupo_id, assigned_at)
      VALUES (${m.id}, ${m.userId}, ${m.grupoId},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log('✅ 7 memberships usuário–grupo')

  // ── 8. Entitlements da Comgas — todas as 3 capabilities ativas ─────────────
  const entitlements = [
    { id: 'ent-comgas-assistant', cap: 'assistant.use' },
    { id: 'ent-comgas-knowledge', cap: 'knowledge.use' },
    { id: 'ent-comgas-analytics', cap: 'analytics.use' },
  ]

  for (const e of entitlements) {
    await sql`
      INSERT INTO account_entitlements (id, account_id, capability, enabled_at)
      VALUES (${e.id}, 'acc-comgas', ${e.cap},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log('✅ 3 entitlements (assistant.use, knowledge.use, analytics.use)')

  // ── 9. Permissões por grupo ────────────────────────────────────────────────
  //
  // Baseado nos DSLs fornecidos:
  //
  // Analistas de Qualidade
  //   → Assistente de IA : can_use_assistant, can_view_consulted_sources,
  //                        can_share_conversation_results, can_upload_rag_sources
  //   → Base de Conhecimento : pode_ler, pode_criar_documento,
  //                            pode_editar, pode_enviar_para_aprovacao
  //
  // Vendedores
  //   → Assistente de IA : can_use_assistant, can_share_conversation_results
  //   → Analytics        : can_view_dashboards
  //
  // Fornecedores
  //   → Base de Conhecimento : pode_ler
  //
  const permissoes: Array<{ id: string; tipo: string; entId: string; compId: string; acao: string }> = [
    // Analistas de Qualidade — Assistente de IA
    { id: 'perm-aq-ai-use',    tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-assistente-ia',     acao: 'can_use_assistant'              },
    { id: 'perm-aq-ai-src',    tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-assistente-ia',     acao: 'can_view_consulted_sources'      },
    { id: 'perm-aq-ai-share',  tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-assistente-ia',     acao: 'can_share_conversation_results'  },
    { id: 'perm-aq-ai-rag',    tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-assistente-ia',     acao: 'can_upload_rag_sources'          },
    // Analistas de Qualidade — Base de Conhecimento
    { id: 'perm-aq-bk-ler',    tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-base-conhecimento', acao: 'pode_ler'                        },
    { id: 'perm-aq-bk-criar',  tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-base-conhecimento', acao: 'pode_criar_documento'            },
    { id: 'perm-aq-bk-edit',   tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-base-conhecimento', acao: 'pode_editar'                     },
    { id: 'perm-aq-bk-aprov',  tipo: 'group', entId: 'grp-comgas-aq',   compId: 'comp-base-conhecimento', acao: 'pode_enviar_para_aprovacao'      },
    // Vendedores — Assistente de IA
    { id: 'perm-vd-ai-use',    tipo: 'group', entId: 'grp-comgas-vend', compId: 'comp-assistente-ia',     acao: 'can_use_assistant'               },
    { id: 'perm-vd-ai-share',  tipo: 'group', entId: 'grp-comgas-vend', compId: 'comp-assistente-ia',     acao: 'can_share_conversation_results'  },
    // Vendedores — Analytics
    { id: 'perm-vd-an-view',   tipo: 'group', entId: 'grp-comgas-vend', compId: 'comp-analytics',         acao: 'can_view_dashboards'             },
    // Fornecedores — Base de Conhecimento
    { id: 'perm-fn-bk-ler',    tipo: 'group', entId: 'grp-comgas-forn', compId: 'comp-base-conhecimento', acao: 'pode_ler'                        },
  ]

  for (const p of permissoes) {
    await sql`
      INSERT INTO component_permissions (id, entidade_tipo, entidade_id, componente_id, acao, created_at)
      VALUES (${p.id}, ${p.tipo}, ${p.entId}, ${p.compId}, ${p.acao},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log(`✅ ${permissoes.length} permissões de grupo`)

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed Docnix/Comgas concluído!')
  console.log('   Org:         Docnix (org-docnix)')
  console.log('   Conta:       Comgas (acc-comgas)')
  console.log('   Componentes: Assistente de IA · Base de Conhecimento · Analytics')
  console.log('   Usuários:    Fernando · Marcelo · Neide · Leo')
  console.log('   Grupos:      Analistas de Qualidade · Vendedores · Fornecedores')
  console.log('')
  console.log('   Permissões:')
  console.log('   Analistas de Qualidade → Assistente de IA: usar, ver fontes, compartilhar, upload RAG')
  console.log('   Analistas de Qualidade → Base de Conhecimento: ler, criar, editar, enviar aprovação')
  console.log('   Vendedores             → Assistente de IA: usar, compartilhar')
  console.log('   Vendedores             → Analytics: ver dashboards')
  console.log('   Fornecedores           → Base de Conhecimento: ler')
}

main().catch(err => {
  console.error('❌ Erro no seed:', err.message)
  process.exit(1)
})
