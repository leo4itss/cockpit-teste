# Modelo de Domínio

## Hierarquia de Entidades

```
Organization
  └─ Account (1 ou mais por organização)
       ├─ UserAccountMembership   → quem é membro e com qual papel (member | account_admin)
       ├─ AccountEntitlement      → capabilities ativas (assistant.use, maxdoc.use, etc.)
       ├─ Grupo (escopo='conta')  → grupos exclusivos desta conta
       └─ Instancia               → cópia configurada de um Componente
            └─ InstanciaMembro    → quem acessa esta instância e com qual papel

  ├─ Grupo (escopo='org')         → grupos herdados por todas as contas da org
  ├─ Solution                    → soluções com planos versionados
  └─ Contract                    → vincula soluções, planos e a organização

User
  ├─ UserAccountMembership        → papel em cada conta
  └─ UsuarioGrupo                 → grupos aos quais pertence

Componente (plataforma)
  ├─ ComponenteAtribuicao         → catálogo de ações disponíveis (MaxDoc, DocAction)
  └─ ComponentPermission          → permissão FGA: quem → faz o quê → em qual componente/instância

── Workflow DocNix ──
InstanciaFase
  ├─ FaseResponsavel              → quem é responsável pela fase
  └─ FaseAtribuicaoPermitida      → quais ações são permitidas na fase

InstanciaPerfilSlot
  └─ InstanciaPerfilSlotNomeacao  → nomeação de responsável para o slot
```

---

## Entidades em Detalhe

### Organization (Organização)

Entidade raiz. Cada cliente da ITSS é uma organização.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text (PK) | UUID gerado pelo frontend |
| name | text | Nome da organização |
| docType | text | Tipo de documento (CPF, CNPJ, etc.) |
| docNumber | text | Número do documento |
| domain | text | Domínio (ex: empresa.com.br) |
| activitySector | text | Setor de atividade |
| country / state / city | text | Localização |
| arquitetoPAS | text | Nome do arquiteto PAS responsável |
| status | text | `'Ativo'` \| `'Inativo'` |

### Account (Conta)

Uma organização pode ter múltiplas contas (ex: matriz, filial, departamento).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text (PK) | UUID |
| orgId | text (FK) | Organização pai |
| name | text | Nome da conta |
| subdomain | text | Subdomínio da conta |
| status | text | `'Ativo'` \| `'Inativo'` |
| deletedAt | text | Soft-delete via data (quarentena) — não usa `status` |

> **Padrão diferente:** Account usa `deletedAt` em vez de `status` para soft-delete.

### User (Usuário)

Usuário da plataforma. Um usuário pode pertencer a múltiplas contas e organizações.

| Campo | Descrição |
|-------|-----------|
| id | UUID |
| nomeCompleto | Nome completo |
| usuario | Username único |
| email | E-mail único |
| pais / telefone / area / cargo | Dados pessoais |
| papel | Papel na plataforma (não confundir com papel na conta) |
| formatoData / formatoHora / fusoHorario | Preferências regionais |
| status | `'Ativo'` \| `'Inativo'` |
| ultimoAcesso | Data/hora do último acesso (texto) |
| createdAt | Data de criação (ISO 8601) |

> **Nota:** O campo `senha` não existe no banco de dados. A autenticação é gerenciada externamente.

### Componente

Módulo da plataforma (MaxDoc, DocAction, Assistente IA, etc.). Definido pela ITSS, não pelo cliente.

| Campo | Descrição |
|-------|-----------|
| id | UUID |
| nome | Nome do componente |
| descricao | Descrição |
| tipoModelo | `'fga'` \| `'docnix'` \| `'custom'` |
| status | `'Ativo'` \| `'Inativo'` |
| metadataUrl | URL opcional para metadados externos |

> **Regra:** Componente vinculado a uma solução ativa é **inativado** (não hard-deletado) ao ser removido.

### Instancia (Objeto)

Cópia configurada de um componente dentro de uma conta. Por exemplo: "MaxDoc — Gestão de Documentos Contábeis" é uma instância do componente MaxDoc.

| Campo | Descrição |
|-------|-----------|
| id | UUID |
| componenteId | Referência ao componente |
| accountId | Referência à conta |
| nome | Nome desta instância específica |
| descricao | Descrição |
| status | `'Ativo'` \| `'Inativo'` |
| restringirAcesso | boolean — se true, apenas membros explícitos acessam |
| qtdMembros | Contador de membros (desnormalizado) |

### Grupo

Agrupamento de usuários para atribuição coletiva de permissões.

| Campo | Descrição |
|-------|-----------|
| id | UUID |
| nome | Nome do grupo |
| escopo | `'org'` — criado pelo Org Admin, herdado por todas as contas \| `'conta'` — exclusivo de uma conta |
| orgId | Preenchido quando escopo='org' |
| accountId | Preenchido quando escopo='conta' |
| papel | Papel padrão do grupo (ex: Viewer, User, Admin) |
| parentId | Grupo pai (hierarquia, máx. 10 níveis) |
| status | `'Ativo'` \| `'Inativo'` |

### ComponentPermission (Permissão FGA)

Armazena permissões granulares no modelo FGA.

| Campo | Descrição |
|-------|-----------|
| id | UUID |
| entidadeTipo | `'user'` \| `'group'` |
| entidadeId | ID do usuário ou grupo |
| componenteId | Referência ao componente |
| acao | Nome da ação (string, ex: `"Visualizar"`, `"can_use_assistant"`) |
| instanciaId | null = permissão global na conta; preenchido = permissão específica na instância |

> **Importante:** `acao` é sempre uma string com o nome da ação — nunca um UUID. Isso vale para todos os componentes, incluindo MaxDoc e DocAction.

### AccountEntitlement (Capability)

Controla quais módulos uma conta tem direito de usar.

| Campo | Descrição |
|-------|-----------|
| id | UUID |
| accountId | Referência à conta |
| capability | Ex: `'assistant.use'`, `'maxdoc.use'`, `'docaction.use'`, `'knowledge.use'`, `'analytics.use'` |

---

## Dados de Teste (Mock)

### Organizações

| ID | Nome | Setor |
|----|------|-------|
| `'1'` | Apple | Tecnologia |
| `'2'` | Santacruz | Farmacêutico |
| `'3'` | Margatastiltda | Varejo |
| `'4'` | Nadapedra | Energia |
| `'5'` | Agropocereal | Agropecuário |
| `'org-docnix'` | Docnix (Comgas) | Tecnologia |

### Contas

| ID | Nome | Organização | Entitlements |
|----|------|------------|-------------|
| `a1` | Apple Main | Apple | assistant.use, knowledge.use, analytics.use |
| `a2` | Santacruz | Santacruz | assistant.use, knowledge.use, analytics.use, maxdoc.use, docaction.use |
| `acc-comgas` | Comgas | Docnix | assistant.use, knowledge.use, maxdoc.use, docaction.use |

### Componentes

| ID | Nome | Tipo |
|----|------|------|
| `comp-1` | PAS Core | fga |
| `comp-2` | Knowledge Base | fga |
| `comp-assistente-ia` | Assistente de IA | fga |
| `comp-base-conhecimento` | Base de Conhecimento | fga |
| `comp-analytics` | Analytics | fga |
| `comp-maxdoc` | MaxDoc | docnix |
| `comp-docaction` | DocAction | docnix |

### Usuários de Teste

| ID | Nome | Contexto |
|----|------|---------|
| `1` | Leonardo Lins | Platform Admin |
| `2` | Ana Lima | Org Admin — Apple |
| `4` | Carla Santos | Account Admin — Santacruz (a2) |
| `usr-marcelo-c` | Marcelo Ribeiro | Org Admin — Docnix/Comgas |
| `usr-fernando` | Fernando | Membro — Comgas |
| `usr-neide` | Neide | Membro — Comgas |
| `usr-leo` | Leo | Membro — Comgas |
| `usr-lucas` | Lucas Oliveira | Membro — Santacruz |
| `usr-beatriz` | Beatriz Lima | Membro — Santacruz |
| `usr-thiago` | Thiago Martins | Membro — Santacruz |

### Instâncias de Teste

| ID | Nome | Componente | Conta |
|----|------|-----------|-------|
| `inst-vanessa` | Assistente Vanessa | Assistente IA | Comgas |
| `inst-ceo` | Assistente CEO | Assistente IA | Comgas |
| `inst-comgas-maxdoc` | MaxDoc Comgas | MaxDoc | Comgas |
| `inst-comgas-docaction` | DocAction Comgas | DocAction | Comgas |
| `inst-a2-maxdoc` | MaxDoc Santacruz | MaxDoc | Santacruz |
| `inst-a2-docaction` | DocAction Santacruz | DocAction | Santacruz |
| `inst-a2-atend` | Atendimento | Assistente IA | Santacruz |

---

## Padrões do Modelo

### Soft-delete
- **Maioria das entidades:** `status: 'Ativo' | 'Inativo'`
- **Account:** `deletedAt: string | null` (quarentena — pode ser restaurada)
- **Componente vinculado:** inativado, nunca hard-deletado

### Versionamento de Planos (Solution)
`Solution.plans` é um campo JSONB que armazena o histórico de versões:
- Nova edição cria um entry com `statusVersao: 'ativo'`
- A versão anterior é marcada como `statusVersao: 'inativo'`
- O backend (`PUT /api/solutions/:id`) gerencia este merge automaticamente

### Hierarquia de Grupos
Grupos podem ter um `parentId` (grupo pai), formando uma árvore de hierarquia. O sistema previne ciclos (máx. 10 níveis) via validação no backend (`PUT /api/grupos/:id`).
