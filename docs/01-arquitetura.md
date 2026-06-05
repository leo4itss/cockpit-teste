# Arquitetura Técnica

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React + TypeScript + Vite | React 19, Vite 8 |
| Roteamento | React Router | v7 |
| Estilo | TailwindCSS + tailwind-merge | v4 |
| Componentes UI | Radix UI (primitives) + Lucide Icons | — |
| Canvas interativo | @xyflow/react | v12 |
| Backend (dev) | Hono no Node.js | v4 |
| Backend (prod) | Hono em Vercel Edge Functions | v4 |
| ORM | Drizzle ORM | v0.45 |
| Banco de dados | Neon PostgreSQL (HTTP driver) | — |
| Deploy | Vercel | — |

---

## Request Flow

### Desenvolvimento

```
Navegador
  └─ Vite Dev Server :5173
       └─ proxy /api/* → Hono :3001
                             └─ Drizzle → Neon PostgreSQL
```

O Vite proxeia todas as requisições `/api/*` para o servidor Hono local na porta 3001.

### Produção (Vercel)

```
Navegador
  └─ Vercel CDN
       ├─ /api/* → api/index.ts (Vercel Edge Function) → Neon PostgreSQL
       └─ /*     → index.html (React SPA — single-page app)
```

O `vercel.json` define duas regras de rewrite:
1. `/api/*` → serverless function em `api/index.ts`
2. Todas as outras rotas → `index.html` (SPA routing pelo React Router)

---

## Estrutura de Pastas

```
cockpit-teste-prod/
│
├── src/                        # Código frontend
│   ├── pages/                  # Uma página por rota (AcessosPage, HomePage, etc.)
│   ├── components/             # Componentes reutilizáveis
│   │   ├── ui/                 # Primitivos (Button, Badge, Dialog, Popover...)
│   │   ├── usuarios/           # Sheets de usuário (Criar, Detalhe, Editar)
│   │   ├── grupos/             # Sheets de grupo (Criar, Detalhe)
│   │   ├── instancias/         # Sheets de instância (Detalhe, Membros, Ações)
│   │   └── permissoes/         # Sheets de permissão (Atribuir, Efetivas)
│   ├── authz/                  # Sistema de autorização
│   │   ├── engine.ts           # Funções puras canXxx/getXxx (sem React)
│   │   ├── hooks.ts            # Hooks React que envolvem o engine
│   │   └── mock.ts             # Dados FGA mockados (PoC), configs de componentes
│   ├── context/                # React Context providers
│   │   ├── AuthContext.tsx     # Usuário atual, relações FGA, PersonaSwitcher
│   │   ├── ComponentesContext.tsx
│   │   └── UsersContext.tsx
│   ├── api/
│   │   └── client.ts           # Cliente HTTP tipado (wraps fetch)
│   ├── data/
│   │   └── mock.ts             # Dados locais de fallback (orgs, contas, usuários...)
│   ├── types/
│   │   └── index.ts            # Todos os tipos TypeScript compartilhados
│   └── App.tsx                 # Roteamento principal
│
├── server/                     # Código backend (dev)
│   ├── schema.ts               # Definições Drizzle (fonte de verdade do DB)
│   ├── index.ts                # Todos os endpoints REST (Hono app)
│   └── db.ts                   # Configuração Drizzle + Neon client
│
├── api/
│   └── index.ts                # Espelho do server/index.ts para Vercel Edge
│
├── docs/                       # Esta documentação
├── vercel.json                 # Configuração de deploy (rewrites)
└── vite.config.ts              # Configuração Vite (proxy, alias @/, dedup React)
```

---

## Convenções e Restrições

### Alias de importação
`@/` mapeia para `src/`. Exemplo:
```typescript
import { api } from '@/api/client'
import type { User } from '@/types'
```

### Neon HTTP Driver — sem transações nativas
O driver Neon HTTP não suporta `BEGIN/COMMIT`. Use **compensating operations**:
```typescript
// ERRADO: db.transaction(async (tx) => { ... })

// CORRETO:
const org = await db.insert(organizations).values(...).returning()
try {
  const account = await db.insert(accounts).values(...).returning()
} catch (e) {
  await db.delete(organizations).where(eq(organizations.id, org.id)) // compensação
  throw e
}
```

### React deduplication
O `vite.config.ts` define `dedupe: ['react', 'react-dom']` — necessário para o `@xyflow/react` funcionar corretamente sem duplicar o React.

### CORS
O CORS em `server/index.ts` está hardcoded para `http://localhost:5173`. Se a porta do Vite mudar, atualize este valor.

### Sincronização server/api
`server/index.ts` (dev) e `api/index.ts` (prod) precisam estar sempre sincronizados. Qualquer endpoint novo deve ser adicionado em ambos os arquivos.

---

## Sistema de Autorização (PoC vs. Produção)

### Hoje (PoC)
- Relações FGA são estáticas em `src/authz/mock.ts`
- `AuthContext` carrega as relações do mock
- `PersonaSwitcher` troca a persona ativa via `localStorage`
- `engine.ts` resolve permissões consultando arrays em memória

### Em Produção (futuro)
- `currentUser` viria de um IdP (Auth0, Cognito, etc.)
- Relações FGA seriam carregadas do OpenFGA SDK
- `reloadRelations()` faria chamada ao servidor OpenFGA
- A interface dos hooks (`useCanXxx`, `useIsPlatformAdmin`, etc.) permaneceria igual — apenas a implementação do engine mudaria
