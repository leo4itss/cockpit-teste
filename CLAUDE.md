# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend dev server (port 5173)
npm run dev

# Backend API server (port 3001, with hot reload)
npm run dev:server

# Both must run simultaneously during development

# Build for production
npm run build

# Lint
npm run lint

# Database
npm run db:push      # push schema changes to Neon
npm run db:seed      # seed with mock data
npm run db:studio    # open Drizzle Studio
```

There are no automated tests in this project.

## Architecture

This is a React SPA (frontend) paired with a Hono REST API (backend), backed by Neon PostgreSQL via Drizzle ORM. It's a management cockpit ("Cockpit") for an enterprise software platform — it manages organizations, accounts, solutions, contracts, users, groups, components, and fine-grained authorization.

### Request flow (development)

Vite dev server (`:5173`) → proxies `/api/*` → Hono server (`:3001`) → Neon PostgreSQL

In production (Vercel): `/api/*` routes to `api/index.ts` (serverless); all other routes serve the SPA via rewrites in `vercel.json`.

### Key directories

- `src/pages/` — one file per route
- `src/components/` — sheets (slide-over panels), dialogs, and layout components
- `src/authz/` — authorization engine, hooks, and mock data
- `src/context/` — React context providers (Auth, Componentes, Users)
- `src/api/client.ts` — typed API client (wraps `fetch`)
- `src/types/index.ts` — all shared TypeScript types
- `server/schema.ts` — Drizzle table definitions (source of truth for the DB model)
- `server/index.ts` — all REST endpoints (single file Hono app)
- `server/db.ts` — Drizzle + Neon client setup

### Domain model

```
Organization
  └─ Account (one per org by default; soft-deleted via deletedAt)
       └─ UserAccountMembership (papel: member | account_admin)
       └─ AccountEntitlement (capabilities like 'assistant.use')
       └─ Grupo (escopo='conta')
  └─ Solution (has versioned Plans)
  └─ Contract (has objetos linking solutions + plans)
  └─ Grupo (escopo='org')

Componente (platform-level module)
  └─ Instancia (configured copy of a Componente within an Account)
       └─ InstanciaMembro (papel: viewer | member | admin)

ComponentPermission (granular: user/group → action on a Componente or Instancia)
```

Key data patterns:
- Most entities use `status: 'Ativo' | 'Inativo'` for soft-delete.
- `Account` uses `deletedAt` (quarantine model) instead of `status`.
- `Componente` linked to any Solution is inactivated on delete, not hard-deleted.
- `Solution.plans` is a JSONB array with versioning: edits create a new plan entry (`statusVersao='ativo'`) and mark the previous as `'inativo'` — the backend handles this merge in `PUT /api/solutions/:id`.

### Two parallel permission systems

`instancia_membros` and `component_permissions` are **separate tables** that coexist:

- **`instancia_membros`** — direct object membership with a role (`viewer | member | admin`). Read by `InstanciaDetailSheet` to show the member list of an object. Written by the object detail flow.
- **`component_permissions`** — fine-grained action-level permissions. Written by `AtribuirPermissoesSheet` (Canvas). When Canvas saves permissions for an instância, it also upserts `instancia_membros` to keep both systems in sync. Removing all actions from an instância also removes the membership record.

`GrupoInstanciaVinculo` type (`src/api/client.ts`) + endpoint `GET /api/grupos/:id/instancias` — returns which instâncias a group has access to (queried from `instancia_membros`). Must exist in **both** `server/index.ts` (local dev) and `api/index.ts` (Vercel production).

### Authorization (FGA)

This is a PoC — authorization is mocked, not wired to a real OpenFGA backend.

**Roles (highest → lowest privilege):**
1. `platform_admin` — unrestricted access
2. `org_admin` — manages org, accounts, users, groups
3. `pas_architect` — manages components; reads orgs
4. `account_admin` — manages users/groups within their account
5. `member` — basic read access to their account

**Code structure:**
- `src/authz/engine.ts` — pure functions, no React, no side effects. `canXxx(userId, ..., rel)` and `getXxx(userId, rel)` signatures.
- `src/authz/hooks.ts` — React hooks wrapping the engine. **Always use hooks in components, never call the engine directly.**
- `src/authz/mock.ts` — static `mockFGARelations` and `mockPersonas` (hardcoded for the PoC)
- `src/context/AuthContext.tsx` — provides `currentUser`, `relations`, and a floating `PersonaSwitcher` UI (bottom-right corner) to switch between test personas

In production, `engine.ts` functions would be replaced by OpenFGA SDK calls; the hook interface stays the same.

### Pages and their purpose

| Route | Page | Purpose |
|-------|------|---------|
| `/acessos` | `AcessosPage` | Members, groups, and objects of an account. Platform Admin auto-selects first org/account and can switch to "Todas as contas" mode to view across all accounts of an org. |
| `/canvas` | `CanvasPermissoesPage` | **Operational** — visualize and manage fine-grained permissions within one account. Seletor: conta. |
| `/canvas-org` | `CanvasOrgPage` | **Structural** — explore org → account hierarchy, expand accounts to see groups/users/objects. Seletor: organização. |
| `/schema` | `SchemaVisualizerPage` | Interactive graph of the DB schema — useful for understanding table relationships. |
| `/contas/:id/provisionamento` | `ProvisionamentoPage` | Tenant provisioning details, modeled as **two phases with different triggers**. **Phase 1** (`tenantProvisioning`, fires on account creation) is the 5-step timeline, in execution order: Autenticação → Banco de dados → Variáveis de ambiente → DNS → *(~60s DNS propagation)* → Ingress com TLS. When it completes the tenant URL resolves and the home page opens — still with no solutions. **Phase 2** (`solutionPublicationByContract`, fires on contract creation) provisions each solution the contract covers; it never touches DNS/Ingress and **requires Phase 1 to be COMPLETED** — that rule is what gates contract creation in `NewContractSheet`. Also shows linked solutions/contracts and actions (reprovision, health check, logs). Step labels are deliberately vendor-neutral; the real vendor (Keycloak, PostgreSQL, Infisical, Cloudflare, cert-manager) appears only in each step's expanded detail. Data comes from `src/services/provisioning.ts`, a mock front-end contract for the (not-yet-integrated) `pas-cockpit-worker` — see `USE_MOCK_PROVISIONING` in that file for the single swap point. |

### Contract lifecycle and Phase 2 state

`Contract.status` is `'Ativo' | 'Inativo' | 'Pendente' | 'Provisionando' | 'Falha no provisionamento'` (`ContractStatus` in `src/types/index.ts`). Phase 2 is asynchronous and takes minutes, so:

- A new contract is created as **`'Provisionando'`**, never `'Ativo'`. It only becomes `'Ativo'` when every solution finishes provisioning — derived by `deriveContractStatus()` in `src/services/provisioning.ts`.
- `ContractStatusBadge` (`src/components/ContractStatusBadge.tsx`) is the **single** status→colour/icon mapping. Never inline a new one; listing, detail and the provisioning screen must not diverge.
- Progress is tracked **per solution**, not just per contract (`SolutionProvisioning.contratoId`). One failing solution puts the whole contract in `'Falha no provisionamento'`.
- **Polling, not WebSocket** — `useProvisioningPolling` (`src/hooks/useProvisioningPolling.ts`) refreshes every 5s and stops at a terminal state. WebSocket was evaluated and rejected: the project has no support and the traffic is one-way.
- `src/services/fase2Mock.ts` simulates Phase 2 on the browser clock (`FASE2_DURACAO_MS_POR_SOLUCAO`, compressed for demos; real times are ~4 min for the CMS and ~2 min for the knowledge base). **Delete this file** when the worker exposes per-contract status.
- **Recovery is per solution, never per contract.** `retrySolutionProvisioning()` re-runs one failed solution; there is deliberately no contract-level retry, because that would collide with the contract edit/inactivation rules — the reason "reprovisionar contrato" was rejected. Re-running a job changes no contract field. Gated by `canRetrySolutionProvisioning` (platform + org admin) and by the worker's own `podeReexecutar` flag on the error.
- **`ProvisioningErrorBlock`** is the single error-detail block, shared by the Phase 1 step, the Phase 2 solution and the contract detail. Never inline a fourth copy.
- **There is no runbook link.** `docUrl` was removed from `ProvisioningStepError` — the error→procedure mapping never existed, so the link pointed nowhere.
- `mergeSolucoes()` gives the session simulation precedence over fixtures for the same solution+contract. Without it, retrying a fixture-based failure changes nothing on screen.
- **The account↔contract join is by name, and renaming must cascade.** `contracts.contratante` matches `accounts.name` with no FK. `PUT /accounts/:id` therefore rewrites every matching contract when the name changes — without it, renaming an account orphans its contracts and the guards that rely on the join stop finding anything, silently allowing what they exist to block (inactivating an account with live contracts; contracting the same component twice). Account names are not unique, so every such query must also scope by `orgId`. A real `contracts.accountId` FK is still the correct fix.
- Contract filters must use `status !== 'Inativo'`, never `status === 'Ativo'` — the latter silently drops contracts that are provisioning. This bit the org-deletion guard in `server/index.ts` and `api/index.ts`.

### Provisioning vocabulary and dates

- **One label map, not four.** `PROVISIONING_STATUS_BADGE` and `PROVISIONING_STEP_LABEL` (`src/services/provisioning.ts`) are the only place status→label/variant lives. Four divergent copies used to exist (`ProvisionamentoPage`, `NewContractSheet`, `EditContractSheet`, `ProvisioningDots`) and drifted into "Falhou"/"Erro"/"Com erro"/"Em progresso" on the same screen.
- **Failure is always the noun "Falha".** The one exception is `ContractStatus`, labelled "Falha no provisionamento" — there the word must say *what* failed, since the contract itself did not.
- **Dates go through `src/lib/datas.ts`.** `formatarData` (`dd/mm/aaaa`) and `formatarDataHora` (`dd/mm/aaaa HH:mm:ss`); never `toLocaleString` inline. Times are the viewer's clock — declare the zone once per panel with `FUSO_LOCAL`, never per row. `formatarData` tolerates ISO, ISO datetime and already-formatted `dd/mm/aaaa`, and avoids the UTC off-by-one on bare `YYYY-MM-DD`.
- **No `(s)`/`(ões)` in UI copy.** Branch on the count and write both forms, verb included.
- `buildDerivedSnapshot()` covers accounts whose `provisioningStatus` is `COMPLETED`/`PENDING` but have no fixture — it shows the real per-step state without fabricating timestamps. It deliberately refuses `IN_PROGRESS`/`FAILED`, where guessing which step is running or broke would be a lie.

**Phase 1 step copy rule**: `ProvisioningStepDef.descricao` describes the **resource created**, never the capability the customer gains — no step may imply the customer can already log in or use the platform. `impactoFalha` states the functional consequence of that step failing. Both are set in `PROVISIONING_STEPS`; vendor names stay in `recursoGlobal`/`recursoTenant`, which only render in the expanded panel.

### Role-based UI rules

- **Platform Admin**: cannot create groups (Criar grupo button hidden). Auto-selects first org/account on AcessosPage load. Can switch to "Todas as contas" to see aggregated view across all accounts of an org.
- **Org Admin**: manages groups and users within their org.
- **Account Admin**: manages users and groups within their account only.

### Important constraints

- **Neon HTTP driver does not support native transactions.** Use compensating transactions (create → if next step fails → delete). See `POST /api/organizations` for the pattern.
- **CORS in `server/index.ts` is hardcoded to `http://localhost:5173`**. If the Vite port changes, update this.
- **Import alias `@/`** maps to `src/` — defined in `vite.config.ts` and `tsconfig.app.json`.
- **React deduplication**: `vite.config.ts` sets `dedupe: ['react', 'react-dom']` — required for `@xyflow/react` (the canvas visualizer).
- **Dual API files**: every new endpoint must be added to **both** `server/index.ts` (local dev, with `/api/` prefix) and `api/index.ts` (Vercel production, without `/api/` prefix). Adding to only one will work locally but fail in production.
- The floating canvas pages (`/canvas`, `/canvas-org`) use `@xyflow/react` for interactive graph visualization of permissions and org structure.
- `SchemaVisualizerPage` (`/schema`) renders the DB schema as an interactive graph — useful for understanding table relationships.
- **Terminology**: UI uses "Objeto" (not "Instância") when referring to configured copies of components (`Instancia` table). Use "Objeto" in labels, legends, and user-facing text.
- **`VITE_PAS_ENV`** (optional, defaults to `'hml'`): environment segment used by `buildTenantDomain()` (`src/services/provisioning.ts`) to build a tenant's domain as `https://{slug}.{env}.pas.app.br`, where `{slug}` is `accounts.subdomain`.
