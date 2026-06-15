# Autorização (FGA — Fine-Grained Authorization)

> **Nota:** Esta é uma implementação PoC. As relações FGA são mockadas em `src/authz/mock.ts`. Em produção, seriam carregadas do OpenFGA SDK.

---

## 5 Papéis de Plataforma

Os papéis de plataforma definem o nível de acesso global do usuário. São atribuídos ao criar/editar o usuário e aparecem no campo `papel` da tabela `users`.

| Papel | Hierarquia | Descrição |
|-------|-----------|-----------|
| `platform_admin` | 1 (mais alto) | Acesso irrestrito a toda a plataforma |
| `org_admin` | 2 | Gerencia sua organização: contas, usuários, grupos, contratos |
| `pas_architect` | 3 | Gerencia componentes da plataforma; lê dados de orgs |
| `account_admin` | 4 | Gerencia usuários e permissões dentro da sua conta |
| `member` | 5 (mais baixo) | Acesso básico de leitura à sua conta |

> **Importante:** Um usuário pode ser `account_admin` em uma conta e `member` em outra. O papel de plataforma é o teto máximo; o papel na conta (`UserAccountMembership.papel`) define o acesso operacional.

---

## Visibilidade no Sidebar por Papel

| Seção | Platform Admin | Org Admin | PAS Architect | Account Admin | Member |
|-------|:---:|:---:|:---:|:---:|:---:|
| Organizações | ✅ | ✅ | ✅ (leitura) | ❌ | ❌ |
| Acessos | ✅ | ✅ | ❌ | ✅ | ❌ |
| Componentes | ✅ | ❌ | ✅ | ❌ | ❌ |
| Canvas Org | ✅ | ✅ | ❌ | ❌ | ❌ |
| Canvas | ✅ | ✅ | ❌ | ✅ | ❌ |
| Schema | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Papéis por Componente (Módulo)

Além dos papéis de plataforma, cada componente (módulo) pode definir seus próprios papéis e ações granulares. Esses papéis são gerenciados via `component_permissions`.

### Componente Genérico (Assistente IA, Analytics, Base de Conhecimento)

3 papéis padrão:

| Papel | Ações incluídas |
|-------|----------------|
| **Viewer** | Visualizar, leitura básica |
| **User** | Viewer + interagir/usar |
| **Admin** | User + configurar e gerenciar |

---

### MaxDoc (Gestão de Documentos)

4 papéis, 27 ações.

**Papéis e suas ações:**

| Papel | Ações |
|-------|-------|
| **Leitor** | Visualizar, Ler Todos, Leitor Documento, Leitor Anexos, Download Documento, Imprimir |
| **Editor** | Leitor + Criar Documento, Editar Documento, Nova Versão, Upload Documento, Editor Documento, Criar Anexo, Editar Anexo, Anexar Arquivos |
| **Revisor** | Editor + Revisar Documento, Submeter para Aprovação, Revisor Documento, Revisar como Substituto Documento |
| **Aprovador** | Visualizar, Ler Todos, Leitor Documento, Leitor Anexos, Download Documento, Imprimir, Assinatura Eletrônica, Revisar Documento, Aprovar Documento, Aprovador Documento, Aprovador Substituto Documento, Obsoletetar Documento, Emitir Cópia Controlada, Emitir Cópia Não Controlada, Cópia Controlada Anexos, Ciclo de Aprovação Documentos |
| **Administrador** | Todas as 27 ações |

> **Nota:** Aprovador não herda ações de Editor — tem seu próprio conjunto focado em aprovação e emissão.

**Catálogo completo de ações MaxDoc:**

| # | Ação |
|---|------|
| 1 | Visualizar |
| 2 | Ler Todos |
| 3 | Leitor Documento |
| 4 | Leitor Anexos |
| 5 | Download Documento |
| 6 | Imprimir |
| 7 | Criar Documento |
| 8 | Editar Documento |
| 9 | Nova Versão |
| 10 | Upload Documento |
| 11 | Editor Documento |
| 12 | Criar Anexo |
| 13 | Editar Anexo |
| 14 | Anexar Arquivos |
| 15 | Assinatura Eletrônica |
| 16 | Revisar Documento |
| 17 | Submeter para Aprovação |
| 18 | Revisor Documento |
| 19 | Revisar como Substituto Documento |
| 20 | Aprovar Documento |
| 21 | Aprovador Documento |
| 22 | Aprovador Substituto Documento |
| 23 | Obsoletetar Documento |
| 24 | Emitir Cópia Controlada |
| 25 | Emitir Cópia Não Controlada |
| 26 | Cópia Controlada Anexos |
| 27 | Ciclo de Aprovação Documentos |

---

### DocAction (Módulo de Ações de Qualidade)

4 papéis, 14 ações.

**Papéis e suas ações:**

| Papel | Ações |
|-------|-------|
| **Colaborador** | Visualizar, Criar Ocorrência, Criar Ocorrência 8D, Editar Ocorrência, Vincular Ocorrência, Acompanhar Ocorrência |
| **Analista** | Colaborador + Categorizar Ocorrência, Analisar Causa, Criar Plano de Ação, Verificar Eficácia, Encaminhar Ocorrência |
| **Aprovador** | Analista + Aprovar Análise de Causa, Encerrar Ocorrência, Reprogramar Prazo/Responsável |
| **Administrador** | Todas as 14 ações |

**Catálogo completo de ações DocAction:**

| # | Ação |
|---|------|
| 1 | Visualizar |
| 2 | Criar Ocorrência |
| 3 | Criar Ocorrência 8D |
| 4 | Editar Ocorrência |
| 5 | Vincular Ocorrência |
| 6 | Acompanhar Ocorrência |
| 7 | Categorizar Ocorrência |
| 8 | Analisar Causa |
| 9 | Criar Plano de Ação |
| 10 | Verificar Eficácia |
| 11 | Encaminhar Ocorrência |
| 12 | Aprovar Análise de Causa |
| 13 | Encerrar Ocorrência |
| 14 | Reprogramar Prazo/Responsável |

---

### Assistente de IA

3 papéis, 8 ações.

**Papéis e suas ações:**

| Papel | Ações |
|-------|-------|
| **Viewer** | can_use_assistant, can_view_consulted_sources |
| **User** | Viewer + can_share_conversation_results, can_upload_rag_sources |
| **Admin** | Todas as 8 ações |

**Catálogo completo de ações do Assistente:**

| Ação | Descrição |
|------|-----------|
| `can_use_assistant` | Usar o assistente de IA |
| `can_view_consulted_sources` | Ver fontes consultadas nas respostas |
| `can_share_conversation_results` | Compartilhar resultados de conversa |
| `can_upload_rag_sources` | Fazer upload de documentos para RAG |
| `can_create_assistant` | Criar novo assistente |
| `can_configure_agents` | Configurar agentes de IA |
| `can_customize_ai` | Customizar parâmetros de IA |
| `can_manage_users` | Gerenciar usuários do assistente |

---

## Dois Escopos de Permissão

Toda entrada em `component_permissions` tem um campo `instancia_id` que define o escopo:

| `instancia_id` | Escopo | Comportamento |
|----------------|--------|---------------|
| `null` | **Global (nível conta)** | Permissão vale para todas as instâncias do componente na conta |
| `<uuid>` | **Específico (nível instância)** | Permissão vale somente para aquela instância |

**Exemplo:** Um usuário com `can_use_assistant` no escopo global (`instancia_id = null`) acessa TODOS os assistentes da conta. Um usuário com `can_use_assistant` em `instancia_id = inst-vanessa` só acessa o Assistente Vanessa.

---

## Modelo FGA (component_permissions)

A tabela `component_permissions` armazena todas as permissões granulares:

```sql
component_permissions (
  id           text PRIMARY KEY,  -- UUID
  entidade_tipo  text,             -- 'user' | 'group'
  entidade_id    text,             -- ID do usuário ou grupo
  componente_id  text,             -- FK para componentes
  acao           text,             -- string com nome da ação (NUNCA UUID)
  instancia_id   text | null       -- null = global; preenchido = específico
)
```

> **CRÍTICO:** O campo `acao` é **sempre uma string com o nome da ação** (ex: `"Visualizar"`, `"can_use_assistant"`). Nunca é um UUID.

### Herança de Grupo

Quando `entidade_tipo = 'group'`, a permissão se aplica a todos os membros do grupo. A resolução é feita pelo engine FGA (`src/authz/engine.ts`):

1. Carregar permissões diretas do usuário (`entidade_tipo = 'user'`)
2. Carregar grupos do usuário (`usuario_grupo` table)
3. Para cada grupo, carregar permissões (`entidade_tipo = 'group'`)
4. Unir todas as ações (direct ∪ via_grupos)

---

## Entitlements (Capabilities)

Os entitlements controlam quais módulos uma conta tem **direito de usar**. São armazenados em `account_entitlements`.

| Capability | Módulo |
|-----------|--------|
| `assistant.use` | Assistente de IA |
| `maxdoc.use` | MaxDoc |
| `docaction.use` | DocAction |
| `knowledge.use` | Base de Conhecimento |
| `analytics.use` | Analytics |

**Regra:** Se uma conta não tem o entitlement correspondente, o componente aparece como "bloqueado" (locked) na interface — o usuário vê o módulo mas não consegue atribuir permissões.

### Entitlements por Conta de Teste

| Conta | Entitlements |
|-------|-------------|
| `acc-comgas` (Comgas) | assistant.use, knowledge.use, maxdoc.use, docaction.use |
| `a1` (Apple Main) | assistant.use, knowledge.use, analytics.use |
| `a2` (Santacruz) | assistant.use, knowledge.use, analytics.use, maxdoc.use, docaction.use |

---

## Personas de Teste

O **PersonaSwitcher** (canto inferior direito da tela) permite trocar entre as personas sem necessidade de login:

| ID | Nome | Papel Plataforma | Contexto |
|----|------|-----------------|---------|
| `1` | Leonardo Lins | `platform_admin` | Acesso irrestrito a toda a plataforma |
| `2` | Ana Lima | `org_admin` | Organização Apple (`'1'`), conta `a1` |
| `3` | Marcelo Gomes | `pas_architect` | Organização Apple — gerencia componentes |
| `4` | Carla Santos | `account_admin` | Conta Santacruz (`a2`) |
| `usr-marcelo-c` | Marcelo Ribeiro | `org_admin` | Organização Docnix (`org-docnix`), conta Comgas (`acc-comgas`) |

> **Dica:** Para testar os cenários DocNix, use a persona `usr-marcelo-c` (Marcelo Ribeiro). Para testar Santacruz, use `4` (Carla Santos).

---

## Código — Estrutura do Engine

```
src/authz/
├── engine.ts   — Funções puras (sem React, sem side effects)
│                  canXxx(userId, ..., relations) → boolean
│                  getXxx(userId, ..., relations) → entidades[]
├── hooks.ts    — Hooks React que envolvem o engine
│                  useIsPlatformAdmin() → boolean
│                  useCanManageAccount(accountId) → boolean
│                  useGetComponentPermissions(componenteId) → PermissaoFGA[]
└── mock.ts     — Dados estáticos para PoC
                   mockFGARelations: lista de relações
                   mockPersonas: array de { id, nome, papel, ... }
                   COMPONENTE_CONFIGS: catálogo de papéis e ações por componente
```

**Regra de uso:** **Sempre use hooks em componentes React.** Nunca chame `engine.ts` diretamente de dentro de componentes — use os hooks de `hooks.ts`.

---

## Transição para Produção

Hoje (PoC) → Em produção (futuro):

| Hoje | Produção |
|------|---------|
| Relações mockadas em `src/authz/mock.ts` | Carregadas do OpenFGA SDK |
| `PersonaSwitcher` troca persona via `localStorage` | IdP real (Auth0, Cognito, etc.) |
| `engine.ts` resolve arrays em memória | `engine.ts` faz chamadas ao OpenFGA |
| Interface dos hooks (`useCanXxx`, `useIsPlatformAdmin`) | **Permanece igual** |

A interface pública dos hooks não muda — apenas a implementação interna do `engine.ts`.
