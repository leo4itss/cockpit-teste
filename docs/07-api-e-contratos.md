# 07 — API & contratos

Referência dos endpoints REST relevantes à entrega de permissões granulares. A API é um app Hono único; em dev
o Vite proxeia `/api/*` para a porta 3001.

> ⚠️ **Regra do arquivo duplo.** Todo endpoint precisa existir em **`server/index.ts`** (dev local, prefixo
> `/api/`) **e** em **`api/index.ts`** (Vercel, sem prefixo). Adicionar só em um funciona local e quebra em
> produção. Ao criar/alterar endpoints, editar os dois.

> **Neon HTTP não tem transação nativa.** Usar compensação (create → se falhar o próximo passo → delete) ou
> operações idempotentes. Ver o endpoint bulk abaixo.

---

## 1. Endpoints-chave da entrega

### Permissões granulares (`component_permissions`)
- **`GET /api/permissions?entidade_tipo=&entidade_id=&instancia_id=`** — lista Ações concedidas. `instancia_id`
  aceita o sentinela `'null'` (só linhas com `instanciaId IS NULL`) ou um id real (aquela instância).
- **`POST /api/permissions`** — concede uma Ação (idempotente; unicidade inclui `instancia_id`).
- **`DELETE /api/permissions`** — revoga uma Ação.

  Escritos pelos sheets **Ações** (`AtribuirPermissoesSheet`, `PermissoesMembroSheet`), que fazem o diff
  (add-missing / remove-stale) e reconciliam `instancia_membros` (ver [02-arquitetura-fga.md](./02-arquitetura-fga.md) §3).

### Grupos e membros
- **`POST /api/grupos/:id/membros`** — adiciona um usuário (idempotente).
- **`POST /api/grupos/:id/membros/bulk`** — **atribuição em massa.** Body `{ userIds: string[] }`. Seleciona os
  vínculos existentes via `inArray` e insere só os novos (idempotente → seguro para retry, já que Neon HTTP não
  tem transação). Retorna `{ adicionados, jaExistiam }`. O cliente envia em chunks (500) com barra de progresso.
- **`DELETE /api/grupos/:id/membros/:userId`** — remove um usuário.
- **`GET /api/grupos/:id/membros`** — lista membros.
- **`GET /api/grupos/:id/instancias`** — Objetos a que o grupo tem acesso (lê `instancia_membros`).
- **`GET /api/accounts/:id/usuario-grupos`** — **1 query** retornando `(userId, grupoId, grupoNome, grupoEscopo)`
  de todos os grupos visíveis à conta (grupos da conta + org-scoped herdados). Alimenta a **coluna Grupo** e os
  filtros da aba Usuários (evita N+1).
- **`GET /api/users/:id/grupos?accountId=`** — grupos de um usuário.

### Objetos (instâncias) e membros
- **`GET /api/instancias/:id/membros`** · **`POST`** · **`PUT /:membroId`** (troca papel) · **`DELETE /:membroId`**
  (remove membro e limpa `instancia_membro_atribuicoes` + `component_permissions`).
- **`GET /api/instancias/:id/permissoes-efetivas?userId=`** — **permissões efetivas.** Junta grupos diretos do
  usuário, **expande ancestrais via `grupos.parentId`** (traversal in-memory, anti-ciclo) e une
  `component_permissions` do usuário (`fonte: 'direto'`) e dos grupos (`fonte: 'grupo'`, com o nome do grupo).
  Retorna `{ atribuicoes, fontes }`.

### Catálogo do componente
- **`GET /api/componentes/:id/config`** — hidrata `useComponenteConfig` (papéis + ações do componente).
- **`GET|POST /api/componentes/:id/atribuicoes`** (+ `PUT|DELETE /:atribuicaoId`) — catálogo DocNix
  (`componente_atribuicoes`).

### Entitlements
- **`GET|POST /api/accounts/:id/entitlements`** (+ `DELETE /:capability`) — capabilities da conta
  (`account_entitlements`), base da regra `permission AND entitlement`.

### DocNix — Perfil de Objeto e fases (config operacional; fora do FGA)
- **`GET|POST|DELETE /api/instancias/:id/membros/:membroId/atribuicoes`** — vínculos membro ↔ atribuição.
- **`GET /api/instancias/:id/elegiveis-slot?atribuicaoId=`** — usuários/grupos elegíveis a um slot.
- **`POST /api/instancias/:id/perfil-slots/:slotId/nomeacoes`** — nomeação por slot (valida elegibilidade no server).
- **`GET|POST|PUT|DELETE /api/instancias/:id/fases…`** — fases e responsáveis.

---

## 2. Superfície completa (para referência)

Além dos acima, a API cobre CRUD de `organizations`, `accounts` (+ `restaurar`), `solutions`, `contracts`,
`componentes` (+ `reativar`, `linked`, `validate-metadata`), `tipos-licenca`, `users` (+ `areas-distintas`,
`cargos-distintos`), e `accounts/:id/membros`. O cliente tipado fica em `src/api/client.ts`.

---

## 3. Onde as tuplas FGA entrariam (produção)

Cada escrita reflete uma tupla no OpenFGA (hoje marcado como `// TODO (produção): fga.write(...)`):

```
POST /api/grupos/:id/membros(/bulk)          → fga.write(user:X member group:Y)
POST /api/instancias/:id/membros              → fga.write(user:X membro instancia:Y)
POST /api/permissions                         → fga.write(<u|g>:X can_<acao> componente:C [instancia:Z])
POST /api/instancias/:id/membros/:m/atribuicoes → fga.write(user:X can_<acao> instancia:Y)
PUT  /api/grupos/:id { parentId }              → fga.write(grupo:filho parent grupo:pai)
(DELETE espelha com fga.delete)
```

Detalhes e o fluxo de sync em [02-arquitetura-fga.md](./02-arquitetura-fga.md) §6.
