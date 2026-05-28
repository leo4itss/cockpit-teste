# Resumo: Implementação DocNix — Suporte a Permissões Granulares

**Branch:** `feature/grupos-permissoes-docnix-variation`  
**Data:** 2026-05-28 (atualizado)  
**Status:** ✅ PoC funcional — código, banco, seed e UI de membros/atribuições concluídos.

---

## O que foi feito

### Contexto
O DocNix (cliente Grupo ITSS) usa módulos MaxDoc e DocAction com modelo de permissões granular (~47 ações). O cockpit foi evoluído para suportar:
- **Atribuições** por componente (ex: "Aprovar Documento", "Criar Ocorrência")
- **Hierarquia de grupos** (grupo pai → filho com herança)
- **Fases** por instância (fluxo de aprovação configurável)
- **Fluxo Pré-Definido** (responsável padrão por fase: usuário, grupo, cargo ou área)
- **Slots de Perfil de Objeto** (Revisores, Aprovadores, Leitores, etc.)
- **Permissões Efetivas** por usuário (merge de atribuições diretas + grupos + hierarquia)

---

## Fases implementadas (todas com TypeScript 0 erros)

### Fase 1 — Schema (`server/schema.ts`)
Adicionado:
- Coluna `parentId` na tabela `grupos` (self-referential FK)
- Nova tabela `componente_atribuicoes` — ações disponíveis por componente
- Nova tabela `instancia_membro_atribuicoes` — junction membro ↔ atribuição
- Nova tabela `instancia_fases` — fases configuradas por instância
- Nova tabela `fase_responsaveis` — responsável padrão por fase
- Nova tabela `instancia_perfil_slots` — slots do perfil de objeto
- Nova tabela `instancia_perfil_slot_nomeacoes` — quem foi nomeado em cada slot (com validação de elegibilidade)

Novos arquivos:
- `server/migrate-docnix-schema.ts` — migra `instancia_membros.papel` (viewer/member/admin) → atribuições legado (Visualizar/Usar/Administrar)
- `server/seed-docnix-atribuicoes.ts` — seed com **47** atribuições MaxDoc + **19** DocAction
- `server/seed-docnix-instancias.ts` — instâncias Comgas, membros, fases, slots de perfil demo
- `server/docnix-elegiveis.ts` — resolve elegíveis para slot (direto + grupo + hierarquia)

### Fase 2 — Types + Engine
- `src/types/index.ts`: novos tipos `Atribuicao`, `InstanciaFase`, `FaseResponsavel`, `InstanciaPerfilSlot`, `InstanciaMembroAtribuicao`; `Grupo` ganhou `parentId?`; `FGARelations` ganhou `instanciaAtribuicoes` e `grupoParents`
- `src/authz/engine.ts`: novas funções `getGrupoAncestors`, `getInstanciaAtribuicoes`, `canActWithAtribuicao`
- `src/authz/mock.ts`: dados mock de `grupoParents` e `instanciaAtribuicoes`
- `src/authz/hooks.ts`: novos hooks `useGetInstanciaAtribuicoes`, `useCanActWithAtribuicao`

### Fase 3 — API (~30 endpoints)
Espelhados em `server/index.ts` + `api/index.ts` + `src/api/client.ts`:
- `GET|POST|PUT|DELETE /api/componentes/:id/atribuicoes`
- `PUT /api/grupos/:id` — agora aceita `parentId`
- `GET|POST|PUT|DELETE /api/instancias/:id/fases`
- `GET|POST|DELETE /api/instancias/:id/fases/:faseId/responsaveis`
- `GET|POST|PUT|DELETE /api/instancias/:id/perfil-slots`
- `GET /api/instancias/:id/elegiveis-slot?atribuicaoId=`
- `GET|POST|DELETE /api/instancias/:id/perfil-slots/:slotId/nomeacoes`
- `GET|POST|DELETE /api/instancias/:id/membros/:membroId/atribuicoes`
- `GET /api/instancias/:id/permissoes-efetivas?userId=`
- `GET /api/users/cargos-distintos`
- `GET /api/users/areas-distintas`

### Fase 4 — UI Grupos
- `CriarGrupoSheet.tsx` + `CriarGrupoOrgSheet.tsx`: campo "Grupo Pai" opcional
- `GrupoDetailSheet.tsx`: exibe nome do pai + lista de subgrupos
- `GruposPage.tsx`: coluna "Grupo Pai" na tabela + badge "Filho"

### Fase 5 — UI Instâncias
- `InstanciaDetailSheet.tsx`: 4 abas (Membros | Fases | Fluxo Padrão | Perfil de Objeto)
- **Membros (DocNix):** sem coluna Viewer/Member/Admin; botões **Atribuições** | **Efetivas** | **Remover** sempre visíveis
- **Adicionar membro:** multi-select de atribuições do catálogo + busca usuário/grupo
- **Editar membro:** `MembroAtribuicoesSheet` — checkboxes das atribuições diretas; itens via grupo somente leitura
- **Perfil de Objeto:** slots com filtro por atribuição; nomeação só entre elegíveis (`+ Nomear`)
- Instâncias **sem** catálogo DocNix mantêm coluna de papel e `AtribuirPermissoesSheet` (legado)
- `ComponenteDetailSheet.tsx`: seção "Atribuições do Componente" visível para platform_admin e pas_architect

### Fase 6 — UI Permissões Efetivas
- `PermissoesEfetivasSheet.tsx` — tabela Atribuição | Origem (badges: Direto / Via Grupo); **somente leitura**
- `AcessosPage.tsx`: botão "Ver permissões efetivas" em cada usuário
- `InstanciaDetailSheet.tsx`: botão **Efetivas** por membro usuário

### Fase 7 — Edição de atribuições por membro
- Novo: `src/components/instancias/MembroAtribuicoesSheet.tsx`
- Carrega vínculos diretos (`GET .../membros/:id/atribuicoes`) e, para usuários, merge com efetivas (badge Via Grupo)
- Salva diff via `POST` / `DELETE` em `.../membros/:id/atribuicoes`
- Substitui o botão **Permissões** (modelo FGA legado) quando o componente tem catálogo DocNix ativo

---

## Banco de dados — concluído

### `npm run db:push` ✅
As **6** novas tabelas DocNix foram criadas (+ `parentId` em `grupos`). 3 tabelas legado sem referências no código foram removidas:
- `grupo_permissoes`, `componente_objetos`, `contract_versions`

### Seed ✅
```bash
export $(cat .env | xargs) && npx tsx server/seed-docnix-atribuicoes.ts
export $(cat .env | xargs) && npx tsx server/seed-docnix-instancias.ts
```
Resultado: componentes **MaxDoc** (`comp-maxdoc`) e **DocAction** (`comp-docaction`) com catálogo completo (**47 + 19** atribuições — ver `docs/ATRIBUICOES_DOCNIX_CATALOGO.md`); instâncias **Gestão Documental Comgas** e **Ocorrências e Ações Comgas** na conta Comgas.

---

## Modelo de permissão na UI (Membros)

| Conceito | Onde editar | Onde ver resultado |
|----------|-------------|-------------------|
| **Atribuições diretas** | Botão **Atribuições** na linha do membro (ou ao adicionar) | **Efetivas** → origem "Direto" |
| **Atribuições via grupo** | **Atribuições** na linha do **grupo** membro da instância | **Efetivas** → origem "Via Grupo" |
| **Papel Viewer/Member/Admin** | Oculto em MaxDoc/DocAction (legado FGA) | Não usado no cálculo de efetivas DocNix |

Fluxo recomendado: **Membros → Atribuições** (conceder capacidades) → **Perfil de Objeto** (nomear slots filtrados por atribuição).

---

## Como testar

1. `npm run dev` + `npm run dev:server` (dois terminais)
2. Acessar o cockpit em `http://localhost:5173` (hard refresh `Cmd+Shift+R` após pull/restart)
3. Trocar persona para **"Marcelo Ribeiro"** (Org Admin DocNix) via switcher no canto inferior direito
4. **Acessos** → conta **Comgas** → aba **Instâncias** → abrir **Gestão Documental Comgas** ou **Ocorrências e Ações Comgas**

### Aba Membros
5. **Adicionar membro** → marcar atribuições → buscar usuário ou grupo
6. Na linha de um membro → **Atribuições** → editar checkboxes → **Salvar**
7. **Efetivas** (usuários) → conferir merge direto + via grupo (somente leitura)

### Abas Fases / Fluxo / Perfil
8. **Fases** — CRUD de etapas do fluxo
9. **Fluxo Padrão** — responsável por fase (usuário, grupo, cargo, área)
10. **Perfil de Objeto** — slots (Revisor, Aprovador…); filtro por atribuição; **+ Nomear** só lista elegíveis

### Outros
11. (PAS Architect) **Componentes** → MaxDoc → seção "Atribuições do Componente"
12. **Acessos** → aba Usuários → "Ver permissões efetivas" (visão por usuário em todas as instâncias)
13. **Grupos** → criar grupo com "Grupo Pai" preenchido

---

## Arquivos principais tocados

```
server/
  schema.ts                        ← +6 tabelas DocNix + parentId em grupos
  migrate-docnix-schema.ts         ← migração papéis legado → 3 atribuições
  docnix-elegiveis.ts              ← elegíveis para slot de perfil
  seed-docnix-atribuicoes.ts       ← catálogo MaxDoc (47) + DocAction (19)
  seed-docnix-instancias.ts        ← instâncias Comgas + demo
  index.ts                         ← endpoints DocNix
docs/
  ATRIBUICOES_DOCNIX_CATALOGO.md   ← catálogo + tipos + gaps PoC
  RESUMO_IMPLEMENTACAO_DOCNIX.md   ← este arquivo
api/
  index.ts                         ← espelho dos endpoints (Vercel serverless)
src/
  types/index.ts                   ← tipos DocNix (+ ElegivelSlot, nomeações)
  authz/engine.ts                  ← getGrupoAncestors, getInstanciaAtribuicoes
  authz/mock.ts                    ← hierarquia e atribuições mock
  authz/hooks.ts                   ← useGetInstanciaAtribuicoes, useCanActWithAtribuicao
  api/client.ts                    ← client tipado (atribuições, slots, elegíveis)
  components/
    grupos/CriarGrupoSheet.tsx
    grupos/CriarGrupoOrgSheet.tsx
    grupos/GrupoDetailSheet.tsx
    instancias/InstanciaDetailSheet.tsx
    instancias/MembroAtribuicoesSheet.tsx   ← NOVO: editar atribuições do membro
    ComponenteDetailSheet.tsx
    permissoes/PermissoesEfetivasSheet.tsx
    permissoes/AtribuirPermissoesSheet.tsx  ← legado (instâncias sem DocNix)
  pages/
    GruposPage.tsx
    AcessosPage.tsx
```
