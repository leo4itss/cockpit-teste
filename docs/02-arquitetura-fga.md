# 02 — Arquitetura FGA (o que viabilizar)

Este é o coração do handoff técnico: **o modelo de autorização a viabilizar em produção**. A 1ª entrega valida
o modelo com dados de teste; construir o backend FGA real é o objetivo de engenharia. Termos conforme
[glossario.md](./glossario.md).

> **Hoje (PoC):** autorização **mockada** em `src/authz/` (funções puras + hooks React + relações estáticas).
> **Produção:** o corpo das funções do engine é substituído por chamadas ao **SDK do OpenFGA**; a interface de
> hooks (`src/authz/hooks.ts`) **não muda**.

---

## 1. Modelo ReBAC de duas camadas

A autorização é **ReBAC** (Relationship-Based Access Control) em duas camadas:

1. **Camada global** (org/conta/usuário/grupo) — resolvida por `src/authz/engine.ts` sobre arrays planos em
   `FGARelations`. Define quem é `platform_admin`, `org_admin`, `pas_architect`, `account_admin`, `member`.
2. **Camada por Objeto** (por instância, por componente) — papéis específicos do componente
   (`viewer/member/admin`, ou `leitor/editor/revisor/aprovador/admin` no DocNix) + **Ações granulares**, com
   herança via grupo e **hierarquia de grupos** (`grupos.parentId` → `getGrupoAncestors`).

Hierarquia de perfis de plataforma (maior → menor privilégio):
`platform_admin > org_admin > pas_architect > account_admin > member`.

---

## 2. Formato das tuplas (OpenFGA)

Hoje as tuplas existem **apenas em comentários** — o runtime faz lookup em arrays. Em produção viram tuplas reais:

| Relação | Tupla | Onde nasce |
|---|---|---|
| Usuário em grupo | `user:<id> member group:<grupoId>` | `usuario_grupos` |
| Grupo sob grupo (hierarquia) | `grupo:<filho> parent grupo:<pai>` | `grupos.parentId` |
| Vínculo com a conta | `user:<id> account_admin\|member account:<accountId>` | `user_account_memberships` |
| Papel no objeto | `<user\|group>:<id> <papel> instance:<instanciaId>` | `instancia_membros` |
| Ação granular | `<user\|group>:<id> <acao> componente:<C>` (opcionalmente escopada a `instance:<id>`) | `component_permissions` |

Modelo do objeto (relações compostas):

```
define viewer: [user, group#member] or member
define member: [user, group#member] or admin
define admin:  [user, group#member]
```

---

## 3. Os dois sistemas de permissão paralelos

Coexistem duas tabelas — **é essencial entender a diferença** (ver também
[03-modelo-de-dados.md](./03-modelo-de-dados.md)):

| | `instancia_membros` | `component_permissions` |
|---|---|---|
| Grão | Pertencimento ao Objeto + **um papel** (`viewer/member/admin`) | **Ações** individuais (`acao`), opcionalmente escopadas por `instanciaId` |
| Papel | "Quem está no objeto, em que nível" — dirige a lista de membros | "Exatamente quais ações a entidade pode executar" |
| Lido por | `InstanciaDetailSheet`, `GET /api/instancias/:id/membros` | `AtribuirPermissoesSheet`, `PermissoesMembroSheet` via `GET /api/permissions` |
| Escrito por | Fluxo do detalhe do objeto; **também** upsertado pelos sheets de Ações para manter sync | Os dois sheets de Ações ao salvar |

**Fonte de verdade da autorização = `component_permissions`.** O `papel` em `instancia_membros` é **metadado de
exibição** (badge). Herança via grupo e permissões efetivas são calculadas só a partir de `component_permissions`
+ `usuario_grupos` (+ `grupos.parentId`).

**Como se mantêm em sync:**
- `AtribuirPermissoesSheet` (modo instância): ao salvar, escreve `component_permissions` e reconcilia
  `instancia_membros` — se sobra alguma ação, faz upsert do membro com o papel; se **zera** as ações, remove o
  membro.
- `PermissoesMembroSheet`: opera sobre `component_permissions` (com `instancia_id`) e escreve o `papel` escolhido
  de volta em `instancia_membros` só para o badge.
- `InstanciaDetailSheet` (troca de papel): reseta `component_permissions` para os `defaultAcoes` do novo papel
  (exceto `personalizado`); para `tipoModelo='docnix'` também sincroniza `instancia_membro_atribuicoes`.
- `DELETE /api/instancias/:id/membros/:membroId` remove a linha de `instancia_membros` **e** limpa
  `instancia_membro_atribuicoes` e `component_permissions` daquela entidade+instância.

---

## 4. Regra de decisão: `permission AND entitlement`

O acesso final combina duas coisas:

```
allow = permission (Ação atribuída ao Sujeito sobre o Objeto)
        AND entitlement (capability habilitada para a conta — account_entitlements)
```

Ex.: um usuário pode ter `can_use_assistant`, mas se a conta não tem `assistant.use` ativo, o acesso é negado.
Na 1ª entrega a **regra está documentada e a tabela `account_entitlements` existe**, mas o *enforcement* pleno na
checagem é um próximo passo (ver [08-decisoes-e-pendencias.md](./08-decisoes-e-pendencias.md)).

---

## 5. O que fica no FGA vs no banco

FGA responde "**quem pode fazer o quê**". Configuração operacional fica no banco e é processada pelo backend do
produto (ex.: DocNix), não pelo FGA.

| Dado | FGA (tuplas) | Banco |
|---|---|---|
| "Usuário X pode Criar Documento no Objeto Y" | ✅ | origem: `instancia_membro_atribuicoes` / `component_permissions` |
| "Grupo G é filho de Grupo P" | ✅ | origem: `grupos.parentId` |
| Fases da instância, responsável por fase | ❌ | `instancia_fases`, `fase_responsaveis` |
| Perfil de Objeto (slots) e nomeações | ❌ | `instancia_perfil_slots`, `instancia_perfil_slot_nomeacoes` |
| Catálogo de ações/atribuições | ❌ | `componente_acoes`, `componente_atribuicoes`, `componente_papeis` |

Convenção de nomes de relação: `can_` + slug snake_case da ação; admin de módulo vira `admin_<modulo>` e concede
todas as relações do módulo por composição.

---

## 6. Do PoC ao real (roteiro de engenharia)

**Mockado hoje** (a substituir):
- `src/authz/engine.ts` — funções puras `canXxx(userId, …, rel)` / `getXxx`; cada uma traz, em comentário, a
  relação OpenFGA equivalente e o padrão `await fga.check({ user, relation, object })`.
- `src/authz/mock.ts` — `mockFGARelations` (relações estáticas), `mockPersonas`, catálogos
  (`NIVEIS_CONTA`, `COMPONENTE_CONFIGS`, `mockDocNixPapeis`).
- `src/context/AuthContext.tsx` — `currentUser` vem da persona ativa (`localStorage`), `relations` é semeado uma
  vez de `mockFGARelations`; `reloadRelations()` é **no-op**. `PersonaSwitcher` (canto inferior direito) troca de
  persona só no PoC.

**A construir** (para viabilizar a arquitetura):
1. **Backend OpenFGA** — provisionar o serviço e um **store** por ambiente.
2. **Arquivo `authorization-model.fga`** — hoje **não existe commitado** no repo (o comentário em
   `AtribuirPermissoesSheet.tsx` referencia um arquivo aspiracional). Escrever o modelo (esboço em
   [06-catalogo-acoes.md](./06-catalogo-acoes.md) e no fluxo de sync abaixo).
3. **Substituir `engine.ts`** por chamadas ao SDK — mesma assinatura de hooks:
   ```ts
   // Hoje (mock):
   canActWithAtribuicao(userId, instanceId, 'atrib-maxdoc-criar-doc', relations)
   // Produção (OpenFGA SDK):
   await fgaClient.check({ user: `user:${userId}`, relation: 'can_criar_documento', object: `instancia:${instanceId}` })
   ```
4. **Sync DB → FGA** — nas escritas do backend, refletir tuplas (ver `// TODO (produção): fga.write(...)` nos
   endpoints):
   ```
   POST /api/grupos/:id/membros(/bulk)  → fga.write(user:X member group:Y)
   POST /api/instancias/:id/membros      → fga.write(user:X membro instancia:Y)
   POST /api/permissions                 → fga.write(user:X can_<acao> componente:C [instancia:Z])
   PUT  /api/grupos/:id { parentId }      → fga.write(grupo:filho parent grupo:pai)
   (DELETE espelha com fga.delete)
   ```
   O **banco é a fonte de verdade**; as tuplas FGA são derivadas — prever mecanismo de reconciliação.
5. **IdP** — `currentUser` viria de Auth0/Cognito; `reloadRelations()` buscaria o estado do OpenFGA.

Gaps a resolver antes de produção estão em [08-decisoes-e-pendencias.md](./08-decisoes-e-pendencias.md)
(granularidade por documento, atribuições passivas, sincronização eventual, escopo instância vs componente).
