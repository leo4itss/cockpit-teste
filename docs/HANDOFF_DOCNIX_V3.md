# Handoff — DocNix v3: Instâncias, Atribuições e Controle de Acesso

**Branch:** `feature/grupos-permissoes-docnix-variation`  
**Data:** 02/06/2026  
**Base:** `feature/grupos-permissoes-v2`

---

## Sumário de mudanças

1. [Schema — novas tabelas DocNix](#1-schema--novas-tabelas-docnix)
2. [Seed — dados consolidados](#2-seed--dados-consolidados)
3. [Instâncias DocNix no mock](#3-instâncias-docnix-no-mock)
4. [Atribuições de Componentes](#4-atribuições-de-componentes)
5. [UI — InstanciaDetailSheet (abas por tipoModelo)](#5-ui--instanciadetailsheet-abas-por-tipomodelo)
6. [UI — AtribuirPermissoesSheet (DocNix)](#6-ui--atribuirpermissoessheet-docnix)
7. [UI — AccountDetailSheet (banner Capacidades)](#7-ui--accountdetailsheet-banner-capacidades)
8. [Controle de acesso por perfil](#8-controle-de-acesso-por-perfil)
9. [Personas e dados de teste](#9-personas-e-dados-de-teste)
10. [O que ainda está pendente](#10-o-que-ainda-está-pendente)

---

## 1. Schema — novas tabelas DocNix

Adicionadas em `server/schema.ts` para suportar o modelo de permissões DocNix (MaxDoc / DocAction):

| Tabela | Propósito |
|--------|-----------|
| `componente_atribuicoes` | Catálogo de ações disponíveis por componente (ex: "Aprovar Documento") |
| `instancia_membro_atribuicoes` | Vínculo membro de instância ↔ atribuição (substitui papel fixo para DocNix) |
| `instancia_fases` | Fases configuradas por instância (ex: Minuta → Revisão → Aprovação → Vigente) |
| `fase_responsaveis` | Responsável padrão por fase: usuário, grupo, cargo ou área |
| `instancia_perfil_slots` | Slots de perfil de objeto (ex: Revisores, Aprovadores, Leitores) |
| `instancia_perfil_slot_nomeacoes` | Nomeações nos slots: quem ocupa cada slot por documento/ocorrência |

**Campo adicionado em tabelas existentes:**
- `componentes.tipo_modelo` — `'fga' | 'docnix' | 'custom'` — determina qual UI de permissão usar

---

## 2. Seed — dados consolidados

`server/seed.ts` é o **único arquivo de seed** necessário. Roda com:

```bash
npm run db:seed
```

Limpa e recria tudo na ordem correta de FK:

```
instancia_membro_atribuicoes
→ component_permissions / componente_atribuicoes
→ user_account_memberships / account_entitlements
→ instancia_perfil_slot_nomeacoes → fase_atribuicoes_permitidas → fase_responsaveis
→ instancia_fases → instancia_perfil_slots → instancia_membros → instancias
→ usuario_grupos → grupos
→ contracts → solutions → accounts → users → organizations
→ componentes → tipos_licenca
```

**Output esperado após seed:**

```
✓ tabelas limpas
✓ organizations (6)
✓ accounts (6)
✓ solutions (6)
✓ contracts (2)
✓ users (15)
✓ tiposLicenca (6)
✓ componentes (7)
✓ componenteAtribuicoes (20)
✓ grupos (7)
✓ usuarioGrupos (15 vínculos)
✓ userAccountMemberships (13 vínculos)
✓ instancias (16)
✓ instanciaMembros (30)
🎉 Seed completo!
```

> **Importante:** arquivos `seed-docnix-*.ts` são obsoletos — não usar. Tudo está em `seed.ts`.

---

## 3. Instâncias DocNix no mock

`src/data/mock.ts` contém instâncias DocNix para dois contextos:

**Comgas / org-docnix** (visto pelo Org Admin Marcelo):

| ID | Componente | Nome |
|----|-----------|------|
| `inst-comgas-maxdoc` | MaxDoc | Gestão Documental Comgas |
| `inst-comgas-docaction` | DocAction | Ocorrências Comgas |

**Santacruz / a2** (visto pela Account Admin Carla):

| ID | Componente | Nome |
|----|-----------|------|
| `inst-a2-maxdoc` | MaxDoc | Gestão Documental Santacruz |
| `inst-a2-docaction` | DocAction | Ocorrências Santacruz |

Entitlements ativos por conta:

```typescript
'acc-comgas': ['assistant.use', 'knowledge.use', 'maxdoc.use', 'docaction.use']
'a2':         ['assistant.use', 'knowledge.use', 'analytics.use', 'maxdoc.use', 'docaction.use']
```

---

## 4. Atribuições de Componentes

`src/data/mock.ts` exporta `componenteAtribuicoesMock` com 20 atribuições reais:

**MaxDoc (12):**
Criar Documento, Editar Documento, Excluir Documento, Revisar Documento, Aprovar Documento, Obsoletetar Documento, Ler Todos os Documentos, Imprimir, Cópia Controlada, Emitir Cópia Não Controlada, Tabelas Administrativas, Administrar MaxDoc

**DocAction (8):**
Criar Ocorrência, Categorizar Ocorrência, Analisar Causa, Aprovar Análise, Criar Plano de Ação, Verificar Eficácia, Encerrar Ocorrência, Administrar DocAction

Essas atribuições são inseridas no banco via `npm run db:seed` e carregadas via `GET /api/componentes/:id/atribuicoes` para uso nos seletores de membro de instância.

---

## 5. UI — InstanciaDetailSheet (abas por tipoModelo)

`src/components/instancias/InstanciaDetailSheet.tsx` implementa **progressive disclosure** por tipo de componente:

| tipoModelo | Abas exibidas |
|-----------|---------------|
| `'fga'` | Membros |
| `'docnix'` | Membros · Fases · Fluxo Padrão · Perfil de Objeto |

**Regra de exibição das abas extras (Fases, Fluxo Padrão, Perfil de Objeto):**
- A aba só aparece quando há dados carregados (ex: Fases só aparece se a instância tiver ao menos 1 fase cadastrada).
- Implementado via estados `fases`, `faseResponsaveis`, `perfilSlots` carregados no `useEffect` de abertura.

**Seletor de atribuições (DocNix):**
- Ao adicionar membro: busca `GET /api/componentes/:compId/atribuicoes` e exibe multi-select
- Salva em `instancia_membro_atribuicoes` (não em `instancia_membros.papel`)
- Para membros FGA: mantém dropdown `viewer / member / admin`

---

## 6. UI — AtribuirPermissoesSheet (DocNix)

`src/components/permissoes/AtribuirPermissoesSheet.tsx` — sheet de permissões por componente (aberta pelo Org Admin ao clicar em um usuário).

**Comportamento para componentes DocNix:**
- Se o componente tem atribuições no DB (`api.getAtribuicoes`): exibe a lista como checkboxes
- Se não tem atribuições carregadas (`atribuicoesMap` vazio + `tipoModelo === 'docnix'`): exibe aviso:
  > *"Permissões gerenciadas por instância — configure em Acessos → Instâncias."*
- Componentes FGA: comportamento anterior inalterado (checkboxes de ações hardcoded por tipo)

**Lógica de defaults por papel (pré-seleção):**
- Componentes DocNix são excluídos da pré-seleção automática (`if (c.tipoModelo === 'docnix') return`)
- Apenas componentes FGA têm defaults por papel (Viewer / User / Admin)

---

## 7. UI — AccountDetailSheet (banner Capacidades)

`src/components/AccountDetailSheet.tsx` — aba "Capacidades".

Regra exibida no banner azul:

```
allow = permission AND entitlement
```

**Texto atual:**
> Habilitar uma capacidade **não cria instâncias** — apenas libera a conta para recebê-las.
> É um pré-requisito: sem ela, nenhum acesso é liberado mesmo que a permissão exista.
> As instâncias são criadas dentro do próprio produto (ex: MaxDoc) e refletidas automaticamente no cockpit.

Isso esclarece a separação de conceitos:
- **Entitlement** = gate de licença (configurado no cockpit)
- **Instância** = contexto específico do produto (criado dentro do MaxDoc/DocAction, refletido no cockpit)

---

## 8. Controle de acesso por perfil

### Sidebar (`src/components/Sidebar.tsx`)

| Seção | Platform Admin | PAS Architect | Org Admin | Account Admin | Member |
|-------|:-:|:-:|:-:|:-:|:-:|
| Organizações | ✅ | ✅ | ✅ | ❌ | ❌ |
| Acessos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Componentes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Visualização (Canvas) | ✅ | ❌ | ✅ (só Canvas) | ❌ | ❌ |

### Guards de rota

| Rota | Perfis bloqueados | Redirect para |
|------|-------------------|---------------|
| `/componentes` | org_admin, account_admin, member | `/home` |
| `/organizacoes` | account_admin puro | `/acessos` |

### Filtro de organizações (`OrganizacoesPage`)

```
Platform Admin → vê todas as orgs
Org Admin      → vê apenas sua org (filtro por adminOrgId)
Account Admin  → redirecionado para /acessos (não acessa a página)
```

---

## 9. Personas e dados de teste

| Persona | Papel | Org / Conta | Usuário mock |
|---------|-------|-------------|-------------|
| Platform Admin | `platform_admin` | todas | `usr-platform` |
| PAS Architect | `pas_architect` | todas | `usr-pas` |
| Org Admin (Docnix) | `org_admin` | org-docnix / acc-comgas | `usr-marcelo-c` |
| Account Admin (Santacruz) | `account_admin` | a2 | `usr-carla` |
| Member | `member` | acc-comgas | `usr-fernando` |

**Instâncias DocNix disponíveis para cada persona:**

*Org Admin (Docnix) → acc-comgas:*
- `inst-comgas-maxdoc` — Gestão Documental Comgas
- `inst-comgas-docaction` — Ocorrências Comgas
- + instâncias FGA: Assistente Vanessa, CEO, Workspace Vendas, Fornecedores, Dashboard Ops

*Account Admin (Santacruz) → a2:*
- `inst-a2-maxdoc` — Gestão Documental Santacruz
- `inst-a2-docaction` — Ocorrências Santacruz
- + instâncias FGA: Assistente Farmacêutico, Suporte, Base Regulatório, Base Operações, Dashboard Comercial

---

## 10. O que ainda está pendente

### Alta prioridade

| Item | Descrição |
|------|-----------|
| **Seed de fases** | `instancia_fases` e `fase_responsaveis` não são inseridos pelo seed — precisam ser populados manualmente ou via script separado |
| **Seed de perfil slots** | `instancia_perfil_slots` idem |
| **Integração OpenFGA real** | `src/authz/engine.ts` é mock local; em produção cada `can*` vira `await fga.check(...)` |

### Média prioridade

| Item | Descrição |
|------|-----------|
| **Permissões efetivas** | `PermissoesEfetivasSheet` existe mas a API `GET /api/instancias/:id/permissoes-efetivas` não está implementada no backend |
| **Hierarquia de grupos** | Campo `parentId` existe no schema mas a UI não permite criar grupo filho ainda |
| **Perfil de Objeto (slots)** | Aba existe na UI, CRUD de slots funciona, mas nomeações por documento não foram implementadas |
| **Cargo e Área como entidades** | Hoje são campos texto livre; `fase_responsaveis` com `tipoResponsavel='cargo'` funciona por match de texto |

### Baixa prioridade

| Item | Descrição |
|------|-----------|
| **SchemaVisualizerPage** | Pode ser atualizada para incluir as novas tabelas DocNix |
| **CanvasPermissoesPage** | Atualizar para mostrar atribuições DocNix por instância |
| **Auditoria de permissões** | Log de quem atribuiu/removeu cada permissão |

---

## Arquivos alterados nessa branch (principais)

```
server/
  schema.ts              — novas tabelas DocNix
  seed.ts                — seed consolidado (único arquivo necessário)

src/
  data/mock.ts           — instâncias DocNix, componenteAtribuicoesMock, entitlements
  types/index.ts         — tipos Atribuicao, InstanciaFase, FaseResponsavel, InstanciaPerfilSlot
  authz/engine.ts        — getInstanciaAtribuicoes, canActWithAtribuicao
  authz/hooks.ts         — useGetInstanciaAtribuicoes, useCanActWithAtribuicao
  components/
    Sidebar.tsx                              — visibilidade Componentes restrita (platform+pas)
    AccountDetailSheet.tsx                   — banner Capacidades atualizado
    instancias/InstanciaDetailSheet.tsx      — abas progressivas (FGA vs DocNix)
    instancias/PermissoesMembroSheet.tsx     — seletor de atribuições DocNix
    permissoes/AtribuirPermissoesSheet.tsx   — tratamento DocNix sem catálogo
  pages/
    ComponentesPage.tsx    — guard de rota (redireciona não-admin/architect)
    OrganizacoesPage.tsx   — guard de rota (account admin → /acessos) + filtro corrigido
```
