# Páginas e Fluxos de UI

## Mapa de Rotas

| Página | Rota | Papel Mínimo | Arquivo |
|--------|------|-------------|---------|
| Home | `/home` | Todos | `src/pages/HomePage.tsx` |
| Organizações | `/organizacoes` | org_admin | `src/pages/OrganizacoesPage.tsx` |
| Contas | `/contas` | org_admin | `src/pages/ContasPage.tsx` |
| Grupos | `/grupos` | org_admin | `src/pages/GruposPage.tsx` |
| Acessos | `/acessos` | account_admin | `src/pages/AcessosPage.tsx` |
| Componentes | `/componentes` | pas_architect | `src/pages/ComponentesPage.tsx` |
| Instância | `/instancia/:id` | account_admin | `src/pages/InstanciaPage.tsx` |
| Canvas Org | `/canvas-org` | platform_admin | `src/pages/CanvasOrgPage.tsx` |
| Canvas | `/canvas` | org_admin | `src/pages/CanvasPage.tsx` |
| Schema | `/schema` | platform_admin | `src/pages/SchemaVisualizerPage.tsx` |

---

## Páginas em Detalhe

### Home (`/home`)

Página de entrada após o "login". Contém dois painéis principais:

**Launcher de Soluções:**
- Mostra as soluções disponíveis para a conta selecionada
- Clicando em uma solução, abre uma instância ou lista de instâncias

**Marketplace / Gerenciamento:**
- Popover com atalhos para as seções do Cockpit
- Visível conforme o papel do usuário (ex: Org Admin vê Organizações, Acessos, Canvas)

**Comportamento por papel:**
- Platform Admin: vê todos os módulos de gerenciamento
- Org Admin: vê Organizações, Acessos, Grupos, Canvas
- Account Admin: vê apenas Acessos, Canvas
- Member: sem acesso ao gerenciamento

---

### Organizações (`/organizacoes`)

CRUD completo de organizações. Acessível para `org_admin` e `platform_admin`.

**Listagem:**
- Tabela com: Nome, Setor, Status, Arquiteto PAS, ações
- Filtro por status (Ativo/Inativo)
- Botão "Nova Organização"

**Criar Organização:**
Sheet lateral com campos:
- Nome, Tipo de documento, Número do documento
- Domínio, Setor de atividade
- País, Estado, Cidade
- Arquiteto PAS responsável

> **Nota técnica:** Ao criar uma organização, o backend também cria automaticamente uma conta padrão (compensating transaction — se falhar, deleta a org).

**Editar / Detalhe:**
Sheet com os mesmos campos para edição.

---

### Contas (`/contas`)

Gestão de contas de uma organização. Acessível para `org_admin`.

**Listagem:**
- Filtro por organização (dropdown)
- Tabela com: Nome, Organização, Status, Membros, ações

**Criar Conta:**
Sheet com: Nome, Subdomínio, Organização pai.

**Detalhe da Conta (sheet):**
- Informações gerais
- Membros da conta (lista com papel)
- Entitlements (capabilities ativas)
- Botão para quarentenar (soft-delete via `deletedAt`)

---

### Grupos (`/grupos`)

Gestão de grupos de escopo `org`. Acessível para `org_admin`.

**Listagem:**
- Grupos criados na organização do usuário atual
- Tabela com: Nome, Escopo, Membros, Papel, ações

**Criar Grupo:**
Sheet com: Nome, Papel padrão, Grupo pai (hierarquia).

**Detalhe do Grupo:**
Sheet com membros, papel, subgrupos.

> **Nota:** Grupos de escopo `conta` são gerenciados dentro da página Acessos (aba Papéis).

---

### Acessos (`/acessos`)

Página central de gerenciamento de acesso dentro de uma conta. Acessível para `account_admin`.

**Seletor de Conta:**
Dropdown no topo — permite selecionar qual conta gerenciar (para Org Admin e Platform Admin, que têm acesso a múltiplas contas).

**4 abas:**

#### Aba: Usuários
- Lista usuários membros da conta selecionada
- Colunas: Nome, E-mail, Papel na conta, Status
- Ações: Ver detalhe, Adicionar usuário existente, Criar novo usuário
- Sheet de detalhe mostra: dados pessoais, papel, objetos com permissão, ações granulares

#### Aba: Papéis
- Lista grupos da conta (escopo `conta`) e da organização (escopo `org`)
- Botão: "Criar Grupo"
- Cada grupo mostra: Nome, Escopo, Papel, Membros
- Ao clicar: abre sheet com membros e permissões do grupo

#### Aba: Objetos
- Lista instâncias (objetos) da conta
- Cada objeto mostra: Nome do componente, Tipo, Membros, Status do entitlement
- Ao clicar: abre `InstanciaDetailSheet` com membros e ações do objeto

#### Aba: (Global — Nível de Conta)
- Permissões FGA de escopo global (`instancia_id = null`)
- Lista usuários e grupos com ações no nível da conta inteira

---

### Componentes (`/componentes`)

CRUD de componentes da plataforma. Acessível para `pas_architect`.

**Listagem:**
- Tabela com: Nome, Tipo de modelo (`fga`, `docnix`, `custom`), Status
- Botão "Novo Componente"

**Criar/Editar Componente:**
Sheet com: Nome, Descrição, Tipo de modelo, URL de metadados.

**Detalhe do Componente:**
- Informações gerais
- Lista de instâncias criadas (por conta)
- Via **Acessos**: link para atribuir ações

> **Regra:** Componente vinculado a solução ativa é inativado (não deletado) ao ser removido.

---

### Instância (`/instancia/:id`)

Página dedicada a uma instância específica (objeto). Acessível a partir de Acessos > Objetos.

**Header:**
- Nome da instância, componente pai, conta
- Status e contagem de membros

**Abas exibidas conforme o tipo do componente:**

| Tipo | Abas |
|------|------|
| `fga` (Assistente, Analytics) | Membros |
| `docnix` (MaxDoc, DocAction) | Membros, Fases, Fluxo Padrão, Perfil de Objeto |

**Aba Membros:**
- Tabela de membros com papel e ações
- Botão "Adicionar Membro"
- Ao clicar no membro: abre `PermissoesMembroSheet`

**Aba Fases (DocNix):**
- Lista de fases do workflow documental
- Cada fase tem responsáveis e ações permitidas

**Aba Fluxo Padrão (DocNix):**
- Visualização do fluxo de aprovação configurado

**Aba Perfil de Objeto (DocNix):**
- Slots de responsáveis (InstanciaPerfilSlot)
- Nomeações para cada slot (InstanciaPerfilSlotNomeacao)

---

### Canvas Org (`/canvas-org`)

Visualização interativa da estrutura da organização como grafo. Usa `@xyflow/react`.

**Nós no grafo:**
- Organização
- Contas da org
- Usuários de cada conta
- Grupos
- Entitlements

**Interatividade:**
- Drag para mover nós
- Zoom in/out
- Clicar em nó para ver detalhes no painel lateral

---

### Canvas (`/canvas`)

Visualização interativa de permissões de uma conta. Usa `@xyflow/react`.

**Nós no grafo:**
- Conta selecionada
- Usuários e grupos
- Instâncias (objetos)
- Permissões (arestas com rótulo da ação)

**Interatividade:**
- Filtrar por usuário/grupo
- Expandir/colapsar nós
- Ver permissões diretas vs. herdadas de grupo

---

### Schema (`/schema`)

Visualizador interativo do schema do banco de dados. Acessível apenas para `platform_admin`.

- Renderiza todas as tabelas como nós
- Arestas representam foreign keys
- Útil para entender o modelo de dados durante o desenvolvimento

---

## Sheets (Painéis Laterais) Mais Importantes

### CriarUsuarioSheet

Abre a partir de Acessos > Usuários > "Criar Usuário".

**Campos:**
- Nome completo, Username, E-mail
- País, Telefone, Área, Cargo
- Papel na conta (member | account_admin)
- Formato de data/hora, Fuso horário

**Comportamento:**
- Cria o usuário no banco E já o associa à conta selecionada (dois inserts)
- Se e-mail já existir: mensagem "Este e-mail já está cadastrado na plataforma."
- Se username já existir: mensagem "Este nome de usuário já está em uso."
- Campo `senha` **não** é enviado ao banco (foi removido — veja correção de bug)

---

### UsuarioDetailAccountSheet

Detalhe de um usuário dentro do contexto de uma conta. Abre clicando no usuário em Acessos.

**Seções:**
1. **Dados pessoais:** foto, nome, e-mail, cargo, etc.
2. **Papel no Cockpit:** papel de plataforma (`platform_admin`, `org_admin`, etc.)
3. **Papel na conta:** `member` ou `account_admin`
4. **Ações** (antes chamado "Permissões"): lista de ações granulares do usuário nesta conta
   - Ações diretas: atribuídas diretamente ao usuário
   - Ações via grupo: herdadas de grupos

---

### InstanciaDetailSheet

Detalhe de uma instância (objeto). Abre em Acessos > Objetos ao clicar em um objeto.

**Informações:**
- Nome, componente, conta, status
- Membros com papel

**Ações:**
- Botão "Ações" → abre `PermissoesMembroSheet` ou `AtribuirPermissoesSheet`
- Botão "Editar" → edita nome/descrição da instância

---

### PermissoesMembroSheet (Ações do Membro)

Sheet aninhada que mostra e edita as ações de um usuário/grupo em uma instância específica.

**Exibe:**
- Papel atual (com selector de papel)
- Ações incluídas no papel (pré-selecionadas)
- Toggle para "Personalizado" → permite selecionar ações manualmente
- Ações herdadas de grupo (read-only, badge verde)

**Comportamento:**
- Ao trocar o papel: ações são atualizadas automaticamente
- Papel "Personalizado": sem pré-seleção, seleção manual livre
- Salvar: persiste em `component_permissions`

---

### AtribuirPermissoesSheet (Ações — Nível Conta)

Sheet para atribuir ações de escopo global (`instancia_id = null`) a um usuário ou grupo.

**Exibe:**
- Lista de componentes disponíveis na conta (com entitlements ativos)
- Para cada componente: ações disponíveis
- Se entitlement inativo: exibe badge "Capability inativa" e bloqueia seleção

---

### PermissoesEfetivasSheet (Ações Efetivas)

Mostra todas as ações efetivas de um usuário — diretas + herdadas de grupos.

**Colunas:**
- Ação
- Componente/Instância
- Origem (Direto | Via Grupo: nome_do_grupo)

---

## Fluxos Principais

### Fluxo: Criar usuário e atribuir a objeto MaxDoc

```
1. Acessos → Usuários → "Criar Usuário"
   → Preencher dados → Salvar
   → Usuário criado e associado à conta

2. Acessos → Objetos → selecionar "MaxDoc Comgas"
   → Clique no objeto → InstanciaDetailSheet abre
   → "Adicionar Membro" → buscar usuário criado
   → Selecionar papel (ex: Editor) → Salvar

3. Verificar em PermissoesMembroSheet:
   → Ações do Editor pré-selecionadas
   → Persistidas em component_permissions
```

### Fluxo: Alterar papel de usuário em instância

```
1. Acessos → Objetos → instância → PermissoesMembroSheet do usuário
2. Trocar papel no selector (ex: Editor → Revisor)
3. Ações atualizam automaticamente
4. Opção: ativar "Personalizado" para ajuste fino
5. Salvar → component_permissions atualizado
```

### Fluxo: Verificar ações efetivas

```
1. Acessos → Usuários → clicar no usuário → UsuarioDetailAccountSheet
2. Seção "Ações" mostra:
   - Ações diretas (em azul)
   - Ações via grupo (em verde, com nome do grupo)
3. Ou: PermissoesEfetivasSheet (abrir via botão no detalhe do usuário)
```

### Fluxo: Mudar persona para testar

```
1. PersonaSwitcher (canto inferior direito, ícone de usuário)
2. Selecionar persona desejada
3. Página recarrega com as permissões da nova persona
4. O estado da conta selecionada é mantido
```
