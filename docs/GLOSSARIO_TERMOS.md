# Glossário de Termos — Cockpit ITSS

**Data:** 2026-05-29  
**Contexto:** Alinhamento de vocabulário entre o cockpit, o modelo FGA/OpenFGA e o padrão AuthZEN (OpenID).  
Baseado na reunião Produto & Design de 26/05/2026 (River + Leo) e na especificação [AuthZEN 1.0](https://openid.github.io/authzen/).

> **Regra de ouro:** toda decisão de autorização responde a uma única pergunta:
> **"Pode o *Sujeito* X executar a *Ação* Y sobre o *Recurso* Z?"**

---

## 1. Entidades canônicas (AuthZEN)

Estes são os cinco termos do padrão. Tudo no cockpit deve ser mapeado para um deles.

| Termo AuthZEN | Pergunta | Descrição |
|---|---|---|
| **Sujeito** (`subject`) | *Quem?* | O usuário ou grupo que solicita acesso |
| **Recurso** (`resource`) | *Sobre o quê?* | O objeto que está sendo acessado |
| **Ação** (`action`) | *Fazendo o quê?* | A operação que o sujeito quer executar |
| **Contexto** (`context`) | *Em que condição?* | Fatores ambientais: fase do fluxo, horário, localização |
| **Decisão** (`decision`) | *Pode ou não pode?* | O resultado: `true` ou `false` |

---

## 2. Mapeamento — cockpit hoje → AuthZEN

### Sujeito

| Termo no cockpit | Mapeamento AuthZEN | Observação |
|---|---|---|
| `Usuário` | `subject { type: "user" }` | ✅ direto |
| `Grupo` | `subject { type: "group" }` | ✅ direto |
| `Papel` (platform_admin, org_admin…) | **Relação** no OpenFGA | Papel de plataforma é uma *relação* entre usuário e organização, não uma entidade própria |
| `Papel` (viewer, member, admin) | **Relação** no OpenFGA | Papel de instância é uma *relação* entre usuário e instância, não uma entidade própria |

### Recurso

| Termo no cockpit | Mapeamento AuthZEN | Observação |
|---|---|---|
| `Instância` | `resource { type: "instancia" }` | ⚠️ Instância *é* um recurso. O nome "instância" é interno do cockpit; no FGA é chamado de *objeto* |
| `Componente` | Define o **tipo** do recurso | MaxDoc → `resource.type = "maxdoc"`; DocAction → `resource.type = "docaction"` |
| `Documento` (DocNix) | `resource { type: "documento" }` | Recurso de granularidade mais fina (futuro) |
| `Ocorrência` (DocNix) | `resource { type: "ocorrencia" }` | Idem |

### Ação

| Termo no cockpit | Mapeamento AuthZEN | Observação |
|---|---|---|
| `Atribuição` | `action { name: "can_criar_documento" }` | ✅ Atribuições do catálogo (`componente_atribuicoes`) são Ações |
| `Permissão` (termo genérico) | **Não é uma entidade** — é o resultado (Decisão) | ❌ Evitar como substantivo: "dar permissão" → "conceder Ação" |

### Contexto

| Termo no cockpit | Mapeamento AuthZEN | Observação |
|---|---|---|
| `Fase` (do fluxo) | `context { fase: "em_aprovacao" }` | A fase atual do documento é contexto para avaliar a decisão |
| `restringirAcesso` | `context { restrito: true }` | Modifica quem pode ser viewer |

---

## 3. Termos com problema de ambiguidade

### "Papel" — três usos distintos

| Uso atual | Significado | Como deveria chamar |
|---|---|---|
| `papel: 'platform_admin'` | Perfil de acesso global | **Perfil de plataforma** ou **Role** |
| `papel: 'viewer' \| 'member' \| 'admin'` | Relação FGA entre usuário e instância | **Relação** (OpenFGA) ou **Nível de acesso** (UX) |
| `Grupo.papel` (string livre) | Campo genérico de descrição | **Função** do grupo |

### "Perfil" — três usos distintos

| Uso atual | Significado | Como deveria chamar |
|---|---|---|
| PersonaSwitcher (PoC) | Persona de navegação para teste | **Persona** (manter como está — só existe no PoC) |
| `InstanciaPerfilSlot` (DocNix) | Slots de metadado de documento (Revisor, Aprovador…) | **Perfil de Objeto** (manter — é termo nativo DocNix) |
| "Perfil de usuário" (conversas) | Papel/role do usuário | **Função** ou **Role** — evitar "perfil" neste contexto |

### "Permissão" — sem entidade própria

`Permissão` é usada coloquialmente para significar coisas diferentes:
- "dar permissão" → conceder uma **Ação** a um **Sujeito** sobre um **Recurso**
- "ver permissões" → listar **Ações** disponíveis
- "permissões efetivas" → **Decisões** calculadas (✅ já chamamos de "Permissões Efetivas" — manter)

**Regra:** não usar `Permissão` como substantivo isolado. Sempre qualificar: "Ações disponíveis", "Permissões Efetivas", "Atribuir Ação".

### "Instância" vs "Objeto"

O cockpit chama de `Instância` o que o FGA/AuthZEN chama de `Object` (Recurso com tipo e ID).  
**Decisão:** manter `Instância` como termo de produto (é mais compreensível para o usuário final), mas documentar que, no nível de autorização, uma Instância *é* um Recurso.

---

## 4. Vocabulário recomendado por audiência

### Para usuários finais (UI)
| Conceito | Termo na UI |
|---|---|
| Sujeito usuário | Usuário |
| Sujeito grupo | Grupo |
| Recurso (instância) | Instância |
| Ação (atribuição) | Atribuição |
| Relação (viewer/admin) | Nível de acesso |
| Decisão positiva | Acesso permitido |

### Para administradores do cockpit
| Conceito | Termo |
|---|---|
| Catálogo de Ações por Componente | Catálogo de Atribuições |
| Vínculo Sujeito → Ação → Recurso | Atribuição de acesso |
| Merge de Ações (direto + grupo + hierarquia) | Permissões Efetivas |
| Relação de plataforma | Perfil de plataforma (platform_admin, org_admin…) |

### Para desenvolvedores / FGA
| Conceito | Termo técnico |
|---|---|
| Sujeito | `subject` (AuthZEN) / `user:` ou `group:` (OpenFGA) |
| Recurso | `resource` (AuthZEN) / `instancia:` (OpenFGA) |
| Ação | `action.name` (AuthZEN) / relação `can_X` (OpenFGA) |
| Relação de papel | `relation: viewer \| member \| admin` (OpenFGA) |
| Decisão | `decision: true \| false` (AuthZEN) |
| Tuple FGA | `(subject, relation, object)` |

---

## 5. Como o cockpit responde à pergunta canônica

```
Pode o Sujeito X executar a Ação Y sobre o Recurso Z?
```

**Modelo FGA (padrão — viewer/member/admin):**
```
Sujeito:  user:marcelo
Ação:     can_use_assistant   ← derivado da relação "member"
Recurso:  instancia:assist-ceo
Decisão:  true
```

**Modelo DocNix (granular — atribuições):**
```
Sujeito:  user:fernanda
Ação:     can_aprovar_documento   ← atribuição direta no catálogo MaxDoc
Recurso:  instancia:maxdoc-comgas
Decisão:  true
```

**Modelo DocNix com Contexto (fase do fluxo):**
```
Sujeito:  user:fernanda
Ação:     can_aprovar_documento
Recurso:  instancia:maxdoc-comgas
Contexto: { fase: "em_aprovacao" }
Decisão:  true   ← só válida se o documento está na fase correta
```

---

## 6. O que o Componente representa no modelo

O `Componente` (MaxDoc, DocAction, Assistente…) não é um Sujeito nem um Recurso — é a **definição do tipo de Recurso** e do **catálogo de Ações** disponíveis para esse tipo.

```
Componente MaxDoc
  ├── tipo de recurso:  "instancia_maxdoc"
  └── catálogo de ações (componente_atribuicoes):
        can_criar_documento
        can_aprovar_documento
        can_revisar_documento
        ... (47 ações)

Instância "Gestão Documental Comgas"
  ├── type: "instancia_maxdoc"   ← herdado do Componente
  ├── id:   "inst-comgas-maxdoc"
  └── membros com Ações atribuídas
```

Em OpenFGA, cada Componente define um **type** e suas **relations**. O campo `tipoModelo` no cockpit indica se as Ações são granulares (`docnix`) ou coarse-grained (`fga`).

---

## 7. Termos a evitar

| ❌ Evitar | ✅ Usar em vez |
|---|---|
| "dar permissão para X" | "atribuir Ação Y ao Sujeito X" |
| "o perfil do usuário" (quando significa role) | "a função/role do usuário" |
| "permissão" como entidade isolada | "Atribuição" (ação) ou "Decisão" (resultado) |
| "papel viewer" como entidade | "relação viewer" (OpenFGA) ou "nível de acesso Visualizador" (UX) |
| "instância é um componente" | "instância *é uma implantação de* um componente" |

---

## 8. Gaps de nomenclatura no código atual

| Arquivo | Termo problemático | Sugestão futura |
|---|---|---|
| `src/types/index.ts:352` | `papel: 'viewer' \| 'member' \| 'admin'` em `InstanciaMembro` | Renomear para `relacao` ou `nivelAcesso` |
| `src/types/index.ts:260` | `papel: 'member' \| 'account_admin'` em `UserAccountMembership` | Renomear para `role` |
| `src/authz/engine.ts` | Funções `canXxx` usam `papel` internamente | Manter por consistência com OpenFGA (`can_X`) |
| `src/authz/hooks.ts:108` | Seção "Perfil / navegação" | Renomear para "Role / navegação" |
| `server/schema.ts` | Coluna `papel` em `instancia_membros` | Renomear para `relacao` em migração futura |

> **Nota:** estes gaps são de baixo risco para o PoC. A prioridade é alinhar o vocabulário nas conversas e na documentação antes de refatorar o código.
