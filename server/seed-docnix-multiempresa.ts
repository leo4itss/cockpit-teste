/**
 * Seed: Cenário Multi-empresa Docnix — Hospital Elfa
 *
 * Demonstra o diferencial do PAS frente ao Docnix atual:
 * um mesmo usuário pode ter papéis DISTINTOS por "empresa" (instância MaxDoc).
 * No Docnix hoje isso não é possível — permissões são herdadas globalmente.
 *
 * Pré-requisito:
 *   npx tsx server/seed-docnix.ts           (cria org-docnix)
 *   npx tsx server/seed-docnix-atribuicoes.ts  (cria comp-maxdoc + atribuições)
 *
 * Execute com:
 *   npx tsx server/seed-docnix-multiempresa.ts
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { db } from './db'
import { componentes, instancias, instanciaMembros, instanciaMembroAtribuicoes, componentPermissions } from './schema'
import { eq } from 'drizzle-orm'

const sql = neon(process.env.DATABASE_URL!)

const ORG_ID    = 'org-docnix'
const ACCOUNT_ID = 'acc-elfa'

async function main() {
  console.log('🌱 Seed Multi-empresa Docnix — Hospital Elfa\n')

  // ── 1. Conta Hospital Elfa ────────────────────────────────────────────────
  await sql`
    INSERT INTO accounts (
      id, org_id, name, subdomain, provisioning_status,
      arquiteto_pas, is_default, status, created_at, admins
    ) VALUES (
      ${ACCOUNT_ID}, ${ORG_ID}, 'Hospital Elfa', 'elfa', 'COMPLETED',
      'River Valadão', false, 'Ativo', to_char(current_date, 'DD/MM/YYYY'), '[]'
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
  `
  console.log('✅ Conta Hospital Elfa (acc-elfa)')

  // ── 2. Usuários ───────────────────────────────────────────────────────────
  const usuarios = [
    {
      id: 'usr-carlos-elfa',
      nome: 'Carlos Mendes',
      usuario: 'carlosmendes',
      email: 'carlos.mendes@elfa.com.br',
      cargo: 'Gerente de Qualidade Corporativo',
    },
    {
      id: 'usr-beatriz-elfa',
      nome: 'Beatriz Santos',
      usuario: 'beatrizsantos',
      email: 'beatriz.santos@elfa.com.br',
      cargo: 'Analista de Documentos',
    },
    {
      id: 'usr-joao-elfa',
      nome: 'João Pereira',
      usuario: 'joaopereira',
      email: 'joao.pereira@elfa.com.br',
      cargo: 'Técnico de Qualidade',
    },
  ]

  for (const u of usuarios) {
    await sql`
      INSERT INTO users (
        id, nome_completo, usuario, email, pais, telefone, area, cargo,
        papel, etiquetas, formato_data, formato_hora, fuso_horario,
        status, ultimo_acesso, created_at
      ) VALUES (
        ${u.id}, ${u.nome}, ${u.usuario}, ${u.email},
        'Brasil', '', 'Hospital Elfa', ${u.cargo},
        'User', '', 'DD/MM/YYYY', '24h', 'America/Sao_Paulo',
        'Ativo', to_char(current_date, 'DD/MM/YYYY'), to_char(current_date, 'DD/MM/YYYY')
      )
      ON CONFLICT (id) DO UPDATE SET
        nome_completo = EXCLUDED.nome_completo,
        email         = EXCLUDED.email
    `
  }
  console.log('✅ 3 usuários (Carlos, Beatriz, João)')

  // ── 3. Memberships usuário–conta ─────────────────────────────────────────
  const memberships = [
    { id: 'uam-carlos-elfa',  userId: 'usr-carlos-elfa',  papel: 'account_admin' },
    { id: 'uam-beatriz-elfa', userId: 'usr-beatriz-elfa', papel: 'member'        },
    { id: 'uam-joao-elfa',    userId: 'usr-joao-elfa',    papel: 'member'        },
  ]
  for (const m of memberships) {
    await sql`
      INSERT INTO user_account_memberships (id, user_id, account_id, papel, assigned_at)
      VALUES (${m.id}, ${m.userId}, ${ACCOUNT_ID}, ${m.papel},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log('✅ 3 memberships usuário–conta')

  // ── 4. Grupos ─────────────────────────────────────────────────────────────
  const grupos = [
    {
      id:   'grp-elfa-aprovadores',
      nome: 'Aprovadores Corporativos',
      desc: 'Responsáveis por aprovar documentos nas unidades Central e Norte.',
    },
    {
      id:   'grp-elfa-editores',
      nome: 'Editores Docnix',
      desc: 'Equipe que cria e edita documentos nas unidades Central e Norte.',
    },
  ]
  for (const g of grupos) {
    await sql`
      INSERT INTO grupos (id, nome, descricao, escopo, org_id, account_id, papel, status, created_at)
      VALUES (
        ${g.id}, ${g.nome}, ${g.desc}, 'conta',
        ${ORG_ID}, ${ACCOUNT_ID}, 'User', 'Ativo',
        to_char(current_date, 'DD/MM/YYYY')
      )
      ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao
    `
  }
  console.log('✅ 2 grupos (Aprovadores Corporativos, Editores Docnix)')

  // ── 5. Memberships usuário–grupo ─────────────────────────────────────────
  //   Beatriz → Editores Docnix
  //   João    → Aprovadores Corporativos
  const grupoMemberships = [
    { id: 'ugm-beatriz-editores',  userId: 'usr-beatriz-elfa', grupoId: 'grp-elfa-editores'    },
    { id: 'ugm-joao-aprovadores',  userId: 'usr-joao-elfa',    grupoId: 'grp-elfa-aprovadores' },
  ]
  for (const m of grupoMemberships) {
    await sql`
      INSERT INTO usuario_grupos (id, user_id, grupo_id, assigned_at)
      VALUES (${m.id}, ${m.userId}, ${m.grupoId},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log('✅ 2 memberships usuário–grupo')

  // ── 6. Entitlement MaxDoc ─────────────────────────────────────────────────
  await sql`
    INSERT INTO account_entitlements (id, account_id, capability, enabled_at)
    VALUES ('ent-elfa-maxdoc', ${ACCOUNT_ID}, 'maxdoc.use',
            to_char(current_date, 'DD/MM/YYYY'))
    ON CONFLICT (id) DO NOTHING
  `
  console.log('✅ Entitlement maxdoc.use (Hospital Elfa)')

  // ── 7. Localiza componente MaxDoc ─────────────────────────────────────────
  const comps = await db.select().from(componentes)
  const maxdoc = comps.find(c => c.nome.toLowerCase().includes('maxdoc'))
  if (!maxdoc) {
    throw new Error(
      'Componente MaxDoc não encontrado. Execute primeiro: npx tsx server/seed-docnix-atribuicoes.ts',
    )
  }
  await db.update(componentes).set({ status: 'Ativo' }).where(eq(componentes.id, maxdoc.id))
  const maxdocId = maxdoc.id
  console.log(`✅ Componente MaxDoc ativo (${maxdocId})`)

  // ── 8. Instâncias MaxDoc — uma por "empresa" (unidade hospitalar) ─────────
  const instanciasData = [
    {
      id:   'inst-elfa-central',
      nome: 'MaxDoc — Hospital Central',
      desc: 'Empresa padrão. Gestão documental da unidade sede.',
    },
    {
      id:   'inst-elfa-norte',
      nome: 'MaxDoc — Unidade Norte',
      desc: 'Gestão documental da unidade Norte.',
    },
    {
      id:   'inst-elfa-sul',
      nome: 'MaxDoc — Unidade Sul',
      desc: 'Gestão documental da unidade Sul.',
    },
  ]

  for (const inst of instanciasData) {
    await db
      .insert(instancias)
      .values({
        id: inst.id,
        componenteId: maxdocId,
        accountId: ACCOUNT_ID,
        nome: inst.nome,
        descricao: inst.desc,
        status: 'Ativo',
        createdAt: new Date().toLocaleDateString('pt-BR'),
      })
      .onConflictDoUpdate({
        target: instancias.id,
        set: { nome: inst.nome, descricao: inst.desc, status: 'Ativo' },
      })
    console.log(`  ✅ "${inst.nome}"`)
  }

  // ── 9. Membros de instância — o cenário central ───────────────────────────
  //
  // ┌─────────────────────┬─────────────────┬──────────────────────┐
  // │ Sujeito             │ Papel           │ Objeto               │
  // ├─────────────────────┼─────────────────┼──────────────────────┤
  // │ Carlos Mendes       │ Administrador   │ Hospital Central     │
  // │ Carlos Mendes       │ Leitor          │ Unidade Norte        │  ← papel diferente!
  // │ Carlos Mendes       │ — sem acesso —  │ Unidade Sul          │  ← isolamento!
  // │ Grupo Editores      │ Editor          │ Central + Norte      │
  // │ Grupo Aprovadores   │ Aprovador       │ Central + Norte      │
  // │ Beatriz (direto)    │ Leitor          │ Unidade Sul          │  ← menor que via grupo
  // └─────────────────────┴─────────────────┴──────────────────────┘
  //
  // Carlos ter ADMIN no Central e LEITOR no Norte com o MESMO login é
  // IMPOSSÍVEL no Docnix atual → é exatamente o que o PAS resolve.

  type MembroData = {
    id: string
    instanciaId: string
    entidadeTipo: 'user' | 'group'
    entidadeId: string
    papel: string
    atribuicaoIds: string[]
  }

  const membros: MembroData[] = [
    // Carlos — Hospital Central: Administrador
    {
      id: 'im-elfa-carlos-central',
      instanciaId: 'inst-elfa-central',
      entidadeTipo: 'user',
      entidadeId: 'usr-carlos-elfa',
      papel: 'admin-maxdoc',
      atribuicaoIds: [
        'atrib-maxdoc-admin-modulo',
        'atrib-maxdoc-acessar-todos',
        'atrib-maxdoc-criar-doc',
        'atrib-maxdoc-editar-doc',
        'atrib-maxdoc-aprovar-doc',
        'atrib-maxdoc-revisar-doc',
        'atrib-maxdoc-excluir-doc',
        'atrib-maxdoc-obsoletetar-doc',
        'atrib-maxdoc-controle-acesso',
      ],
    },
    // Carlos — Unidade Norte: LEITOR (papel completamente diferente)
    {
      id: 'im-elfa-carlos-norte',
      instanciaId: 'inst-elfa-norte',
      entidadeTipo: 'user',
      entidadeId: 'usr-carlos-elfa',
      papel: 'leitor',
      atribuicaoIds: [
        'atrib-maxdoc-leitor-doc',
        'atrib-maxdoc-leitor-anexos',
        'atrib-maxdoc-ler-todos',
      ],
    },
    // Carlos NÃO tem acesso à Unidade Sul (sem entrada na tabela)

    // Grupo Editores — Hospital Central: Editor
    {
      id: 'im-elfa-editores-central',
      instanciaId: 'inst-elfa-central',
      entidadeTipo: 'group',
      entidadeId: 'grp-elfa-editores',
      papel: 'editor',
      atribuicaoIds: [
        'atrib-maxdoc-criar-doc',
        'atrib-maxdoc-editar-doc',
        'atrib-maxdoc-nova-versao',
        'atrib-maxdoc-submeter-aprovacao',
        'atrib-maxdoc-download-doc',
        'atrib-maxdoc-imprimir',
      ],
    },
    // Grupo Editores — Unidade Norte: Editor
    {
      id: 'im-elfa-editores-norte',
      instanciaId: 'inst-elfa-norte',
      entidadeTipo: 'group',
      entidadeId: 'grp-elfa-editores',
      papel: 'editor',
      atribuicaoIds: [
        'atrib-maxdoc-criar-doc',
        'atrib-maxdoc-editar-doc',
        'atrib-maxdoc-nova-versao',
        'atrib-maxdoc-submeter-aprovacao',
        'atrib-maxdoc-download-doc',
        'atrib-maxdoc-imprimir',
      ],
    },
    // Grupo Aprovadores — Hospital Central: Aprovador
    {
      id: 'im-elfa-aprovadores-central',
      instanciaId: 'inst-elfa-central',
      entidadeTipo: 'group',
      entidadeId: 'grp-elfa-aprovadores',
      papel: 'aprovador',
      atribuicaoIds: [
        'atrib-maxdoc-aprovar-doc',
        'atrib-maxdoc-aprov-subst-doc',
        'atrib-maxdoc-ciclo-aprov-doc',
        'atrib-maxdoc-obsoletetar-doc',
        'atrib-maxdoc-emitir-copia-ctrl',
        'atrib-maxdoc-assinatura-eletronica',
      ],
    },
    // Grupo Aprovadores — Unidade Norte: Aprovador
    {
      id: 'im-elfa-aprovadores-norte',
      instanciaId: 'inst-elfa-norte',
      entidadeTipo: 'group',
      entidadeId: 'grp-elfa-aprovadores',
      papel: 'aprovador',
      atribuicaoIds: [
        'atrib-maxdoc-aprovar-doc',
        'atrib-maxdoc-aprov-subst-doc',
        'atrib-maxdoc-ciclo-aprov-doc',
        'atrib-maxdoc-obsoletetar-doc',
        'atrib-maxdoc-emitir-copia-ctrl',
        'atrib-maxdoc-assinatura-eletronica',
      ],
    },
    // Beatriz (direto) — Unidade Sul: Leitor
    // Via grupo ela é Editor em Central+Norte; aqui tem papel MENOR na Sul.
    {
      id: 'im-elfa-beatriz-sul',
      instanciaId: 'inst-elfa-sul',
      entidadeTipo: 'user',
      entidadeId: 'usr-beatriz-elfa',
      papel: 'leitor',
      atribuicaoIds: [
        'atrib-maxdoc-leitor-doc',
        'atrib-maxdoc-leitor-anexos',
        'atrib-maxdoc-ler-todos',
      ],
    },
  ]

  let totalAtribs = 0
  for (const m of membros) {
    await db
      .insert(instanciaMembros)
      .values({
        id: m.id,
        instanciaId: m.instanciaId,
        entidadeTipo: m.entidadeTipo,
        entidadeId: m.entidadeId,
        papel: m.papel,
        assignedAt: new Date().toLocaleDateString('pt-BR'),
      })
      .onConflictDoUpdate({
        target: instanciaMembros.id,
        set: { papel: m.papel },
      })

    for (const atribuicaoId of m.atribuicaoIds) {
      const linkId = `${m.id}--${atribuicaoId}`
      try {
        await db.insert(instanciaMembroAtribuicoes).values({
          id: linkId,
          membroId: m.id,
          atribuicaoId,
          assignedAt: new Date().toISOString(),
        })
        totalAtribs++
      } catch {
        // conflito — vínculo já existe
      }
    }
  }
  console.log(`✅ ${membros.length} membros de instância · ${totalAtribs} vínculos de atribuição`)

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log('\n🎉 Cenário multi-empresa Elfa concluído!')
  console.log('\n   Conta:    Hospital Elfa (acc-elfa) sob org Docnix')
  console.log('   Usuários: Carlos Mendes · Beatriz Santos · João Pereira')
  console.log('   Grupos:   Aprovadores Corporativos · Editores Docnix')
  console.log('')
  console.log('   ┌─────────────────────────┬─────────────────┬───────────────────────┐')
  console.log('   │ Sujeito                 │ Papel           │ Instância MaxDoc      │')
  console.log('   ├─────────────────────────┼─────────────────┼───────────────────────┤')
  console.log('   │ Carlos Mendes           │ Administrador   │ Hospital Central      │')
  console.log('   │ Carlos Mendes           │ Leitor          │ Unidade Norte  ←diff! │')
  console.log('   │ Carlos Mendes           │ — sem acesso —  │ Unidade Sul           │')
  console.log('   │ Grupo Editores (Beatriz)│ Editor          │ Central + Norte       │')
  console.log('   │ Grupo Aprovadores (João)│ Aprovador       │ Central + Norte       │')
  console.log('   │ Beatriz Santos (direto) │ Leitor          │ Unidade Sul           │')
  console.log('   └─────────────────────────┴─────────────────┴───────────────────────┘')
  console.log('')
  console.log('   → Carlos tem papéis DIFERENTES por empresa: impossível no Docnix atual.')
  console.log('     O PAS resolve isso nativamente via FGA (papel definido por objeto).')
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
