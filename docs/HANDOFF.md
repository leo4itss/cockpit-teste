# Handoff — Módulo de Grupos e Permissões v2

## Branch e últimos 5 commits

**Branch:** `feature/grupos-permissoes-v2`

| Hash | Descrição |
|------|-----------|
| `37a64c9` | auto: update Sidebar.tsx |
| `fc93cd1` | auto: update AcessosPage.tsx |
| `df77d70` | auto: update AcessosPage.tsx |
| `55a3f35` | auto: update AcessosPage.tsx |
| `cadda6f` | auto: update UsuariosPage.tsx |

---

## O que foi implementado

### 1. Engine de autorização FGA (`src/authz/`)

Engine local baseada nos princípios do OpenFGA (ReBAC). Avalia permissões por papel hierárquico — `platform_admin` → `org_admin` / `pas_architect` → `account_admin` → `member`. Cada função é pura e testável isoladamente. O corpo de cada função pode ser trocado por uma chamada ao SDK oficial do OpenFGA sem alterar contratos.

- `engine.ts` — funções puras de check de permissão
- `hooks.ts` — hooks React que consomem o engine
- `mock.ts` — dados de relações FGA simuladas para desenvolvimento
- `index.ts` — barrel de exports

### 2. Schema do banco (`server/schema.ts`)

Tabelas novas adicionadas nessa entrega:

| Tabela | Propósito |
|--------|-----------|
| `grupos` | Grupos de usuários com escopo org ou conta |
| `usuario_grupos` | Relação N:N entre usuários e grupos |
| `component_permissions` | Permissões granulares por ação/componente/entidade |
| `user_account_memberships` | Vínculo de usuários a contas com papel |

### 3. API REST (`server/index.ts`)

Endpoints novos nessa entrega:

| Recurso | Endpoints |
|---------|-----------|
| Grupos | `GET/POST /api/grupos`, `GET/PUT/DELETE /api/grupos/:id` |
| Membros de grupo | `GET/POST /api/grupos/:id/membros`, `DELETE /api/grupos/:id/membros/:userId` |
| Membros de conta | `GET/POST /api/accounts/:id/membros`, `DELETE /api/accounts/:id/membros/:userId` |
| Permissões | `GET/POST /api/permissions`, `DELETE /api/permissions` |

### 4. Telas por perfil

**Platform Admin / Org Admin**
- `OrganizacoesPage` — lista todas as orgs com métricas
- `OrganizacaoDetailPage` — detalhe de org, criação de Org Admin e contas
- `UsuariosPage` — lista usuários da org, convite, detalhe, vínculo a contas
- `GruposPage` — lista grupos da org com escopo (org ou conta), criação e detalhe
- `ContasPage` — lista contas, criação e detalhe com promoção de Account Admin

**PAS Architect**
- `ComponentesPage` — lista componentes por org/conta, configuração técnica

**Account Admin**
- `AcessosPage` — duas abas: Usuários e Grupos da conta; atribuição de permissões granulares

**Shared**
- `Sidebar` — navegação adaptativa que exibe apenas as seções permitidas para o perfil ativo

### 5. Componentes de UI

**Grupos** (`src/components/grupos/`)
- `CriarGrupoSheet` — cria grupo no nível da conta (Account Admin)
- `CriarGrupoOrgSheet` — cria grupo no nível da org com seleção de escopo (Org Admin)
- `GrupoDetailSheet` — detalhe do grupo, gestão de membros, atribuição de permissões

**Permissões** (`src/components/permissoes/`)
- `AtribuirPapelSheet` — atribui papel (member/account_admin) a usuário em uma conta
- `AtribuirPermissoesSheet` — checkboxes de ações granulares por componente (substitui dropdown de papel)

**Usuários** (`src/components/usuarios/`)
- `ConvidarUsuarioSheet` — lookup por e-mail onBlur + convite ou reutilização de cadastro
- `CriarUsuarioSheet` — criação direta de usuário (Platform Admin)
- `UsuarioDetailOrgSheet` — detalhe do usuário no contexto da org, vínculo a contas
- `UsuarioDetailAccountSheet` — detalhe do usuário no contexto da conta, atribuição de permissões

**UI genérico** (`src/components/ui/`)
- `nested-sheet.tsx` — componente customizado de Sheet com z-index incremental para sheets aninhadas

### 6. Migrações (`server/migrate-*.ts`)

- `migrate-v2.ts` — migração base da v2 (76 linhas)
- `migrate-grupos.ts` — cria tabelas de grupos e membros (41 linhas)
- `migrate-permissions.ts` — cria tabela `component_permissions` (37 linhas)

---

## Como rodar o ambiente local

```bash
# 1. Instalar dependências
pnpm install

# 2. Criar arquivo de variáveis de ambiente
cp .env.example .env   # se não existir, criar manualmente com:
# DATABASE_URL=postgresql://...

# 3. Aplicar schema no banco (Neon / Postgres)
pnpm db:push

# 4. Popular banco com dados de teste
pnpm db:seed

# 5. Subir frontend (porta 5173)
pnpm dev

# 6. Subir backend em paralelo (porta 3000 por padrão)
pnpm dev:server
```

O frontend espera o backend em `http://localhost:3000`. O CORS já está configurado para aceitar `http://localhost:5173`.

Para inspecionar o banco visualmente:

```bash
pnpm db:studio
```

---

## O que ainda está pendente

- **Integração com OpenFGA SDK real** — o engine atual (`src/authz/engine.ts`) é local/mock. Em produção cada função deve chamar `fga.check(...)`. Os contratos já estão definidos para facilitar a troca.
- **Papéis internos Prizm abaixo do Platform Admin** — Operador e Suporte não foram formalizados nem modelados.
- **Permission Helper** — ferramenta de diagnóstico de acesso para o usuário entender por que não consegue ver/fazer algo.
- **Auditoria de log de permissões** — rastreabilidade de quem atribuiu/removeu cada permissão e quando.
- **Remoção de organização** — soft delete de org não foi implementado nessa entrega.
- **Configuração avançada de componentes (PAS Architect)** — parâmetros técnicos avançados e endpoints de metadata com validação completa do retorno.
- **Contrato vinculado à conta** — o fluxo de vincular contrato a uma conta após a criação está parcialmente implementado; a tela de criação de contrato pelo Platform Admin não está completa.

---

## Decisões de arquitetura

### Modelo de autorização ReBAC (não RBAC)
Em vez de papéis fixos com listas de permissões, o sistema modela **relações entre entidades** — usuário → papel → objeto (org, conta, componente). Isso permite permissões contextuais: um usuário pode ser `org_admin` em uma org e `member` em outra, sem conflito. A modelagem segue os princípios do OpenFGA.

### Engine local substituível por OpenFGA
O `src/authz/engine.ts` expõe funções puras (`canViewOrganization`, `canManageUsers`, etc.) que hoje avaliam relações em memória. A troca pelo SDK do OpenFGA é cirúrgica: substituir o corpo de cada função por `await fga.check(...)`. Nenhuma chamada de componente ou hook muda.

### Tuplas FGA escritas no backend de forma atômica
O frontend nunca escreve tuplas FGA diretamente. Toda mutação (criar grupo, vincular usuário, atribuir permissão) passa por um endpoint que persiste no banco e registra a tupla FGA **na mesma operação**. Garante consistência mesmo em caso de falha parcial do cliente.

### Permissões granulares por ação (não papéis agregados)
Em vez de `viewer / editor / admin`, cada ação (`pode_ler`, `pode_publicar`, `can_use_assistant`, etc.) é uma tupla independente no banco (`component_permissions`). A UI usa checkboxes por componente. Isso permite combinações arbitrárias e elimina a ambiguidade de "o que um editor pode fazer neste componente específico".

### Lookup de usuário onBlur
A verificação de e-mail existente é feita **ao sair do campo**, não em tempo real. Evita flood de requisições à API durante digitação e entrega feedback claro antes do submit.

### Sheets aninhadas com z-index incremental
O componente padrão do shadcn/ui não gerencia z-index para sheets abertas em cascata. O `nested-sheet.tsx` resolve isso atribuindo z-index incremental por camada de profundidade. Não usar o componente padrão em fluxos que abrem sheets dentro de sheets.

### Stack
- **Frontend:** React + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend:** Hono (Node) + Drizzle ORM
- **Banco:** PostgreSQL via Neon (serverless)
- **Autorização:** Engine local ReBAC → substituível por OpenFGA SDK
