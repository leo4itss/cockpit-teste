# 03 — Modelo de dados & domínio

Referência do modelo de dados que sustenta as permissões granulares. Fonte: `server/schema.ts` (Drizzle +
Neon PostgreSQL). PKs são `text` (UUID); a maioria das entidades usa `status: 'Ativo' | 'Inativo'` para
soft-delete (a conta usa `deletedAt`). Termos conforme [glossario.md](./glossario.md).

---

## 1. Hierarquia de domínio

```
Organization
 └─ Account (deletedAt = quarentena)
     ├─ UserAccountMembership (papel: member | account_admin)
     ├─ AccountEntitlement    (capability, ex.: assistant.use)
     └─ Grupo (escopo='conta')
 └─ Grupo (escopo='org')                 ← herdado por todas as contas da org

Componente (módulo de plataforma; tipoModelo: fga | docnix | custom)
 └─ Instancia (cópia configurada do componente numa Account)  ← "Objeto" na UI
     └─ InstanciaMembro (papel: viewer | member | admin)
         └─ InstanciaMembroAtribuicao (junção membro ↔ atribuição, modelo DocNix)

ComponentPermission  ← grão transversal: (user|group) → ação em componente, opcionalmente escopada a uma instância
```

---

## 2. Tabelas principais

### Tenancy e usuários
- **`organizations`** — topo da árvore. `id`, `name`, `docType/docNumber`, `domain`, `razaoSocial`, `arquitetoPAS`,
  `status`, contadores denormalizados, `contacts` (jsonb).
- **`accounts`** — tenant sob a org. `orgId → organizations.id`, `subdomain`, `provisioningStatus`, `isDefault`,
  `admins` (jsonb); **`deletedAt`** (null = ativa; setado = quarentena) em vez de `status`.
- **`user_account_memberships`** — N:N usuário↔conta com papel. `userId`, `accountId`,
  `papel = 'member' | 'account_admin'`, `assignedAt`. Tupla FGA: `user:<id> member|account_admin account:<id>`.

### Grupos
- **`grupos`** — grupos org- ou conta-scoped:
  ```
  escopo: 'org' | 'conta'
  orgId → organizations.id   (quando escopo='org')
  accountId → accounts.id     (quando escopo='conta')
  papel: '' | 'Viewer' | 'User' | 'Admin'   // função padrão do grupo
  parentId → grupos.id        // null = raiz; hierarquia p/ herança
  status: 'Ativo' | 'Inativo'
  ```
- **`usuario_grupos`** — N:N usuário↔grupo. `userId`, `grupoId`, `assignedAt`. Tupla: `user:<id> member group:<id>`.

### Componentes e objetos
- **`componentes`** — módulos de plataforma. `nome`, `metadataUrl`, `tiposLicenca` (jsonb), `status`,
  `tipoModelo = 'fga' | 'docnix' | 'custom'`.
- **`instancias`** — cópia configurada do componente numa conta (**"Objeto"** na UI). `componenteId`, `accountId`,
  `nome`, **`restringirAcesso`** (false = todos da conta enxergam; true = só membros com atribuição), `status`.
- **`instancia_membros`** — quem acessa o objeto e com que papel. `instanciaId`, `entidadeTipo: 'user'|'group'`,
  `entidadeId`, `papel: 'viewer'|'member'|'admin'`. Tupla: `<user|group>:<id> <papel> instance:<id>`.
- **`instancia_membro_atribuicoes`** — junção membro↔atribuição (modelo DocNix). `membroId`, `atribuicaoId`.

### Catálogos (papéis e ações)
- **`componente_papeis`** — catálogo de papéis por componente. `value`, `label`, **`defaultAcoes` (jsonb `string[]`;
  `[] = todas as ações do catálogo` = Administrador)**, `ordem`.
- **`componente_acoes`** — catálogo completo de Ações FGA por componente. `acao` (chave gravada em
  `component_permissions.acao`), `label`, `ordem`.
- **`componente_atribuicoes`** — definições de ação (modelo DocNix). `nome`, `descricao`,
  `modulo: 'MaxDoc'|'DocAction'|null`, `status`.

### Permissão granular e entitlement
- **`component_permissions`** — **uma linha por Ação concedida:**
  ```
  entidadeTipo: 'user' | 'group'
  entidadeId:   string
  componenteId: string
  acao:         string           // ex.: can_use_assistant / pode_ler / 'Visualizar'
  instanciaId:  string | null    // null = no componente inteiro; set = escopada a um Objeto
  ```
  Índices: `(entidadeTipo, entidadeId, componenteId, acao)` e `(instanciaId)`.
- **`account_entitlements`** — capabilities habilitadas por conta (`capability`, ex.: `assistant.use`).
  Regra: `allow = permission AND entitlement`.

### Configuração operacional (fica fora do FGA)
`instancia_fases`, `fase_responsaveis`, `fase_atribuicoes_permitidas`, `instancia_perfil_slots`,
`instancia_perfil_slot_nomeacoes` — fluxo, fases e Perfil de Objeto do DocNix.

---

## 3. Terminologia UI ↔ código

| UI | Código / Banco | Nota |
|---|---|---|
| **Objeto** | `instancias` / `Instancia` | Sempre "Objeto" no texto do usuário |
| **Ações** | `component_permissions.acao`, `componente_acoes`, `componente_atribuicoes` | Nunca "permissões" na UI |
| **Papel / Nível de acesso** | `instancia_membros.papel`, `componente_papeis.value` | `viewer/member/admin` ou `leitor/editor/...` |
| **Combinar papéis / Personalizado** | `papel='personalizado'` | união via `src/authz/combinarPapeis.ts` |
| **Licenças Ativas / Capability** | `account_entitlements.capability` | gate `permission AND entitlement` |
| **Grupo — Organização / Conta** | `grupos.escopo` = `'org'` / `'conta'` | |
| **Administrador da Conta / Membro** | `user_account_memberships.papel` | |
| **Administrador (papel de objeto)** | `defaultAcoes: []` | vazio = todas as ações do catálogo |

Ver o catálogo completo de ações em [06-catalogo-acoes.md](./06-catalogo-acoes.md); os endpoints que leem/escrevem
essas tabelas em [07-api-e-contratos.md](./07-api-e-contratos.md).
