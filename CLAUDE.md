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

### Important constraints

- **Neon HTTP driver does not support native transactions.** Use compensating transactions (create → if next step fails → delete). See `POST /api/organizations` for the pattern.
- **CORS in `server/index.ts` is hardcoded to `http://localhost:5173`**. If the Vite port changes, update this.
- **Import alias `@/`** maps to `src/` — defined in `vite.config.ts` and `tsconfig.app.json`.
- **React deduplication**: `vite.config.ts` sets `dedupe: ['react', 'react-dom']` — required for `@xyflow/react` (the canvas visualizer).
- The floating canvas pages (`/canvas`, `/canvas-org`) use `@xyflow/react` for interactive graph visualization of permissions and org structure.
- `SchemaVisualizerPage` (`/schema`) renders the DB schema as an interactive graph — useful for understanding table relationships.
